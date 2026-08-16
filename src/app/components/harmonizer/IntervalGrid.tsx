import {
  SEMITONE_MAX,
  SEMITONE_MIN,
  canEnableVoice,
} from "../../utils/harmonizer/voiceCap";

/** Human-readable names for tooltips (button text uses ±semitones). */
const INTERVAL_NAMES: Record<number, string> = {
  [-12]: "octave down",
  [-11]: "major 7th down",
  [-10]: "minor 7th down",
  [-9]: "major 6th down",
  [-8]: "minor 6th down",
  [-7]: "perfect 5th down",
  [-6]: "tritone down",
  [-5]: "perfect 4th down",
  [-4]: "major 3rd down",
  [-3]: "minor 3rd down",
  [-2]: "major 2nd down",
  [-1]: "minor 2nd down",
  1: "minor 2nd up",
  2: "major 2nd up",
  3: "minor 3rd up",
  4: "major 3rd up",
  5: "perfect 4th up",
  6: "tritone up",
  7: "perfect 5th up",
  8: "minor 6th up",
  9: "major 6th up",
  10: "minor 7th up",
  11: "major 7th up",
  12: "octave up",
};

function formatSemitone(s: number): string {
  return s > 0 ? `+${s}` : `${s}`;
}

const CELLS: number[] = [];
for (let s = SEMITONE_MIN; s <= SEMITONE_MAX; s++) {
  if (s !== 0) CELLS.push(s);
}

interface IntervalGridProps {
  activeSemitones: number[];
  disabled?: boolean;
  shiftingSemitone: number | null;
  onToggle: (semitones: number) => void;
}

export function IntervalGrid({
  activeSemitones,
  disabled,
  shiftingSemitone,
  onToggle,
}: IntervalGridProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-widest uppercase text-white/40">
          Interval grid
        </span>
        <span className="font-mono text-[9px] tracking-wider uppercase text-white/25">
          Semitones · root dry
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {CELLS.map((s) => {
          const active = activeSemitones.includes(s);
          const atCap = !active && !canEnableVoice(activeSemitones, s);
          const shifting = shiftingSemitone === s;
          const blocked = disabled || atCap;
          const name = INTERVAL_NAMES[s] ?? formatSemitone(s);
          return (
            <button
              key={s}
              type="button"
              disabled={blocked && !active}
              title={
                atCap && !active
                  ? "Mute a voice first (max 4)"
                  : `${formatSemitone(s)} · ${name}`
              }
              onClick={() => onToggle(s)}
              className="min-w-[2.25rem] px-1.5 py-1.5 rounded-sm border font-mono text-[10px] tracking-wide tabular-nums transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
              style={
                active
                  ? {
                      borderColor: "rgba(255,77,109,0.65)",
                      background: "rgba(255,77,109,0.18)",
                      color: "rgba(255,200,210,0.95)",
                    }
                  : {
                      borderColor: "rgba(255,255,255,0.12)",
                      color: "rgba(255,255,255,0.45)",
                    }
              }
            >
              {shifting ? "…" : formatSemitone(s)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
