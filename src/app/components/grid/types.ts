import getBpm from "bpm-detective";

export type Pad = {
  id: number;
  buffer: AudioBuffer | null;
  reverseBuffer: AudioBuffer | null;
  fileName: string | null;
  /** Detected sample tempo at 1× speed, if detection succeeded. */
  detectedBpm: number | null;
  trimStart: number;
  trimEnd: number;
  speed: number;
  gain: number;
  drive: number;
  loop: boolean;
  reverse: boolean;
};

export type GridMode = "live" | "seq";

/** Pattern length in bars. */
export type PatternBars = 1 | 2 | 4;

/**
 * Step grid resolution within each beat.
 * 1/4 → "1234", 1/8 → "1&2&3&4&", 1/16 → "1e&a2e&a3e&a4e&a"
 */
export type Subdivision = "1/4" | "1/8" | "1/16";

/** @deprecated Use stepsPerBar(subdivision) — kept for older imports. */
export const STEPS_PER_BAR = 16;

/** How many steps land on one quarter-note beat. */
export const STEPS_PER_BEAT: Record<Subdivision, number> = {
  "1/4": 1,
  "1/8": 2,
  "1/16": 4,
};

/** Transport Div control — short labels; grid headers use count syllables. */
export const SUBDIVISION_OPTIONS: {
  id: Subdivision;
  label: string;
  title: string;
}[] = [
  { id: "1/4", label: "4", title: "Quarter notes — 1 2 3 4" },
  { id: "1/8", label: "8", title: "Eighth notes — 1 & 2 & 3 & 4 &" },
  { id: "1/16", label: "16", title: "Sixteenth notes — 1 e & a 2 e & a …" },
];

export function parseSubdivision(value: unknown): Subdivision {
  if (value === "1/4" || value === "1/8" || value === "1/16") return value;
  // Legacy 1/32 grids collapse to sixteenths
  if (value === "1/32") return "1/16";
  return "1/16";
}

/**
 * Drum-count syllable for a step within a bar:
 * 1/4 → 1 2 3 4
 * 1/8 → 1 & 2 & 3 & 4 &
 * 1/16 → 1 e & a 2 e & a 3 e & a 4 e & a
 */
export function stepCountLabel(
  stepInBar: number,
  subdivision: Subdivision,
): string {
  const spb = STEPS_PER_BEAT[subdivision];
  const beat = Math.floor(stepInBar / spb) + 1;
  const sub = stepInBar % spb;
  if (subdivision === "1/4") return String(beat);
  if (subdivision === "1/8") return sub === 0 ? String(beat) : "&";
  // 1/16
  if (sub === 0) return String(beat);
  if (sub === 1) return "e";
  if (sub === 2) return "&";
  return "a";
}

export type GridState = {
  pads: Pad[];
  selectedPadId: number | null;
  pattern: boolean[][];
  /** How many bars the pattern spans. */
  bars: PatternBars;
  subdivision: Subdivision;
  bpm: number;
  isPlaying: boolean;
  currentStep: number;
  mode: GridMode;
};

export type GridAction =
  | {
      type: "LOAD_SAMPLE";
      padId: number;
      buffer: AudioBuffer;
      fileName: string;
      detectedBpm?: number | null;
    }
  | { type: "SELECT_PAD"; padId: number | null }
  | { type: "TOGGLE_STEP"; padId: number; step: number }
  | { type: "SET_BPM"; bpm: number }
  | { type: "SET_BARS"; bars: PatternBars }
  | { type: "SET_SUBDIVISION"; subdivision: Subdivision }
  | { type: "PLAY" }
  | { type: "STOP" }
  | { type: "STEP_ADVANCE"; step: number }
  | {
      type: "UPDATE_PAD_PARAM";
      padId: number;
      param: "trimStart" | "trimEnd" | "speed" | "gain" | "drive";
      value: number;
    }
  | { type: "SET_REVERSE"; padId: number; reverse: boolean }
  | { type: "SET_LOOP"; padId: number; loop: boolean }
  | { type: "SET_REVERSE_BUFFER"; padId: number; buffer: AudioBuffer | null }
  | { type: "CLEAR_PAD"; padId: number }
  | { type: "SET_MODE"; mode: GridMode }
  | {
      type: "SET_PATTERN";
      pattern: boolean[][];
      bars: PatternBars;
      subdivision?: Subdivision;
    };

