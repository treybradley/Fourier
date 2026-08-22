import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  separateStems,
  audioBufferToWav,
  STEM_NAMES,
  type StemName,
} from "../hooks/useStemSeparator";
import { decodeAudioFile, isFileSizeValid, isValidAudioFile } from "../utils/audioUtils";

export type { StemName };

export type SeparationStage = "idle" | "uploading" | "downloading" | "separating" | "done" | "error";

interface StemProgress { done: number; total: number }

interface StemSeparatorState {
  sourceFile: File | null;
  sourceBuffer: AudioBuffer | null;
  stage: SeparationStage;
  /** Stems the user wants to separate (upload screen). */
  selectedStems: Record<StemName, boolean>;
  /** Stems included in the current/last separation run. */
  runStems: StemName[];
  modelProgress: Record<StemName, number>;
  modelCached: Record<StemName, boolean>;
  stemProgress: Record<StemName, StemProgress>;
  activeStem: StemName | null;
  results: Record<StemName, AudioBuffer | null>;
  isPlaying: boolean;
  stemVolumes: Record<StemName, number>;
  mutedStems: Record<StemName, boolean>;
  originalVolume: number;
  originalMuted: boolean;
  error: string | null;
}

export interface StemSeparatorContextValue extends StemSeparatorState {
  loadFile: (file: File) => Promise<void>;
  toggleStemSelection: (stem: StemName) => void;
  startSeparation: () => Promise<void>;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setStemVolume: (stem: StemName, volume: number) => void;
  toggleMute: (stem: StemName) => void;
  setOriginalVolume: (volume: number) => void;
  toggleOriginalMute: () => void;
  downloadStem: (stem: StemName) => void;
  downloadOriginal: () => void;
  reset: () => void;
  getPlayheadTime: () => number;
}

function makeRecord<T>(val: T): Record<StemName, T> {
  return Object.fromEntries(STEM_NAMES.map(s => [s, val])) as Record<StemName, T>;
}

const INITIAL_STATE: StemSeparatorState = {
  sourceFile: null,
  sourceBuffer: null,
  stage: "idle",
  selectedStems: makeRecord(true),
  runStems: [...STEM_NAMES],
  modelProgress: makeRecord(0),
  modelCached: makeRecord(false),
  stemProgress: makeRecord({ done: 0, total: 0 }),
  activeStem: null,
  results: makeRecord(null),
  isPlaying: false,
  stemVolumes: makeRecord(1),
  mutedStems: makeRecord(false),
  originalVolume: 1,
  originalMuted: true,
  error: null,
};

const StemSeparatorContext = createContext<StemSeparatorContextValue | null>(null);

