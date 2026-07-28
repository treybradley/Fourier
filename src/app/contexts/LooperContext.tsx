import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";

export type TrackStatus = "empty" | "recording" | "playing" | "overdubbing" | "stopped";

export interface LoopTrack {
  id: number;
  status: TrackStatus;
  audioBuffer: AudioBuffer | null;
  volume: number;
  isMuted: boolean;
  duration: number; // seconds
}

interface LooperContextValue {
  tracks: LoopTrack[];
  selectedTrack: number;
  masterLength: number | null;
  masterBpm: number | null;
  isListening: boolean;
  error: string | null;

  startListening: () => Promise<void>;
  stopListening: () => void;
  recordStop: (trackIndex?: number) => void;
  stopTrack: (trackIndex: number) => void;
  playTrack: (trackIndex: number) => void;
  clearTrack: (trackIndex: number) => void;
  setTrackVolume: (trackIndex: number, volume: number) => void;
  toggleMute: (trackIndex: number) => void;
  setSelectedTrack: (index: number) => void;
  clearAll: () => void;
}

const LooperContext = createContext<LooperContextValue | null>(null);

export function useLooper() {
  const ctx = useContext(LooperContext);
  if (!ctx) throw new Error("useLooper must be used within LooperProvider");
  return ctx;
}

const WORKLET_CODE = `
class LooperRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._active = false;
    this.port.onmessage = (e) => { this._active = e.data.active; };
  }
  process(inputs, outputs) {
    const input = inputs[0]?.[0];
    // Always pass audio through to outputs — Chrome prunes nodes whose output
    // is zero from the render graph, which would stop process() from being called.
    if (input && outputs[0]?.[0]) {
      outputs[0][0].set(input);
    }
    if (this._active && input) {
      this.port.postMessage({ chunk: input.slice() });
    }
    return true;
  }
}
registerProcessor('looper-recorder', LooperRecorderProcessor);
`;

const TRACK_COUNT = 5;
// Lookahead in seconds for gapless loop scheduling
const SCHEDULE_AHEAD = 0.15;
const SCHEDULE_INTERVAL_MS = 40;

function makeEmptyTrack(id: number): LoopTrack {
  return { id, status: "empty", audioBuffer: null, volume: 0.8, isMuted: false, duration: 0 };
}

function mixBuffers(ctx: AudioContext, a: AudioBuffer, b: Float32Array[]): AudioBuffer {
  const length = a.length;
  const out = ctx.createBuffer(1, length, ctx.sampleRate);
  const outData = out.getChannelData(0);
  const aData = a.getChannelData(0);
  for (let i = 0; i < length; i++) outData[i] = aData[i];
  let offset = 0;
  for (const chunk of b) {
    for (let i = 0; i < chunk.length && offset + i < length; i++) {
      outData[offset + i] = Math.max(-1, Math.min(1, outData[offset + i] + chunk[i]));
    }
    offset += chunk.length;
  }
  return out;
}

function chunksToBuffer(ctx: AudioContext, chunks: Float32Array[], targetSamples?: number): AudioBuffer {
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const length = targetSamples ?? total;
  const buf = ctx.createBuffer(1, Math.max(1, length), ctx.sampleRate);
  const data = buf.getChannelData(0);
  let offset = 0;
  for (const chunk of chunks) {
    const toCopy = Math.min(chunk.length, length - offset);
    if (toCopy <= 0) break;
    data.set(chunk.subarray(0, toCopy), offset);
    offset += toCopy;
  }
  return buf;
}

// Playback slot: uses a scheduling interval for gapless looping
interface PlaybackSlot {
  gain: GainNode;
  buffer: AudioBuffer;
  // sample-exact loop length (avoids float imprecision)
  loopSamples: number;
  nextStartTime: number;
  intervalId: ReturnType<typeof setInterval>;
}

