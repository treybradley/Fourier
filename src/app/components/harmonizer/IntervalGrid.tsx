import { useState } from "react";
import {
  SEMITONE_MAX,
  SEMITONE_MIN,
  canEnableVoice,
} from "../../utils/harmonizer/voiceCap";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip";

/**
 * Chord-tone / scale-degree shorthand relative to the sung note as root.
 * Flat marks the minor (or diminished) quality — e.g. ♭3 = minor 3rd, 3 = major 3rd.
 * (Major is unmarked; we don't use ♯ for "major third".)
 */
const DEGREE_LABELS: Record<number, string> = {
  [-12]: "−8",
  [-11]: "−7",
  [-10]: "−♭7",
  [-9]: "−6",
  [-8]: "−♭6",
  [-7]: "−5",
  [-6]: "−♭5",
  [-5]: "−4",
  [-4]: "−3",
  [-3]: "−♭3",
  [-2]: "−2",
  [-1]: "−♭2",
  1: "♭2",
  2: "2",
  3: "♭3",
  4: "3",
  5: "4",
  6: "♭5",
  7: "5",
  8: "♭6",
  9: "6",
  10: "♭7",
  11: "7",
  12: "8",
};

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

const tipClass =
  "border border-white/12 bg-[#0A060C] text-white/80 font-mono shadow-none rounded-sm px-2.5 py-2 max-w-[14rem]";

type LabelMode = "degree" | "semitone";

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
  const [mode, setMode] = useState<LabelMode>("degree");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] tracking-widest uppercase text-white/40">
          Interval grid
        </span>
        <div
          className="flex rounded-sm border border-white/12 overflow-hidden"
          role="group"
          aria-label="Label mode"
        >
          <button
            type="button"
            onClick={() => setMode("degree")}
            className="px-2 py-1 font-mono text-[9px] tracking-wider uppercase transition-colors"
            style={
              mode === "degree"
                ? {
                    background: "rgba(255,77,109,0.2)",
                    color: "rgba(255,200,210,0.95)",
                  }
                : { color: "rgba(255,255,255,0.35)" }
            }
          >
            Name
          </button>
          <button
            type="button"
            onClick={() => setMode("semitone")}
            className="px-2 py-1 font-mono text-[9px] tracking-wider uppercase border-l border-white/12 transition-colors"
            style={
              mode === "semitone"
                ? {
                    background: "rgba(255,77,109,0.2)",
                    color: "rgba(255,200,210,0.95)",
                  }
                : { color: "rgba(255,255,255,0.35)" }
            }
          >
            ±st
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {CELLS.map((s) => {
          const active = activeSemitones.includes(s);
          const atCap = !active && !canEnableVoice(activeSemitones, s);
          const shifting = shiftingSemitone === s;
          const blocked = disabled || atCap;
          const label =
            mode === "semitone"
              ? formatSemitone(s)
              : (DEGREE_LABELS[s] ?? formatSemitone(s));
          const fullName = INTERVAL_NAMES[s] ?? formatSemitone(s);
          const degree = DEGREE_LABELS[s] ?? formatSemitone(s);

          return (
            <Tooltip key={s}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  disabled={blocked && !active}
                  aria-label={`${fullName}, ${formatSemitone(s)}`}
                  onClick={() => onToggle(s)}
                  className="min-w-[2.35rem] px-1.5 py-1.5 rounded-sm border font-mono text-[10px] tracking-wide tabular-nums transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
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
                  {shifting ? "…" : label}
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={6}
                showArrow={false}
                className={tipClass}
              >
                {atCap && !active ? (
                  <p className="text-[10px] tracking-wide text-white/55">
                    Mute a voice first (max 4)
                  </p>
                ) : (
                  <div className="flex flex-col gap-0.5 text-left">
                    <span className="text-[11px] text-white/90 tracking-wide">
                      {fullName}
                    </span>
                    <span className="text-[10px] text-white/45 tracking-wider uppercase">
                      {formatSemitone(s)} · {degree}
                    </span>
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
