import {
  useEffect,
  useRef,
  useReducer,
  useState,
  useCallback,
} from "react";
import { GridEngine } from "./GridEngine";
import { Transport } from "./Transport";
import { PadGrid } from "./PadGrid";
import { SampleInspector } from "./SampleInspector";
import { Sequencer } from "./Sequencer";
import type {
  Pad,
  GridState,
  GridAction,
  GridMode,
} from "./types";
import {
  makePad,
  KEY_TO_PAD,
  audioBufferToWav,
  parseYouTubeVideoId,
} from "./types";
import {
  decodeAudioFile,
  isValidAudioFile,
} from "../../utils/audioUtils";

// ── Reducer ────────────────────────────────────────────────────────────────────

function makeInitialState(): GridState {
  return {
    pads: Array.from({ length: 9 }, (_, i) => makePad(i)),
    selectedPadId: 0,
    pattern: Array.from({ length: 9 }, () =>
      Array(16).fill(false),
    ),
    bpm: 120,
    isPlaying: false,
    currentStep: -1,
    mode: "live",
  };
}

function gridReducer(
  state: GridState,
  action: GridAction,
): GridState {
  switch (action.type) {
    case "LOAD_SAMPLE": {
      const pads = [...state.pads];
      pads[action.padId] = {
        ...pads[action.padId],
        source: { type: "audio" },
        buffer: action.buffer,
        reverseBuffer: null,
        fileName: action.fileName,
        reverse: false,
      };
      return { ...state, pads, selectedPadId: action.padId };
    }
    case "LOAD_YOUTUBE": {
      const pads = [...state.pads];
      pads[action.padId] = {
        ...pads[action.padId],
        source: {
          type: "youtube",
          videoId: action.videoId,
          cueTime: action.cueTime,
        },
        buffer: null,
        reverseBuffer: null,
        fileName: null,
      };
      return { ...state, pads, selectedPadId: action.padId };
    }
    case "SELECT_PAD":
      return { ...state, selectedPadId: action.padId };
    case "TOGGLE_STEP": {
      const pattern = state.pattern.map((row) => [...row]);
      pattern[action.padId][action.step] =
        !pattern[action.padId][action.step];
      return { ...state, pattern };
    }
    case "SET_BPM":
      return {
        ...state,
        bpm: Math.max(40, Math.min(240, action.bpm)),
      };
    case "PLAY":
      return { ...state, isPlaying: true, currentStep: 0 };
    case "STOP":
      return { ...state, isPlaying: false, currentStep: -1 };
    case "STEP_ADVANCE":
      return { ...state, currentStep: action.step };
    case "UPDATE_PAD_PARAM": {
      const pads = [...state.pads];
      pads[action.padId] = {
        ...pads[action.padId],
        [action.param]: action.value,
      };
      return { ...state, pads };
    }
    case "SET_REVERSE": {
      const pads = [...state.pads];
      pads[action.padId] = {
        ...pads[action.padId],
        reverse: action.reverse,
      };
      return { ...state, pads };
    }
    case "SET_LOOP": {
      const pads = [...state.pads];
      pads[action.padId] = { ...pads[action.padId], loop: action.loop };
      return { ...state, pads };
    }
    case "SET_REVERSE_BUFFER": {
      const pads = [...state.pads];
      pads[action.padId] = {
        ...pads[action.padId],
        reverseBuffer: action.buffer,
      };
      return { ...state, pads };
    }
    case "CLEAR_PAD": {
      const pads = [...state.pads];
      pads[action.padId] = makePad(action.padId);
      return { ...state, pads };
    }
    case "SET_MODE":
      return { ...state, mode: action.mode as GridMode };
    case "UPDATE_YT_CUE": {
      const pads = [...state.pads];
      const pad = pads[action.padId];
      if (pad.source.type === "youtube") {
        pads[action.padId] = {
          ...pad,
          source: { ...pad.source, cueTime: action.cueTime },
        };
      }
      return { ...state, pads };
    }
    default:
      return state;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ── Main component ─────────────────────────────────────────────────────────────

export function GridApp() {
  const [state, dispatch] = useReducer(
    gridReducer,
    undefined,
    makeInitialState,
  );
  const engineRef = useRef<GridEngine | null>(null);

  // Intercepts gain/drive changes to update engine nodes in real-time
  const dispatchAndSync = useCallback((action: GridAction) => {
    dispatch(action);
    if (action.type === "UPDATE_PAD_PARAM" && engineRef.current) {
      if (action.param === "gain") engineRef.current.setPadGain(action.padId, action.value);
      if (action.param === "drive") engineRef.current.setPadDrive(action.padId, action.value);
      if (action.param === "speed") engineRef.current.setPadSpeed(action.padId, action.value);
    }
  }, []);
  const [activePadIds, setActivePadIds] = useState<
    ReadonlySet<number>
  >(new Set());
  const flashTimers = useRef<
    Map<number, ReturnType<typeof setTimeout>>
  >(new Map());
  const fileImportRef = useRef<HTMLInputElement>(null);

  // Stable refs for scheduler callbacks
  const stateRef = useRef(state);
  stateRef.current = state;

  // ── Engine init ──────────────────────────────────────────────────────────────

  function getEngine(): GridEngine {
    if (!engineRef.current)
      engineRef.current = new GridEngine();
    return engineRef.current;
  }

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
    };
  }, []);

  // ── Trigger pad (manual) ─────────────────────────────────────────────────────

  const triggerPad = useCallback((padId: number) => {
    const pad = stateRef.current.pads[padId];
    if (!pad.buffer && pad.source.type !== "youtube") return;
    getEngine().playPad(pad);

    // Flash animation
    setActivePadIds((prev) => {
      const next = new Set(prev);
      next.add(padId);
      return next;
    });
    const existing = flashTimers.current.get(padId);
    if (existing) clearTimeout(existing);
    flashTimers.current.set(
      padId,
      setTimeout(() => {
        setActivePadIds((prev) => {
          const next = new Set(prev);
          next.delete(padId);
          return next;
        });
      }, 150),
    );
  }, []);

  // ── Keyboard ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const held = new Set<string>();
    function onKeyDown(e: KeyboardEvent) {
      // Ignore when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      const key = e.key.toLowerCase();

      if (e.code === "Space") {
        e.preventDefault();
        if (stateRef.current.isPlaying) {
          dispatch({ type: "STOP" });
        } else {
          dispatch({ type: "PLAY" });
        }
        return;
      }

      if (held.has(key)) return; // prevent key-repeat
      held.add(key);

      const padId = KEY_TO_PAD[key];
      if (padId !== undefined) {
        dispatch({ type: "SELECT_PAD", padId });
        triggerPad(padId);
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      held.delete(e.key.toLowerCase());
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [triggerPad]);

  // ── Sequencer ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const engine = getEngine();
    if (state.isPlaying) {
      engine.startScheduler(
        () => stateRef.current.pads,
        () => stateRef.current.pattern,
        () => stateRef.current.bpm,
        (step) => {
          dispatch({ type: "STEP_ADVANCE", step });
          // Flash active pads for this step
          const pattern = stateRef.current.pattern;
          const fired = new Set<number>();
          for (let p = 0; p < 9; p++) {
            if (pattern[p]?.[step]) fired.add(p);
          }
          setActivePadIds((prev) => {
            const next = new Set(prev);
            fired.forEach((id) => next.add(id));
            return next;
          });
          setTimeout(() => {
            setActivePadIds((prev) => {
              const next = new Set(prev);
              fired.forEach((id) => next.delete(id));
              return next;
            });
          }, 80);
        },
      );
    } else {
      engine.stopScheduler();
      engine.stopAll();
    }
    return () => {
      engine.stopScheduler();
    };
  }, [state.isPlaying]);

  // ── Reverse buffer ───────────────────────────────────────────────────────────

  useEffect(() => {
    for (const pad of state.pads) {
      if (pad.reverse && !pad.reverseBuffer && pad.buffer) {
        const rev = getEngine().computeReverseBuffer(
          pad.buffer,
        );
        dispatch({
          type: "SET_REVERSE_BUFFER",
          padId: pad.id,
          buffer: rev,
        });
      }
      if (!pad.reverse && pad.reverseBuffer) {
        dispatch({
          type: "SET_REVERSE_BUFFER",
          padId: pad.id,
          buffer: null,
        });
      }
    }
  }, [state.pads.map((p) => `${p.id}:${p.reverse}`).join(",")]);

  // ── File drop (page level) ───────────────────────────────────────────────────

  function handleDropFile(padId: number, file: File) {
    if (!isValidAudioFile(file)) return;
    const engine = getEngine();
    decodeAudioFile(file, engine.ctx).then((buffer) => {
      dispatch({
        type: "LOAD_SAMPLE",
        padId,
        buffer,
        fileName: file.name,
      });
    });
  }

  // Listen for file events from SampleInspector file picker
  useEffect(() => {
    function onLoadFile(e: Event) {
      const { padId, file } = (e as CustomEvent).detail;
      handleDropFile(padId, file);
    }
    window.addEventListener("grid-load-file", onLoadFile);
    return () =>
      window.removeEventListener("grid-load-file", onLoadFile);
  }, []);

  // ── YouTube load ─────────────────────────────────────────────────────────────

  function handleLoadYoutube(padId: number, videoId: string) {
    dispatch({
      type: "LOAD_YOUTUBE",
      padId,
      videoId,
      cueTime: 0,
    });
    getEngine()
      .loadYouTubePad(padId, videoId)
      .catch(console.error);
  }

  // Also destroy YT player when pad is cleared
  const prevPadsRef = useRef<Pad[]>(state.pads);
  useEffect(() => {
    state.pads.forEach((pad, i) => {
      const prev = prevPadsRef.current[i];
      if (
        prev.source.type === "youtube" &&
        pad.source.type !== "youtube"
      ) {
        engineRef.current?.destroyYouTubePad(pad.id);
      }
    });
    prevPadsRef.current = state.pads;
  }, [state.pads]);

  // ── Export WAV ────────────────────────────────────────────────────────────────

  async function exportWav() {
    const engine = getEngine();
    const buf = await engine.renderToBuffer(
      state.pads,
      state.pattern,
      state.bpm,
    );
    const blob = audioBufferToWav(buf);
    download(blob, `fourier-grid-${state.bpm}bpm.wav`);
  }

  // ── Export / Import JSON ──────────────────────────────────────────────────────

  async function exportJson() {
    const padsJson = await Promise.all(
      state.pads.map(async (pad) => {
        if (pad.source.type === "youtube") {
          return {
            id: pad.id,
            type: "youtube",
            videoId: pad.source.videoId,
            cueTime: pad.source.cueTime,
          };
        }
        if (!pad.buffer) return { id: pad.id, type: "empty" };
        const wav = audioBufferToWav(pad.buffer);
        const ab = await wav.arrayBuffer();
        const b64 = btoa(
          String.fromCharCode(...new Uint8Array(ab)),
        );
        return {
          id: pad.id,
          type: "audio",
          fileName: pad.fileName,
          audio: b64,
          trimStart: pad.trimStart,
          trimEnd: pad.trimEnd,
          speed: pad.speed,
          gain: pad.gain,
          reverse: pad.reverse,
        };
      }),
    );
    const json = JSON.stringify(
      {
        version: 1,
        bpm: state.bpm,
        pattern: state.pattern,
        pads: padsJson,
      },
      null,
      2,
    );
    download(
      new Blob([json], { type: "application/json" }),
      "fourier-grid.json",
    );
  }

  function importJson() {
    fileImportRef.current?.click();
  }

  async function handleImportJson(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.bpm)
        dispatch({ type: "SET_BPM", bpm: data.bpm });
      if (data.pattern) {
        for (let p = 0; p < 9; p++) {
          for (let s = 0; s < 16; s++) {
            const want = data.pattern[p]?.[s] ?? false;
            if (want !== (state.pattern[p]?.[s] ?? false)) {
              dispatch({
                type: "TOGGLE_STEP",
                padId: p,
                step: s,
              });
            }
          }
        }
      }
      const engine = getEngine();
      for (const padData of data.pads ?? []) {
        if (padData.type === "empty") continue;
        if (padData.type === "youtube") {
          dispatch({
            type: "LOAD_YOUTUBE",
            padId: padData.id,
            videoId: padData.videoId,
            cueTime: padData.cueTime,
          });
          engine
            .loadYouTubePad(padData.id, padData.videoId)
            .catch(console.error);
        } else if (padData.type === "audio" && padData.audio) {
          const bytes = Uint8Array.from(
            atob(padData.audio),
            (c) => c.charCodeAt(0),
          );
          const ab = bytes.buffer;
          const buffer = await engine.ctx.decodeAudioData(ab);
          dispatch({
            type: "LOAD_SAMPLE",
            padId: padData.id,
            buffer,
            fileName: padData.fileName ?? "sample.wav",
          });
          if (padData.trimStart !== undefined)
            dispatch({
              type: "UPDATE_PAD_PARAM",
              padId: padData.id,
              param: "trimStart",
              value: padData.trimStart,
            });
          if (padData.trimEnd !== undefined)
            dispatch({
              type: "UPDATE_PAD_PARAM",
              padId: padData.id,
              param: "trimEnd",
              value: padData.trimEnd,
            });
          if (padData.speed !== undefined)
            dispatch({
              type: "UPDATE_PAD_PARAM",
              padId: padData.id,
              param: "speed",
              value: padData.speed,
            });
          if (padData.gain !== undefined)
            dispatch({
              type: "UPDATE_PAD_PARAM",
              padId: padData.id,
              param: "gain",
              value: padData.gain,
            });
          if (padData.reverse)
            dispatch({
              type: "SET_REVERSE",
              padId: padData.id,
              reverse: true,
            });
        }
      }
    } catch (err) {
      console.error("Failed to import project", err);
    }
  }

  // ── Page-level drag-and-drop ─────────────────────────────────────────────────

  function handlePageDragOver(e: React.DragEvent) {
    e.preventDefault();
  }
  function handlePageDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !isValidAudioFile(file)) return;
    // Drop to selected pad or first empty pad
    const target =
      state.selectedPadId ??
      state.pads.findIndex(
        (p) => !p.buffer && p.source.type === "audio",
      );
    if (target >= 0) handleDropFile(target, file);
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const selectedPad =
    state.selectedPadId !== null
      ? state.pads[state.selectedPadId]
      : null;

  return (
    <div
      className="w-full h-full flex flex-col gap-3"
      onDragOver={handlePageDragOver}
      onDrop={handlePageDrop}
    >
      {/* Transport */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 flex-shrink-0">
        <span className="text-white/90 text-[9px] font-mono tracking-widest uppercase">
          {state.isPlaying
            ? `step ${state.currentStep + 1}/16`
            : "9 pads · 16 steps"}
        </span>
        <Transport
          state={state}
          dispatch={dispatchAndSync}
          onExportWav={exportWav}
          onExportJson={exportJson}
          onImportJson={importJson}
        />
      </div>

      {/* Main area */}
      {state.mode === "live" ? (
        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-3 overflow-y-auto md:overflow-y-visible">
          {/* Pad grid */}
          <div className="flex-1 min-w-0 min-h-0 md:h-full">
            <PadGrid
              pads={state.pads}
              selectedPadId={state.selectedPadId}
              activePadIds={activePadIds}
              dispatch={dispatchAndSync}
              onTrigger={triggerPad}
              onDropFile={handleDropFile}
            />
          </div>

          {/* Inspector */}
          <div
            className="md:w-72 shrink-0 md:h-full rounded-[12px] overflow-hidden p-3"
            style={{
              background: "rgba(0,0,0,0.25)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <SampleInspector
              pad={selectedPad}
              dispatch={dispatchAndSync}
              getAudioCtx={() => engineRef.current?.ctx ?? null}
              onRecord={(padId, buffer) => {
                dispatch({
                  type: "LOAD_SAMPLE",
                  padId,
                  buffer,
                  fileName: "recording.wav",
                });
              }}
              onLoadYoutube={handleLoadYoutube}
            />
          </div>
        </div>
      ) : (
        <div
          className="flex-1 min-h-0 rounded-[12px] overflow-hidden p-3"
          style={{
            background: "rgba(0,0,0,0.25)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <Sequencer
            pads={state.pads}
            pattern={state.pattern}
            currentStep={state.currentStep}
            isPlaying={state.isPlaying}
            selectedPadId={state.selectedPadId}
            dispatch={dispatchAndSync}
          />
        </div>
      )}

      {/* Hint */}
      <div className="flex-shrink-0 flex items-center justify-between">
        <p className="text-white/15 text-[8px] font-mono tracking-wider">
          Keys: 123 · QWE · ASD &nbsp;·&nbsp; Space: play/stop
          &nbsp;·&nbsp; Drop audio to pads
        </p>
        {state.mode === "seq" && (
          <p className="text-white/15 text-[8px] font-mono tracking-wider">
            Click pad labels to select &nbsp;·&nbsp; Switch to
            Live to play
          </p>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileImportRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportJson}
      />
    </div>
  );
}