export function LooperProvider({ children }: { children: React.ReactNode }) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const workletReadyRef = useRef(false);

  const playbackSlotsRef = useRef<(PlaybackSlot | null)[]>(Array(TRACK_COUNT).fill(null));
  const recordingChunksRef = useRef<Float32Array[][]>(Array.from({ length: TRACK_COUNT }, () => []));
  const recordingTrackRef = useRef<number | null>(null);
  // AudioContext time when each recording started (for click-to-click loop length)
  const recordingStartTimeRef = useRef<number>(0);
  const masterStartRef = useRef<number>(0);

  const [tracks, setTracks] = useState<LoopTrack[]>(
    Array.from({ length: TRACK_COUNT }, (_, i) => makeEmptyTrack(i))
  );
  const [selectedTrack, setSelectedTrack] = useState(0);
  const [masterLength, setMasterLength] = useState<number | null>(null);
  const [masterBpm, setMasterBpm] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const masterLengthRef = useRef<number | null>(null);
  masterLengthRef.current = masterLength;
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;

  const getCtx = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      audioContextRef.current = new AudioContext({ latencyHint: "interactive" });
      // New context: worklet module must be re-registered
      workletReadyRef.current = false;
    }
    return audioContextRef.current;
  }, []);

  const startListening = useCallback(async () => {
    try {
      const ctx = getCtx();
      if (ctx.state === "suspended") await ctx.resume();

      // Chrome is stricter with audio constraints — try exact constraints, fall back to basic
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      streamRef.current = stream;

      if (!workletReadyRef.current) {
        const blob = new Blob([WORKLET_CODE], { type: "application/javascript" });
        const url = URL.createObjectURL(blob);
        await ctx.audioWorklet.addModule(url);
        URL.revokeObjectURL(url);
        workletReadyRef.current = true;
      }

      const sourceNode = ctx.createMediaStreamSource(stream);
      sourceNodeRef.current = sourceNode;

      const workletNode = new AudioWorkletNode(ctx, "looper-recorder");
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (e: MessageEvent<{ chunk: Float32Array }>) => {
        const trackIdx = recordingTrackRef.current;
        if (trackIdx !== null) {
          recordingChunksRef.current[trackIdx].push(e.data.chunk);
        }
      };

      // Worklet must connect to destination or Chrome prunes it from the audio graph
      const silentGain = ctx.createGain();
      silentGain.gain.value = 0;
      sourceNode.connect(workletNode);
      workletNode.connect(silentGain);
      silentGain.connect(ctx.destination);

      setIsListening(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Microphone unavailable");
    }
  }, [getCtx]);

  const stopListening = useCallback(() => {
    workletNodeRef.current?.disconnect();
    sourceNodeRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    workletNodeRef.current = null;
    sourceNodeRef.current = null;
    streamRef.current = null;
    setIsListening(false);
  }, []);

  // Gapless looping via lookahead scheduling: pre-schedules the next buffer iteration
  // before the current one ends, avoiding the gap that source.loop can introduce.
  const stopPlayback = useCallback((trackIndex: number) => {
    const slot = playbackSlotsRef.current[trackIndex];
    if (slot) {
      clearInterval(slot.intervalId);
      slot.gain.gain.setTargetAtTime(0, slot.gain.context.currentTime, 0.01);
      setTimeout(() => { try { slot.gain.disconnect(); } catch (_) {} }, 100);
      playbackSlotsRef.current[trackIndex] = null;
    }
  }, []);

  const startPlayback = useCallback((trackIndex: number, buffer: AudioBuffer, when = 0) => {
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume();
    stopPlayback(trackIndex);

    const track = tracksRef.current[trackIndex];
    const gain = ctx.createGain();
    gain.gain.value = (track?.isMuted ?? false) ? 0 : (track?.volume ?? 0.8);
    gain.connect(ctx.destination);

    // Use sample-exact duration to avoid floating-point loop drift
    const loopSamples = buffer.length;
    const loopDuration = loopSamples / ctx.sampleRate;
    let nextStartTime = when <= 0 ? ctx.currentTime : when;

    function scheduleNext() {
      const ctx2 = audioContextRef.current;
      if (!ctx2 || ctx2.state === "closed") return;
      while (nextStartTime < ctx2.currentTime + SCHEDULE_AHEAD) {
        const source = ctx2.createBufferSource();
        source.buffer = buffer;
        source.connect(gain);
        source.start(nextStartTime);
        source.stop(nextStartTime + loopDuration);
        nextStartTime += loopDuration;
      }
    }

    scheduleNext();
    const intervalId = setInterval(scheduleNext, SCHEDULE_INTERVAL_MS);

    playbackSlotsRef.current[trackIndex] = { gain, buffer, loopSamples, nextStartTime, intervalId };
  }, [getCtx, stopPlayback]);

  const nextLoopBoundary = useCallback((ctx: AudioContext): number => {
    const ml = masterLengthRef.current;
    if (!ml || masterStartRef.current === 0) return ctx.currentTime;
    const elapsed = ctx.currentTime - masterStartRef.current;
    const cyclesElapsed = Math.floor(elapsed / ml);
    return masterStartRef.current + (cyclesElapsed + 1) * ml;
  }, []);

  const recordStop = useCallback((trackIndex?: number) => {
    const ctx = getCtx();
    const idx = trackIndex ?? selectedTrack;
    const track = tracksRef.current[idx];

    if (!isListening) return;

    if (track.status === "empty" || track.status === "stopped") {
      // Start recording — note AudioContext time for click-to-click length calculation
      recordingChunksRef.current[idx] = [];
      recordingStartTimeRef.current = ctx.currentTime;
      recordingTrackRef.current = idx;
      workletNodeRef.current?.port.postMessage({ active: true });

      setTracks((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], status: "recording" };
        return next;
      });
    } else if (track.status === "recording") {
      // Stop recording → commit loop
      workletNodeRef.current?.port.postMessage({ active: false });
      recordingTrackRef.current = null;

      const chunks = recordingChunksRef.current[idx];
      if (chunks.length === 0) return;

      const rawSamples = chunks.reduce((s, c) => s + c.length, 0);
      const rawDuration = rawSamples / ctx.sampleRate;

      let targetSamples: number;
      let newMasterLength = masterLengthRef.current;

      if (!newMasterLength) {
        // First loop: use exact chunk count — no zero-padding, no silence at loop end
        targetSamples = rawSamples;
        newMasterLength = rawDuration;
        setMasterLength(newMasterLength);
        const bpmGuess = Math.round((2 * 4 * 60) / newMasterLength);
        setMasterBpm(bpmGuess);
      } else {
        // Snap to nearest multiple of master length
        const multiples = Math.max(1, Math.round(rawDuration / newMasterLength));
        targetSamples = Math.round(multiples * newMasterLength * ctx.sampleRate);
      }

      const buffer = chunksToBuffer(ctx, chunks, targetSamples);
      // For first loop masterLengthRef is still null (setState is async), so
      // nextLoopBoundary returns ctx.currentTime — playback starts immediately.
      const when = nextLoopBoundary(ctx);
      // Anchor master start to actual playback time so subsequent tracks align
      if (masterStartRef.current === 0) {
        masterStartRef.current = when;
      }
      startPlayback(idx, buffer, when);

      setTracks((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], status: "playing", audioBuffer: buffer, duration: buffer.duration };
        return next;
      });
    } else if (track.status === "playing") {
      // Start overdubbing
      recordingChunksRef.current[idx] = [];
      recordingStartTimeRef.current = ctx.currentTime;
      recordingTrackRef.current = idx;
      workletNodeRef.current?.port.postMessage({ active: true });

      setTracks((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], status: "overdubbing" };
        return next;
      });
    } else if (track.status === "overdubbing") {
      // Commit overdub
      workletNodeRef.current?.port.postMessage({ active: false });
      recordingTrackRef.current = null;

      const existingBuffer = track.audioBuffer!;
      const overdubChunks = recordingChunksRef.current[idx];
      const mixedBuffer = mixBuffers(ctx, existingBuffer, overdubChunks);

      stopPlayback(idx);
      startPlayback(idx, mixedBuffer);

      setTracks((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], status: "playing", audioBuffer: mixedBuffer };
        return next;
      });
    }
  }, [getCtx, selectedTrack, isListening, nextLoopBoundary, startPlayback, stopPlayback]);

  const stopTrack = useCallback((trackIndex: number) => {
    stopPlayback(trackIndex);
    if (recordingTrackRef.current === trackIndex) {
      workletNodeRef.current?.port.postMessage({ active: false });
      recordingTrackRef.current = null;
    }
    setTracks((prev) => {
      const next = [...prev];
      const t = next[trackIndex];
      if (t.status !== "empty") {
        next[trackIndex] = { ...t, status: t.audioBuffer ? "stopped" : "empty" };
      }
      return next;
    });
  }, [stopPlayback]);

  const playTrack = useCallback((trackIndex: number) => {
    const track = tracksRef.current[trackIndex];
    if (!track.audioBuffer || track.status === "playing") return;
    startPlayback(trackIndex, track.audioBuffer);
    setTracks((prev) => {
      const next = [...prev];
      next[trackIndex] = { ...next[trackIndex], status: "playing" };
      return next;
    });
  }, [startPlayback]);

  const clearTrack = useCallback((trackIndex: number) => {
    stopPlayback(trackIndex);
    if (recordingTrackRef.current === trackIndex) {
      workletNodeRef.current?.port.postMessage({ active: false });
      recordingTrackRef.current = null;
    }
    recordingChunksRef.current[trackIndex] = [];
    setTracks((prev) => {
      const next = [...prev];
      next[trackIndex] = makeEmptyTrack(trackIndex);
      return next;
    });
  }, [stopPlayback]);

  const setTrackVolume = useCallback((trackIndex: number, volume: number) => {
    setTracks((prev) => {
      const next = [...prev];
      next[trackIndex] = { ...next[trackIndex], volume };
      return next;
    });
    const slot = playbackSlotsRef.current[trackIndex];
    if (slot) slot.gain.gain.value = volume;
  }, []);

  const toggleMute = useCallback((trackIndex: number) => {
    setTracks((prev) => {
      const next = [...prev];
      const t = next[trackIndex];
      const muted = !t.isMuted;
      next[trackIndex] = { ...t, isMuted: muted };
      const slot = playbackSlotsRef.current[trackIndex];
      if (slot) slot.gain.gain.value = muted ? 0 : t.volume;
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    for (let i = 0; i < TRACK_COUNT; i++) {
      stopPlayback(i);
      recordingChunksRef.current[i] = [];
    }
    if (recordingTrackRef.current !== null) {
      workletNodeRef.current?.port.postMessage({ active: false });
      recordingTrackRef.current = null;
    }
    setTracks(Array.from({ length: TRACK_COUNT }, (_, i) => makeEmptyTrack(i)));
    setMasterLength(null);
    setMasterBpm(null);
    masterStartRef.current = 0;
  }, [stopPlayback]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === "Space") { e.preventDefault(); recordStop(); }
      if (e.key >= "1" && e.key <= "5") setSelectedTrack(parseInt(e.key) - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [recordStop]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopListening();
      // Stop all scheduling intervals
      for (let i = 0; i < TRACK_COUNT; i++) stopPlayback(i);
      const ctx = audioContextRef.current;
      if (ctx && ctx.state !== "closed") ctx.close();
      audioContextRef.current = null;
      workletReadyRef.current = false;
    };
  }, [stopListening, stopPlayback]);

  return (
    <LooperContext.Provider value={{
      tracks, selectedTrack, masterLength, masterBpm, isListening, error,
      startListening, stopListening, recordStop, stopTrack, playTrack,
      clearTrack, setTrackVolume, toggleMute, setSelectedTrack, clearAll,
    }}>
      {children}
    </LooperContext.Provider>
  );
}
