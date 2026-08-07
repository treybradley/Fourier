/** Fixed social export: 9:16 vertical (IG Reels / TikTok / Shorts). */
export const EXPORT_WIDTH = 1080;
export const EXPORT_HEIGHT = 1920;

/**
 * Instagram Reels-ish safe margins (approx).
 * Keep chrome inside these so UI isn't covered by IG controls / captions.
 * Values are fractions of canvas width/height.
 */
export const IG_SAFE = {
  top: 0.12, // below status / username area
  bottom: 0.12, // match top inset (was 0.18 — felt oversized vs branding)
  side: 0.06,
} as const;

/** Match LoopTrack waveform colors (purple → blue → green → yellow → red). */
export const TRACK_WAVE_COLORS = [
  "#8b5cf6",
  "#38bdf8",
  "#34d399",
  "#fbbf24",
  "#fb7185",
];
