export type ArcTrack = {
  id: string;
  title: string;
  artist: string;
  duration: number;
  bpm: number | null;
  key: string | null;
  camelot: string | null;
  chroma: number[] | null;           // 12 pitch-class magnitudes, normalized 0–1 (track average)
  chromaFrames: number[][] | null;   // time-varying chromagram: frames × 12, each frame normalized 0–1
  waveform: number[] | null;  // peak amplitude envelope, 120 points, normalized 0–1
  fileUrl: string | null;     // blob URL for in-browser playback
  energy: number;             // overall RMS loudness, used for bridge compat
  sub: number;                // 20–80 Hz band energy ratio
  bass: number;               // 80–300 Hz band energy ratio
  mids: number;               // 300–3k Hz band energy ratio
  highs: number;              // 3k–20k Hz band energy ratio
  notes: string;
  analyzing: boolean;
};

export type Bridge = {
  id: string;
  transitionNotes: string;
  loopIdeas: string;
  fxIdeas: string;
  cueReminders: string;
  mashupIdeas: string;
};

export type StoryLayerKey =
  | "energy"
  | "tempo"
  | "harmonic"
  | "sub"
  | "bass"
  | "mids"
  | "highs";

export type ArcState = {
  projectTitle: string;
  projectType: "djset" | "mashup";
  tracks: ArcTrack[];
  bridges: Record<string, Bridge>;
  activeTab: "plan" | "story";
  expandedTrackId: string | null;
  storyLayers: Record<StoryLayerKey, boolean>;
};

export type ArcAction =
  | { type: "ADD_TRACKS"; tracks: ArcTrack[] }
  | { type: "UPDATE_TRACK"; id: string; updates: Partial<ArcTrack> }
  | { type: "REMOVE_TRACK"; id: string }
  | { type: "REORDER_TRACKS"; fromIndex: number; toIndex: number }
  | { type: "UPDATE_BRIDGE"; id: string; updates: Partial<Bridge> }
  | { type: "SET_TAB"; tab: "plan" | "story" }
  | { type: "SET_EXPANDED"; id: string | null }
  | { type: "TOGGLE_STORY_LAYER"; layer: StoryLayerKey }
  | { type: "SET_PROJECT_TITLE"; title: string }
  | { type: "SET_PROJECT_TYPE"; projectType: "djset" | "mashup" };

export function bridgeId(a: ArcTrack, b: ArcTrack): string {
  return [a.id, b.id].sort().join("__");
}

export function makeBridge(id: string): Bridge {
  return { id, transitionNotes: "", loopIdeas: "", fxIdeas: "", cueReminders: "", mashupIdeas: "" };
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Camelot wheel distance (0 = same key, max ~6)
export function camelotDistance(a: string, b: string): number {
  const numA = parseInt(a), numB = parseInt(b);
  const ringA = a.slice(-1), ringB = b.slice(-1);
  const numDist = Math.min(Math.abs(numA - numB), 12 - Math.abs(numA - numB));
  if (ringA === ringB) return numDist;
  return numDist + 1; // cross-ring costs 1 extra
}

export function bridgeCompat(a: ArcTrack, b: ArcTrack): {
  bpm: number;
  harmonic: number;
  energy: number;
  overall: number;
} {
  const bpm =
    a.bpm && b.bpm
      ? Math.max(0, 1 - Math.min(Math.abs(a.bpm - b.bpm), 20) / 20)
      : 0.5;

  const harmonic =
    a.camelot && b.camelot
      ? Math.max(0, 1 - camelotDistance(a.camelot, b.camelot) / 6)
      : 0.5;

  const energy = 1 - Math.abs(a.energy - b.energy);
  const overall = bpm * 0.35 + harmonic * 0.4 + energy * 0.25;

  return { bpm, harmonic, energy, overall };
}
