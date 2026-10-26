const PITCH_MIN = 0.5;
const PITCH_MAX = 2;
const PITCH_STEP = 0.1;

export function clampPitch(value: number): number {
  return (
    Math.round(
      Math.min(PITCH_MAX, Math.max(PITCH_MIN, value)) * 100,
    ) / 100
  );
}

/** Compact − / value / + control for Collage pitch-as-zoom demos. */
export function PitchZoomControls({
  pitch,
  onChange,
}: {
  pitch: number;
  onChange: (pitch: number) => void;
}) {
  const atMin = pitch <= PITCH_MIN;
  const atMax = pitch >= PITCH_MAX;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-mono tracking-widest uppercase text-white/35">
        Pitch zoom
      </span>
      <div
        className="flex items-center rounded-sm border border-white/15 overflow-hidden"
        role="group"
        aria-label="Pitch zoom"
      >
        <button
          type="button"
          aria-label="Zoom out"
          disabled={atMin}
          onClick={() => onChange(clampPitch(pitch - PITCH_STEP))}
          className="w-7 h-7 flex items-center justify-center text-sm font-mono text-white/60 hover:text-white/90 hover:bg-white/10 disabled:text-white/20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
        >
          −
        </button>
        <span className="min-w-[2.75rem] px-1.5 text-center text-[10px] font-mono tabular-nums tracking-wider text-white/70 border-x border-white/10">
          {Math.round(pitch * 100)}%
        </span>
        <button
          type="button"
          aria-label="Zoom in"
          disabled={atMax}
          onClick={() => onChange(clampPitch(pitch + PITCH_STEP))}
          className="w-7 h-7 flex items-center justify-center text-sm font-mono text-white/60 hover:text-white/90 hover:bg-white/10 disabled:text-white/20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}
