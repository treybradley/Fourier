import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { decodeAudioFile } from "../utils/audioUtils";
import { extractAudioFromVideoFile } from "../utils/harmonizer/extractAudioFromVideoFile";
import { fitBufferToLength } from "../utils/harmonizer/fitBufferToLength";
import {
  PitchShiftCache,
  makePitchCacheKey,
} from "../utils/harmonizer/pitchShiftCache";
import { pitchShiftBuffer } from "../utils/harmonizer/pitchShiftBuffer";
import {
  SEMITONE_MAX,
  SEMITONE_MIN,
  canEnableVoice,
  toggleVoiceSemitone,
} from "../utils/harmonizer/voiceCap";

export type TrackSource = "empty" | "mic" | "audio-file" | "video-file";

export interface HarmonyVoice {
  semitones: number;
  buffer: AudioBuffer;
}

export interface HarmonizerTrack {
  id: 0 | 1 | 2;
  rootBuffer: AudioBuffer | null;
  source: TrackSource;
  videoUrl?: string;
  voices: HarmonyVoice[];
  volume: number;
  harmonyMix: number;
  isMuted: boolean;
}

export interface HarmonizerContextValue {
  tracks: HarmonizerTrack[];
  selectedTrack: number;
  masterLength: number | null;
  isPlaying: boolean;
  error: string | null;
  recordingTrack: number | null;
  shiftingSemitone: { trackId: number; semitones: number } | null;

  setSelectedTrack: (index: number) => void;
  setTrackVolume: (trackId: number, volume: number) => void;
  setHarmonyMix: (trackId: number, mix: number) => void;
  toggleMute: (trackId: number) => void;
  clearTrack: (trackId: number) => void;
  clearError: () => void;

  startMicRecord: (trackId: number) => Promise<void>;
  stopMicRecord: () => Promise<void>;
  loadAudioFile: (trackId: number, file: File) => Promise<void>;
  loadVideoFile: (file: File) => Promise<void>;

  toggleVoice: (trackId: number, semitones: number) => Promise<void>;
  play: () => void;
  stop: () => void;

  getAudioContext: () => AudioContext | null;
  getMasterNode: () => GainNode | null;
  getLoopPhase: () => number;
}

const TRACK_COUNT = 3;

const RECORDER_WORKLET = `
class HarmonizerRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._active = false;
    this.port.onmessage = (e) => { this._active = e.data.active; };
  }
  process(inputs, outputs) {
    const input = inputs[0]?.[0];
    if (input && outputs[0]?.[0]) outputs[0][0].set(input);
    if (this._active && input) {
      this.port.postMessage({ chunk: input.slice() });
    }
    return true;
  }
}
registerProcessor('harmonizer-recorder', HarmonizerRecorderProcessor);
`;

function makeEmptyTrack(id: 0 | 1 | 2): HarmonizerTrack {
  return {
    id,
    rootBuffer: null,
    source: "empty",
    voices: [],
    volume: 0.85,
    harmonyMix: 0.65,
    isMuted: false,
  };
}

function chunksToBuffer(
  ctx: AudioContext,
  chunks: Float32Array[],
): AudioBuffer {
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const buf = ctx.createBuffer(1, Math.max(1, total), ctx.sampleRate);
  const data = buf.getChannelData(0);
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.length;
  }
  return buf;
}

function rootToken(buffer: AudioBuffer): string {
  return `${buffer.length}:${buffer.sampleRate}:${buffer.duration.toFixed(5)}`;
}

function toMono(ctx: AudioContext, source: AudioBuffer): AudioBuffer {
  if (source.numberOfChannels === 1) return source;
  const out = ctx.createBuffer(1, source.length, source.sampleRate);
  const dst = out.getChannelData(0);
  const n = source.numberOfChannels;
  for (let i = 0; i < source.length; i++) {
    let sum = 0;
    for (let c = 0; c < n; c++) sum += source.getChannelData(c)[i];
    dst[i] = sum / n;
  }
  return out;
}

const HarmonizerContext = createContext<HarmonizerContextValue | null>(null);

export function useHarmonizer() {
  const ctx = useContext(HarmonizerContext);
  if (!ctx) throw new Error("useHarmonizer must be used within HarmonizerProvider");
  return ctx;
}

interface TrackGraph {
  trackGain: GainNode;
  harmonyGain: GainNode;
  sources: AudioBufferSourceNode[];
}