export function stepsPerBar(subdivision: Subdivision): number {
  return 4 * STEPS_PER_BEAT[subdivision];
}

export function stepsPerBeatMarker(subdivision: Subdivision): number {
  return STEPS_PER_BEAT[subdivision];
}

export function totalStepsForBars(
  bars: PatternBars,
  subdivision: Subdivision = "1/16",
): number {
  return bars * stepsPerBar(subdivision);
}

export function secondsPerStep(bpm: number, subdivision: Subdivision): number {
  return 60 / bpm / STEPS_PER_BEAT[subdivision];
}

/** Grow/shrink each pad row for a new bar count at the current subdivision. */
export function resizePattern(
  pattern: boolean[][],
  bars: PatternBars,
  subdivision: Subdivision = "1/16",
): boolean[][] {
  const len = totalStepsForBars(bars, subdivision);
  return Array.from({ length: 9 }, (_, p) => {
    const row = pattern[p] ?? [];
    if (row.length === len) return [...row];
    if (row.length > len) return row.slice(0, len);
    return [...row, ...Array(len - row.length).fill(false)];
  });
}

/**
 * Remap hits between subdivisions (8 ↔ 16 ↔ 32) while keeping bar count.
 * Denser grids place hits on multiplied indices; coarser grids OR into buckets.
 */
export function remapSubdivision(
  pattern: boolean[][],
  from: Subdivision,
  to: Subdivision,
  bars: PatternBars,
): boolean[][] {
  if (from === to) return resizePattern(pattern, bars, to);
  const fromSpb = stepsPerBar(from);
  const toSpb = stepsPerBar(to);
  const newLen = bars * toSpb;
  const ratio = toSpb / fromSpb;

  return Array.from({ length: 9 }, (_, p) => {
    const old = pattern[p] ?? [];
    const next = Array(newLen).fill(false) as boolean[];
    if (ratio >= 1) {
      const r = ratio;
      for (let i = 0; i < old.length; i++) {
        if (!old[i]) continue;
        const ni = Math.round(i * r);
        if (ni < newLen) next[ni] = true;
      }
    } else {
      const r = Math.round(1 / ratio);
      for (let i = 0; i < old.length; i++) {
        if (!old[i]) continue;
        const ni = Math.floor(i / r);
        if (ni < newLen) next[ni] = true;
      }
    }
    return next;
  });
}

export function makeEmptyPattern(
  bars: PatternBars = 1,
  subdivision: Subdivision = "1/16",
): boolean[][] {
  const len = totalStepsForBars(bars, subdivision);
  return Array.from({ length: 9 }, () => Array(len).fill(false));
}

export function makePad(id: number): Pad {
  return {
    id,
    buffer: null,
    reverseBuffer: null,
    fileName: null,
    detectedBpm: null,
    trimStart: 0,
    trimEnd: 1,
    speed: 1,
    gain: 0.85,
    drive: 0,
    loop: false,
    reverse: false,
  };
}

export const PAD_KEYS = ["1", "2", "3", "Q", "W", "E", "A", "S", "D"];

export const KEY_TO_PAD: Record<string, number> = {
  "1": 0,
  "2": 1,
  "3": 2,
  q: 3,
  w: 4,
  e: 5,
  a: 6,
  s: 7,
  d: 8,
};

/** Best-effort sample tempo at 1× (null if detection fails / too short). */
export function detectPadBpm(buffer: AudioBuffer): number | null {
  try {
    const bpm = getBpm(buffer);
    return typeof bpm === "number" && Number.isFinite(bpm) && bpm > 0
      ? Math.round(bpm)
      : null;
  } catch {
    return null;
  }
}

export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const nCh = buffer.numberOfChannels;
  const nSamples = buffer.length;
  const sr = buffer.sampleRate;
  const bps = 2;
  const dataSize = nSamples * nCh * bps;
  const ab = new ArrayBuffer(44 + dataSize);
  const view = new DataView(ab);
  const str = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  str(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  str(8, "WAVE");
  str(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, nCh, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * nCh * bps, true);
  view.setUint16(32, nCh * bps, true);
  view.setUint16(34, 16, true);
  str(36, "data");
  view.setUint32(40, dataSize, true);
  const channels: Float32Array[] = [];
  for (let c = 0; c < nCh; c++) channels.push(buffer.getChannelData(c));
  let off = 44;
  for (let i = 0; i < nSamples; i++) {
    for (let c = 0; c < nCh; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([ab], { type: "audio/wav" });
}