export function StemSeparatorProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StemSeparatorState>(INITIAL_STATE);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceBufferRef = useRef<AudioBuffer | null>(null);
  const resultsRef = useRef<Record<StemName, AudioBuffer | null>>(makeRecord(null));
  const sourceNodesRef = useRef<Record<StemName, AudioBufferSourceNode | null>>(makeRecord(null));
  const gainNodesRef = useRef<Record<StemName, GainNode | null>>(makeRecord(null));
  const originalSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const originalGainRef = useRef<GainNode | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isPlayingRef = useRef(false);
  const playheadOffsetRef = useRef(0);
  const playStartCtxTimeRef = useRef(0);
  const stemVolumesRef = useRef<Record<StemName, number>>(makeRecord(1));
  const mutedStemsRef = useRef<Record<StemName, boolean>>(makeRecord(false));
  const originalVolumeRef = useRef(1);
  const originalMutedRef = useRef(true);
  const selectedStemsRef = useRef<Record<StemName, boolean>>(makeRecord(true));

  function getAudioCtx(): AudioContext {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }

  function ensureGainNodes(ctx: AudioContext) {
    STEM_NAMES.forEach(stem => {
      if (!gainNodesRef.current[stem]) {
        const gain = ctx.createGain();
        const vol = stemVolumesRef.current[stem];
        const muted = mutedStemsRef.current[stem];
        gain.gain.value = muted ? 0 : vol;
        gain.connect(ctx.destination);
        gainNodesRef.current[stem] = gain;
      }
    });
    if (!originalGainRef.current) {
      const gain = ctx.createGain();
      gain.gain.value = originalMutedRef.current ? 0 : originalVolumeRef.current;
      gain.connect(ctx.destination);
      originalGainRef.current = gain;
    }
  }

  function stopAllSources() {
    STEM_NAMES.forEach(stem => {
      try { sourceNodesRef.current[stem]?.stop(); } catch { /* already stopped */ }
      sourceNodesRef.current[stem] = null;
    });
    try { originalSourceRef.current?.stop(); } catch { /* already stopped */ }
    originalSourceRef.current = null;
  }

  function getDuration(): number {
    const sourceDur = sourceBufferRef.current?.duration ?? 0;
    const stemDur =
      STEM_NAMES.map(s => resultsRef.current[s]?.duration ?? 0).find(d => d > 0) ?? 0;
    return Math.max(sourceDur, stemDur);
  }

  const getPlayheadTime = useCallback((): number => {
    if (!isPlayingRef.current || !audioCtxRef.current) return playheadOffsetRef.current;
    const elapsed = audioCtxRef.current.currentTime - playStartCtxTimeRef.current;
    return Math.min(playheadOffsetRef.current + elapsed, getDuration());
  }, []);

  const play = useCallback(() => {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") ctx.resume();
    ensureGainNodes(ctx);
    stopAllSources();

    playStartCtxTimeRef.current = ctx.currentTime;
    isPlayingRef.current = true;

    let anyStarted = false;
    const onEnded = (node: AudioBufferSourceNode, clear: () => void) => {
      node.onended = () => {
        if (isPlayingRef.current) {
          clear();
          const stillGoing =
            STEM_NAMES.some(s => sourceNodesRef.current[s] != null) ||
            originalSourceRef.current != null;
          if (!stillGoing) {
            isPlayingRef.current = false;
            playheadOffsetRef.current = 0;
            setState(p => ({ ...p, isPlaying: false }));
          }
        }
      };
    };

    STEM_NAMES.forEach(stem => {
      const buf = resultsRef.current[stem];
      if (!buf) return;
      const source = ctx.createBufferSource();
      source.buffer = buf;
      source.connect(gainNodesRef.current[stem]!);
      source.start(0, playheadOffsetRef.current);
      sourceNodesRef.current[stem] = source;
      anyStarted = true;
      onEnded(source, () => {
        if (sourceNodesRef.current[stem] === source) sourceNodesRef.current[stem] = null;
      });
    });

    const original = sourceBufferRef.current;
    if (original) {
      const source = ctx.createBufferSource();
      source.buffer = original;
      source.connect(originalGainRef.current!);
      source.start(0, playheadOffsetRef.current);
      originalSourceRef.current = source;
      anyStarted = true;
      onEnded(source, () => {
        if (originalSourceRef.current === source) originalSourceRef.current = null;
      });
    }

    if (anyStarted) setState(p => ({ ...p, isPlaying: true }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pause = useCallback(() => {
    playheadOffsetRef.current = getPlayheadTime();
    isPlayingRef.current = false;
    stopAllSources();
    setState(p => ({ ...p, isPlaying: false }));
  }, [getPlayheadTime]);

  const seek = useCallback((time: number) => {
    const wasPlaying = isPlayingRef.current;
    playheadOffsetRef.current = time;
    isPlayingRef.current = false;
    stopAllSources();
    if (wasPlaying) {
      setTimeout(() => play(), 0);
    }
  }, [play]);

  const setStemVolume = useCallback((stem: StemName, volume: number) => {
    stemVolumesRef.current = { ...stemVolumesRef.current, [stem]: volume };
    const muted = mutedStemsRef.current[stem];
    if (gainNodesRef.current[stem]) {
      gainNodesRef.current[stem]!.gain.value = muted ? 0 : volume;
    }
    setState(p => ({ ...p, stemVolumes: { ...p.stemVolumes, [stem]: volume } }));
  }, []);

  const toggleMute = useCallback((stem: StemName) => {
    const muted = !mutedStemsRef.current[stem];
    mutedStemsRef.current = { ...mutedStemsRef.current, [stem]: muted };
    if (gainNodesRef.current[stem]) {
      gainNodesRef.current[stem]!.gain.value = muted ? 0 : stemVolumesRef.current[stem];
    }
    setState(p => ({ ...p, mutedStems: { ...p.mutedStems, [stem]: muted } }));
  }, []);

  const setOriginalVolume = useCallback((volume: number) => {
    originalVolumeRef.current = volume;
    if (originalGainRef.current) {
      originalGainRef.current.gain.value = originalMutedRef.current ? 0 : volume;
    }
    setState(p => ({ ...p, originalVolume: volume }));
  }, []);

  const toggleOriginalMute = useCallback(() => {
    const muted = !originalMutedRef.current;
    originalMutedRef.current = muted;
    if (originalGainRef.current) {
      originalGainRef.current.gain.value = muted ? 0 : originalVolumeRef.current;
    }
    setState(p => ({ ...p, originalMuted: muted }));
  }, []);

  const toggleStemSelection = useCallback((stem: StemName) => {
    setState(p => {
      const next = { ...p.selectedStems, [stem]: !p.selectedStems[stem] };
      // Keep at least one stem selected
      if (!STEM_NAMES.some(s => next[s])) return p;
      selectedStemsRef.current = next;
      return { ...p, selectedStems: next };
    });
  }, []);

  const loadFile = useCallback(async (file: File) => {
    if (!isValidAudioFile(file)) {
      setState(p => ({ ...p, error: "Unsupported format. Use MP3 or WAV.", stage: "error" }));
      return;
    }
    if (!isFileSizeValid(file)) {
      setState(p => ({ ...p, error: "File too large. Max 50 MB.", stage: "error" }));
      return;
    }
    setState(p => ({ ...p, stage: "uploading", error: null, sourceFile: file }));
    try {
      const ctx = getAudioCtx();
      const buffer = await decodeAudioFile(file, ctx);
      sourceBufferRef.current = buffer;
      setState(p => ({ ...p, sourceBuffer: buffer, stage: "idle" }));
    } catch {
      setState(p => ({ ...p, error: "Could not decode audio.", stage: "error" }));
    }
  }, []);

  const startSeparation = useCallback(async () => {
    const sourceBuffer = sourceBufferRef.current;
    if (!sourceBuffer) return;

    const stems = STEM_NAMES.filter(s => selectedStemsRef.current[s]);
    if (stems.length === 0) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    isPlayingRef.current = false;
    playheadOffsetRef.current = 0;
    stopAllSources();
    gainNodesRef.current = makeRecord(null);
    originalGainRef.current = null;

    setState(p => ({
      ...p,
      stage: "downloading",
      runStems: stems,
      modelProgress: makeRecord(0),
      modelCached: makeRecord(false),
      stemProgress: makeRecord({ done: 0, total: 0 }),
      activeStem: null,
      results: makeRecord(null),
      isPlaying: false,
      originalMuted: true,
      error: null,
    }));
    originalMutedRef.current = true;
    resultsRef.current = makeRecord(null);

    try {
      const ctx = getAudioCtx();
      const partial = await separateStems(
        sourceBuffer,
        ctx,
        {
          onModelDownload: (stem, progress, cached) => {
            setState(p => ({
              ...p,
              modelProgress: { ...p.modelProgress, [stem]: progress },
              modelCached: { ...p.modelCached, [stem]: cached },
            }));
          },
          onStemInference: (stem, done, total) => {
            setState(p => ({
              ...p,
              stage: "separating",
              activeStem: stem,
              stemProgress: { ...p.stemProgress, [stem]: { done, total } },
            }));
          },
        },
        abortRef.current.signal,
        stems,
      );
      const results = makeRecord(null);
      for (const stem of STEM_NAMES) {
        results[stem] = partial[stem] ?? null;
      }
      resultsRef.current = results;
      setState(p => ({ ...p, stage: "done", results, activeStem: null }));
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setState(p => ({ ...p, stage: "idle" }));
      } else {
        setState(p => ({
          ...p,
          stage: "error",
          error: e instanceof Error ? e.message : "Separation failed.",
        }));
      }
    }
  }, []);

  const downloadStem = useCallback((stem: StemName) => {
    const buf = resultsRef.current[stem];
    if (!buf) return;
    const blob = audioBufferToWav(buf);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${stem}.wav`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const downloadOriginal = useCallback(() => {
    const buf = sourceBufferRef.current;
    if (!buf) return;
    const blob = audioBufferToWav(buf);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "full-track.wav";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    isPlayingRef.current = false;
    playheadOffsetRef.current = 0;
    stopAllSources();
    gainNodesRef.current = makeRecord(null);
    originalGainRef.current = null;
    sourceBufferRef.current = null;
    resultsRef.current = makeRecord(null);
    stemVolumesRef.current = makeRecord(1);
    mutedStemsRef.current = makeRecord(false);
    originalVolumeRef.current = 1;
    originalMutedRef.current = true;
    selectedStemsRef.current = makeRecord(true);
    setState(INITIAL_STATE);
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      isPlayingRef.current = false;
      STEM_NAMES.forEach((stem) => {
        try {
          sourceNodesRef.current[stem]?.stop();
        } catch {
          /* already stopped */
        }
        sourceNodesRef.current[stem] = null;
      });
      try {
        originalSourceRef.current?.stop();
      } catch {
        /* already stopped */
      }
      originalSourceRef.current = null;
      try {
        audioCtxRef.current?.close();
      } catch {
        /* already closed */
      }
      audioCtxRef.current = null;
    };
  }, []);

  return (
    <StemSeparatorContext.Provider
      value={{
        ...state,
        loadFile,
        toggleStemSelection,
        startSeparation,
        play, pause, seek,
        setStemVolume, toggleMute,
        setOriginalVolume, toggleOriginalMute,
        downloadStem, downloadOriginal,
        reset,
        getPlayheadTime,
      }}
    >
      {children}
    </StemSeparatorContext.Provider>
  );
}

export function useStemSeparatorContext(): StemSeparatorContextValue {
  const ctx = useContext(StemSeparatorContext);
  if (!ctx) throw new Error("useStemSeparatorContext must be inside StemSeparatorProvider");
  return ctx;
}