export function HarmonizerProvider({ children }: { children: React.ReactNode }) {
  const [tracks, setTracks] = useState<HarmonizerTrack[]>(() =>
    Array.from({ length: TRACK_COUNT }, (_, i) =>
      makeEmptyTrack(i as 0 | 1 | 2),
    ),
  );
  const [selectedTrack, setSelectedTrack] = useState(0);
  const [masterLength, setMasterLength] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingTrack, setRecordingTrack] = useState<number | null>(null);
  const [shiftingSemitone, setShiftingSemitone] = useState<{
    trackId: number;
    semitones: number;
  } | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const masterLengthRef = useRef(masterLength);
  masterLengthRef.current = masterLength;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const masterStartRef = useRef(0);
  const graphsRef = useRef<(TrackGraph | null)[]>([null, null, null]);
  const pitchCacheRef = useRef(new PitchShiftCache());
  const masterSamplesRef = useRef<number | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const workletReadyRef = useRef(false);
  const recordingChunksRef = useRef<Float32Array[]>([]);
  const recordingTrackRef = useRef<number | null>(null);

  const getCtx = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      audioContextRef.current = new AudioContext({ latencyHint: "interactive" });
      workletReadyRef.current = false;
      masterGainRef.current = null;
    }
    if (!masterGainRef.current) {
      const master = audioContextRef.current.createGain();
      master.gain.value = 1;
      master.connect(audioContextRef.current.destination);
      masterGainRef.current = master;
    }
    return audioContextRef.current;
  }, []);

  const getAudioContext = useCallback(() => audioContextRef.current, []);
  const getMasterNode = useCallback(() => masterGainRef.current, []);

  const getLoopPhase = useCallback(() => {
    const ml = masterLengthRef.current;
    const start = masterStartRef.current;
    const ctx = audioContextRef.current;
    if (!ml || ml <= 0 || start === 0 || !ctx) return 0;
    const elapsed = ctx.currentTime - start;
    const phase = ((elapsed % ml) + ml) % ml;
    return phase / ml;
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const stopGraph = useCallback(() => {
    for (let i = 0; i < TRACK_COUNT; i++) {
      const g = graphsRef.current[i];
      if (!g) continue;
      for (const s of g.sources) {
        try {
          s.stop();
        } catch {
          /* ignore */
        }
        try {
          s.disconnect();
        } catch {
          /* ignore */
        }
      }
      try {
        g.harmonyGain.disconnect();
      } catch {
        /* ignore */
      }
      try {
        g.trackGain.disconnect();
      } catch {
        /* ignore */
      }
      graphsRef.current[i] = null;
    }
    masterStartRef.current = 0;
  }, []);

  const buildGraph = useCallback(() => {
    const ctx = getCtx();
    const master = masterGainRef.current;
    if (!master) return;
    stopGraph();

    const when = ctx.currentTime + 0.02;
    masterStartRef.current = when;

    tracksRef.current.forEach((track, trackId) => {
      if (!track.rootBuffer) return;

      const trackGain = ctx.createGain();
      trackGain.gain.value = track.isMuted ? 0 : track.volume;
      trackGain.connect(master);

      const harmonyGain = ctx.createGain();
      harmonyGain.gain.value = track.isMuted ? 0 : track.harmonyMix;
      harmonyGain.connect(master);

      const sources: AudioBufferSourceNode[] = [];

      const rootSrc = ctx.createBufferSource();
      rootSrc.buffer = track.rootBuffer;
      rootSrc.loop = true;
      rootSrc.connect(trackGain);
      rootSrc.start(when);
      sources.push(rootSrc);

      for (const voice of track.voices) {
        const vs = ctx.createBufferSource();
        vs.buffer = voice.buffer;
        vs.loop = true;
        vs.connect(harmonyGain);
        vs.start(when);
        sources.push(vs);
      }

      graphsRef.current[trackId] = { trackGain, harmonyGain, sources };
    });
  }, [getCtx, stopGraph]);

  const play = useCallback(() => {
    const ctx = getCtx();
    if (ctx.state === "suspended") void ctx.resume();
    if (!tracksRef.current.some((t) => t.rootBuffer)) return;
    buildGraph();
    setIsPlaying(true);
  }, [buildGraph, getCtx]);

  const stop = useCallback(() => {
    stopGraph();
    setIsPlaying(false);
  }, [stopGraph]);

  const rebuildIfPlaying = useCallback(() => {
    if (isPlayingRef.current) buildGraph();
  }, [buildGraph]);

  const applyGains = useCallback(() => {
    tracksRef.current.forEach((track, i) => {
      const g = graphsRef.current[i];
      if (!g) return;
      g.trackGain.gain.value = track.isMuted ? 0 : track.volume;
      g.harmonyGain.gain.value = track.isMuted ? 0 : track.harmonyMix;
    });
  }, []);

  const setRootOnTrack = useCallback(
    (
      trackId: number,
      buffer: AudioBuffer,
      source: TrackSource,
      videoUrl?: string,
    ) => {
      const ctx = getCtx();
      const mono = toMono(ctx, buffer);

      setTracks((prev) => {
        const next = prev.map((t) => ({ ...t, voices: [...t.voices] }));

        if (trackId === 0) {
          if (prev[0].videoUrl) URL.revokeObjectURL(prev[0].videoUrl);
          pitchCacheRef.current.clearAll();
          masterSamplesRef.current = mono.length;
          const masterDur = mono.duration;
          setMasterLength(masterDur);

          next[0] = {
            ...makeEmptyTrack(0),
            rootBuffer: mono,
            source,
            videoUrl,
            volume: prev[0].volume,
            harmonyMix: prev[0].harmonyMix,
          };

          for (let i = 1; i < TRACK_COUNT; i++) {
            const t = prev[i];
            if (!t.rootBuffer) {
              next[i] = { ...makeEmptyTrack(i as 0 | 1 | 2), volume: t.volume, harmonyMix: t.harmonyMix };
              continue;
            }
            const fitted = fitBufferToLength(ctx, t.rootBuffer, mono.length);
            next[i] = {
              ...t,
              rootBuffer: fitted,
              voices: [],
              videoUrl: undefined,
            };
          }
        } else {
          const masterSamples = masterSamplesRef.current;
          if (!masterSamples) {
            setError("Load Track 1 first to set the master timeline");
            return prev;
          }
          pitchCacheRef.current.clearTrack(trackId);
          const fitted = fitBufferToLength(ctx, mono, masterSamples);
          next[trackId] = {
            ...makeEmptyTrack(trackId as 0 | 1 | 2),
            rootBuffer: fitted,
            source,
            volume: prev[trackId].volume,
            harmonyMix: prev[trackId].harmonyMix,
          };
        }

        return next;
      });

      queueMicrotask(() => {
        if (isPlayingRef.current) buildGraph();
      });
    },
    [buildGraph, getCtx],
  );

  const loadAudioFile = useCallback(
    async (trackId: number, file: File) => {
      try {
        const ctx = getCtx();
        if (ctx.state === "suspended") await ctx.resume();
        const decoded = await decodeAudioFile(file, ctx);
        setRootOnTrack(trackId, decoded, "audio-file");
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load audio");
      }
    },
    [getCtx, setRootOnTrack],
  );

  const loadVideoFile = useCallback(
    async (file: File) => {
      try {
        const ctx = getCtx();
        if (ctx.state === "suspended") await ctx.resume();
        const audio = await extractAudioFromVideoFile(file, ctx);
        const url = URL.createObjectURL(file);
        setRootOnTrack(0, audio, "video-file", url);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load video");
      }
    },
    [getCtx, setRootOnTrack],
  );

  const startMicRecord = useCallback(
    async (trackId: number) => {
      if (trackId !== 0 && !masterSamplesRef.current) {
        setError("Load Track 1 first to set the master timeline");
        return;
      }
      try {
        const ctx = getCtx();
        if (ctx.state === "suspended") await ctx.resume();

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            },
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        streamRef.current = stream;

        if (!workletReadyRef.current) {
          const blob = new Blob([RECORDER_WORKLET], {
            type: "application/javascript",
          });
          const url = URL.createObjectURL(blob);
          await ctx.audioWorklet.addModule(url);
          URL.revokeObjectURL(url);
          workletReadyRef.current = true;
        }

        const sourceNode = ctx.createMediaStreamSource(stream);
        sourceNodeRef.current = sourceNode;
        const workletNode = new AudioWorkletNode(ctx, "harmonizer-recorder");
        workletNodeRef.current = workletNode;
        recordingChunksRef.current = [];
        recordingTrackRef.current = trackId;

        workletNode.port.onmessage = (
          e: MessageEvent<{ chunk: Float32Array }>,
        ) => {
          if (recordingTrackRef.current !== null) {
            recordingChunksRef.current.push(e.data.chunk);
          }
        };

        const silent = ctx.createGain();
        silent.gain.value = 0;
        sourceNode.connect(workletNode);
        workletNode.connect(silent);
        silent.connect(ctx.destination);
        workletNode.port.postMessage({ active: true });

        setRecordingTrack(trackId);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Microphone unavailable");
      }
    },
    [getCtx],
  );

  const stopMicRecord = useCallback(async () => {
    const trackId = recordingTrackRef.current;
    workletNodeRef.current?.port.postMessage({ active: false });
    workletNodeRef.current?.disconnect();
    sourceNodeRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    workletNodeRef.current = null;
    sourceNodeRef.current = null;
    streamRef.current = null;
    recordingTrackRef.current = null;
    setRecordingTrack(null);

    if (trackId === null) return;
    const chunks = recordingChunksRef.current;
    recordingChunksRef.current = [];
    if (chunks.length === 0) {
      setError("No audio captured");
      return;
    }
    const ctx = getCtx();
    const buffer = chunksToBuffer(ctx, chunks);
    setRootOnTrack(trackId, buffer, "mic");
  }, [getCtx, setRootOnTrack]);

  const toggleVoice = useCallback(
    async (trackId: number, semitones: number) => {
      if (
        semitones === 0 ||
        semitones < SEMITONE_MIN ||
        semitones > SEMITONE_MAX
      ) {
        return;
      }

      const track = tracksRef.current[trackId];
      if (!track?.rootBuffer) return;

      const active = track.voices.map((v) => v.semitones);
      if (active.includes(semitones)) {
        setTracks((prev) => {
          const next = [...prev];
          next[trackId] = {
            ...next[trackId],
            voices: next[trackId].voices.filter((v) => v.semitones !== semitones),
          };
          return next;
        });
        queueMicrotask(rebuildIfPlaying);
        return;
      }

      if (!canEnableVoice(active, semitones)) {
        setError("Mute a voice first (max 4)");
        return;
      }

      const nextActive = toggleVoiceSemitone(active, semitones);
      if (!nextActive.includes(semitones)) return;

      const token = rootToken(track.rootBuffer);
      const key = makePitchCacheKey(trackId, token, semitones);
      let buffer = pitchCacheRef.current.get(key);

      setShiftingSemitone({ trackId, semitones });
      try {
        if (!buffer) {
          buffer = await pitchShiftBuffer(track.rootBuffer, semitones);
          pitchCacheRef.current.set(key, buffer);
        }
        setTracks((prev) => {
          const cur = prev[trackId];
          if (!cur?.rootBuffer) return prev;
          if (cur.voices.some((v) => v.semitones === semitones)) return prev;
          if (cur.voices.length >= 4) return prev;
          const next = [...prev];
          next[trackId] = {
            ...cur,
            voices: [...cur.voices, { semitones, buffer: buffer! }].sort(
              (a, b) => a.semitones - b.semitones,
            ),
          };
          return next;
        });
        setError(null);
        queueMicrotask(rebuildIfPlaying);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Pitch shift failed",
        );
      } finally {
        setShiftingSemitone(null);
      }
    },
    [rebuildIfPlaying],
  );

  const setTrackVolume = useCallback(
    (trackId: number, volume: number) => {
      setTracks((prev) => {
        const next = [...prev];
        next[trackId] = { ...next[trackId], volume };
        return next;
      });
      queueMicrotask(applyGains);
    },
    [applyGains],
  );

  const setHarmonyMix = useCallback(
    (trackId: number, mix: number) => {
      setTracks((prev) => {
        const next = [...prev];
        next[trackId] = { ...next[trackId], harmonyMix: mix };
        return next;
      });
      queueMicrotask(applyGains);
    },
    [applyGains],
  );

  const toggleMute = useCallback(
    (trackId: number) => {
      setTracks((prev) => {
        const next = [...prev];
        next[trackId] = {
          ...next[trackId],
          isMuted: !next[trackId].isMuted,
        };
        return next;
      });
      queueMicrotask(applyGains);
    },
    [applyGains],
  );

  const clearTrack = useCallback(
    (trackId: number) => {
      setTracks((prev) => {
        const next = [...prev];
        if (trackId === 0 && prev[0].videoUrl) {
          URL.revokeObjectURL(prev[0].videoUrl);
        }
        pitchCacheRef.current.clearTrack(trackId);
        next[trackId] = makeEmptyTrack(trackId as 0 | 1 | 2);

        if (trackId === 0) {
          pitchCacheRef.current.clearAll();
          masterSamplesRef.current = null;
          setMasterLength(null);
          for (let i = 1; i < TRACK_COUNT; i++) {
            next[i] = makeEmptyTrack(i as 0 | 1 | 2);
          }
          stop();
        } else {
          queueMicrotask(rebuildIfPlaying);
        }
        return next;
      });
    },
    [rebuildIfPlaying, stop],
  );

  useEffect(() => {
    return () => {
      stopGraph();
      const url = tracksRef.current[0]?.videoUrl;
      if (url) URL.revokeObjectURL(url);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      void audioContextRef.current?.close();
    };
  }, [stopGraph]);

  const value: HarmonizerContextValue = {
    tracks,
    selectedTrack,
    masterLength,
    isPlaying,
    error,
    recordingTrack,
    shiftingSemitone,
    setSelectedTrack,
    setTrackVolume,
    setHarmonyMix,
    toggleMute,
    clearTrack,
    clearError,
    startMicRecord,
    stopMicRecord,
    loadAudioFile,
    loadVideoFile,
    toggleVoice,
    play,
    stop,
    getAudioContext,
    getMasterNode,
    getLoopPhase,
  };

  return (
    <HarmonizerContext.Provider value={value}>
      {children}
    </HarmonizerContext.Provider>
  );
}
