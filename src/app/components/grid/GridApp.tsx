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
import { useGridSessionRecorder } from "./useGridSessionRecorder";
import type { GridState, GridAction, GridMode } from "./types";
import { makePad, KEY_TO_PAD, audioBufferToWav, detectPadBpm } from "./types";
import {
  decodeAudioFile,
  isValidAudioFile,
} from "../../utils/audioUtils";

// ── Reducer ────────────────────────────────────────────────────────────────────

function makeInitialState(): GridState {
  return {
    pads: Array.from({ length: 9 }, (_, i) => makePad(i)),
    selectedPadId: 0,
    pattern: Array.from({ length: 9 }, () => Array(16).fill(false)),
    bpm: 120,
    isPlaying: false,
    currentStep: -1,
    mode: "live",
  };
}

function gridReducer(state: GridState, action: GridAction): GridState {
  switch (action.type) {
    case "LOAD_SAMPLE": {
      const pads = [...state.pads];
      pads[action.padId] = {
        ...pads[action.padId],
        buffer: action.buffer,
        reverseBuffer: null,
        fileName: action.fileName,
        detectedBpm: action.detectedBpm ?? null,
        reverse: false,
        trimStart: 0,
        trimEnd: 1,
        speed: 1,
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
    default:
      return state;
  }
}

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
  const [activePadIds, setActivePadIds] = useState<ReadonlySet<number>>(
    new Set(),
  );
  const flashTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const fileImportRef = useRef<HTMLInputElement>(null);

  const dispatchAndSync = useCallback((action: GridAction) => {
    dispatch(action);
    if (action.type === "UPDATE_PAD_PARAM" && engineRef.current) {
      if (action.param === "gain")
        engineRef.current.setPadGain(action.padId, action.value);
      if (action.param === "drive")
        engineRef.current.setPadDrive(action.padId, action.value);
      if (action.param === "speed")
        engineRef.current.setPadSpeed(action.padId, action.value);
    }
    if (action.type === "SET_LOOP" && !action.loop) {
      engineRef.current?.stopPad(action.padId);
    }
    if (action.type === "CLEAR_PAD") {
      engineRef.current?.stopPad(action.padId);
    }
  }, []);

  const stateRef = useRef(state);
  stateRef.current = state;

  function getEngine(): GridEngine {
    if (!engineRef.current) engineRef.current = new GridEngine();
    return engineRef.current;
  }

  const {
    isRecording: isSessionRecording,
    startRecording: startSessionRecord,
    stopRecording: stopSessionRecord,
  } = useGridSessionRecorder(
    () => getEngine().getMasterNode(),
    () => getEngine().ctx,
  );

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
    };
  }, []);

  const triggerPad = useCallback((padId: number) => {
    const pad = stateRef.current.pads[padId];
    if (!pad.buffer) return;
    getEngine().playPad(pad);

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

  useEffect(() => {
    const held = new Set<string>();
    function onKeyDown(e: KeyboardEvent) {
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

      if (held.has(key)) return;
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

  useEffect(() => {
    const engine = getEngine();
    if (state.isPlaying) {
      engine.startScheduler(
        () => stateRef.current.pads,
        () => stateRef.current.pattern,
        () => stateRef.current.bpm,
        (step) => {
          dispatch({ type: "STEP_ADVANCE", step });
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

  useEffect(() => {
    for (const pad of state.pads) {
      if (pad.reverse && !pad.reverseBuffer && pad.buffer) {
        const rev = getEngine().computeReverseBuffer(pad.buffer);
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

  function handleDropFile(padId: number, file: File) {
    if (!isValidAudioFile(file)) return;
    const engine = getEngine();
    decodeAudioFile(file, engine.ctx).then((buffer) => {
      dispatch({
        type: "LOAD_SAMPLE",
        padId,
        buffer,
        fileName: file.name,
        detectedBpm: detectPadBpm(buffer),
      });
    });
  }

  useEffect(() => {
    function onLoadFile(e: Event) {
      const { padId, file } = (e as CustomEvent).detail;
      handleDropFile(padId, file);
    }
    window.addEventListener("grid-load-file", onLoadFile);
    return () =>
      window.removeEventListener("grid-load-file", onLoadFile);
  }, []);

  async function exportLoop(bars: 1 | 2 | 4) {
    const engine = getEngine();
    const buf = await engine.renderToBuffer(
      state.pads,
      state.pattern,
      state.bpm,
      bars,
    );
    const blob = audioBufferToWav(buf);
    download(
      blob,
      `fourier-grid-${state.bpm}bpm-${bars}bar.wav`,
    );
  }

  async function toggleSessionRecord() {
    if (isSessionRecording) {
      const blob = await stopSessionRecord();
      if (blob) {
        const ext = blob.type.includes("wav") ? "wav" : "webm";
        download(blob, `fourier-grid-session.${ext}`);
      }
    } else {
      await startSessionRecord();
    }
  }

  async function exportJson() {
    const padsJson = await Promise.all(
      state.pads.map(async (pad) => {
        if (!pad.buffer) return { id: pad.id, type: "empty" };
        const wav = audioBufferToWav(pad.buffer);
        const ab = await wav.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(ab)));
        return {
          id: pad.id,
          type: "audio",
          fileName: pad.fileName,
          audio: b64,
          trimStart: pad.trimStart,
          trimEnd: pad.trimEnd,
          speed: pad.speed,
          gain: pad.gain,
          drive: pad.drive,
          reverse: pad.reverse,
          loop: pad.loop,
        };
      }),
    );
    const json = JSON.stringify(
      {
        version: 2,
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
      if (data.bpm) dispatch({ type: "SET_BPM", bpm: data.bpm });
      if (data.pattern) {
        for (let p = 0; p < 9; p++) {
          for (let s = 0; s < 16; s++) {
            const want = data.pattern[p]?.[s] ?? false;
            if (want !== (state.pattern[p]?.[s] ?? false)) {
              dispatch({ type: "TOGGLE_STEP", padId: p, step: s });
            }
          }
        }
      }
      const engine = getEngine();
      for (const padData of data.pads ?? []) {
        // Quietly skip legacy YouTube pads
        if (padData.type === "empty" || padData.type === "youtube")
          continue;
        if (padData.type === "audio" && padData.audio) {
          const bytes = Uint8Array.from(atob(padData.audio), (c) =>
            c.charCodeAt(0),
          );
          const buffer = await engine.ctx.decodeAudioData(bytes.buffer);
          dispatch({
            type: "LOAD_SAMPLE",
            padId: padData.id,
            buffer,
            fileName: padData.fileName ?? "sample.wav",
            detectedBpm: detectPadBpm(buffer),
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
          if (padData.drive !== undefined)
            dispatch({
              type: "UPDATE_PAD_PARAM",
              padId: padData.id,
              param: "drive",
              value: padData.drive,
            });
          if (padData.reverse)
            dispatch({
              type: "SET_REVERSE",
              padId: padData.id,
              reverse: true,
            });
          if (padData.loop)
            dispatch({
              type: "SET_LOOP",
              padId: padData.id,
              loop: true,
            });
        }
      }
    } catch (err) {
      console.error("Failed to import project", err);
    }
  }

  function handlePageDragOver(e: React.DragEvent) {
    e.preventDefault();
  }
  function handlePageDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !isValidAudioFile(file)) return;
    const target =
      state.selectedPadId ??
      state.pads.findIndex((p) => !p.buffer);
    if (target >= 0) handleDropFile(target, file);
  }

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
      <div className="flex flex-wrap items-center justify-between gap-y-2 flex-shrink-0">
        <span className="text-white/90 text-[9px] font-mono tracking-widest uppercase">
          {state.isPlaying
            ? `step ${state.currentStep + 1}/16`
            : "9 pads · 16 steps"}
        </span>
        <Transport
          state={state}
          dispatch={dispatchAndSync}
          onExportLoop={(bars) => void exportLoop(bars)}
          onExportJson={() => void exportJson()}
          onImportJson={importJson}
          isSessionRecording={isSessionRecording}
          onToggleSessionRecord={() => void toggleSessionRecord()}
        />
      </div>

      {state.mode === "live" ? (
        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-3 overflow-y-auto md:overflow-y-visible">
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
              ensureAudioCtx={async () => {
                const engine = getEngine();
                await engine.ensureRunning();
                return engine.ctx;
              }}
              onRecord={(padId, buffer) => {
                dispatch({
                  type: "LOAD_SAMPLE",
                  padId,
                  buffer,
                  fileName: "mic-recording.wav",
                  detectedBpm: detectPadBpm(buffer),
                });
              }}
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

      <div className="flex-shrink-0 flex items-center justify-between">
        <p className="text-white/15 text-[8px] font-mono tracking-wider">
          Keys: 123 · QWE · ASD &nbsp;·&nbsp; Space: play/stop
          &nbsp;·&nbsp; Drop audio to pads
        </p>
        {state.mode === "seq" && (
          <p className="text-white/15 text-[8px] font-mono tracking-wider">
            Click pad labels to select &nbsp;·&nbsp; Switch to Live
            to play
          </p>
        )}
      </div>

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
