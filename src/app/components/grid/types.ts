export type PadSource =
  | { type: "audio" }
  | { type: "youtube"; videoId: string; cueTime: number };

export type Pad = {
  id: number;
  source: PadSource;
  buffer: AudioBuffer | null;
  reverseBuffer: AudioBuffer | null;
  fileName: string | null;
  trimStart: number;
  trimEnd: number;
  speed: number;
  gain: number;
  drive: number;
  loop: boolean;
  reverse: boolean;
};

export type GridMode = "live" | "seq";

export type GridState = {
  pads: Pad[];
  selectedPadId: number | null;
  pattern: boolean[][];
  bpm: number;
  isPlaying: boolean;
  currentStep: number;
  mode: GridMode;
};

export type GridAction =
  | { type: "LOAD_SAMPLE"; padId: number; buffer: AudioBuffer; fileName: string }
  | { type: "LOAD_YOUTUBE"; padId: number; videoId: string; cueTime: number }
  | { type: "SELECT_PAD"; padId: number | null }
  | { type: "TOGGLE_STEP"; padId: number; step: number }
  | { type: "SET_BPM"; bpm: number }
  | { type: "PLAY" }
  | { type: "STOP" }
  | { type: "STEP_ADVANCE"; step: number }
  | { type: "UPDATE_PAD_PARAM"; padId: number; param: "trimStart" | "trimEnd" | "speed" | "gain" | "drive"; value: number }
  | { type: "SET_REVERSE"; padId: number; reverse: boolean }
  | { type: "SET_LOOP"; padId: number; loop: boolean }
  | { type: "SET_REVERSE_BUFFER"; padId: number; buffer: AudioBuffer | null }
  | { type: "CLEAR_PAD"; padId: number }
  | { type: "SET_MODE"; mode: GridMode }
  | { type: "UPDATE_YT_CUE"; padId: number; cueTime: number };

export function makePad(id: number): Pad {
  return {
    id,
    source: { type: "audio" },
    buffer: null,
    reverseBuffer: null,
    fileName: null,
    trimStart: 0,
    trimEnd: 1,
    speed: 1,
    gain: 0.85,
    drive: 0,
    loop: false,
    reverse: false,
  };
}

export const PAD_KEYS = ["1","2","3","Q","W","E","A","S","D"];

export const KEY_TO_PAD: Record<string, number> = {
  "1": 0, "2": 1, "3": 2,
  "q": 3, "w": 4, "e": 5,
  "a": 6, "s": 7, "d": 8,
};

export function parseYouTubeVideoId(input: string): string | null {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /embed\/([a-zA-Z0-9_-]{11})/,
    /shorts\/([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m) return m[1];
  }
  return null;
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
  str(0, "RIFF"); view.setUint32(4, 36 + dataSize, true);
  str(8, "WAVE"); str(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, nCh, true); view.setUint32(24, sr, true);
  view.setUint32(28, sr * nCh * bps, true); view.setUint16(32, nCh * bps, true);
  view.setUint16(34, 16, true); str(36, "data"); view.setUint32(40, dataSize, true);
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
