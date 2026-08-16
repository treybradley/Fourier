import {
  SEMITONE_MAX,
  SEMITONE_MIN,
  canEnableVoice,
} from "../../utils/harmonizer/voiceCap";

const INTERVAL_LABELS: Record<number, string> = {
  [-12]: "−oct",
  [-11]: "−M7",
  [-10]: "−m7",
  [-9]: "−M6",
  [-8]: "−m6",
  [-7]: "−P5",
  [-6]: "−TT",
  [-5]: "−P4",
  [-4]: "−M3",
  [-3]: "−m3",
  [-2]: "−M2",
  [-1]: "−m2",
  1: "+m2",
  2: "+M2",
  3: "+m3",
  4: "+M3",
  5: "+P4",
  6: "+TT",
  7: "+P5",
  8: "+m6",
  9: "+M6",
  10: "+m7",
  11: "+M7",
  12: "+oct",
};

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
          Root · dry
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {CELLS.map((s) => {
          const active = activeSemitones.includes(s);
          const atCap = !active && !canEnableVoice(activeSemitones, s);
          const shifting = shiftingSemitone === s;
          const blocked = disabled || atCap;
          return (
            <button
              key={s}
              type="button"
              disabled={blocked && !active}
              title={
                atCap && !active
                  ? "Mute a voice first (max 4)"
                  : `${INTERVAL_LABELS[s] ?? s} (${s > 0 ? "+" : ""}${s})`
              }
              onClick={() => onToggle(s)}
              className="min-w-[2.5rem] px-1.5 py-1.5 rounded-sm border font-mono text-[9px] tracking-wide uppercase transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
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
              {shifting ? "…" : INTERVAL_LABELS[s] ?? `${s > 0 ? "+" : ""}${s}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}
