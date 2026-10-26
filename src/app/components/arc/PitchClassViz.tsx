import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  rankKeyCandidates,
  type KeyCandidate,
} from "../../hooks/useArcAnalyzer";

export const PITCH_LABELS = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;

export const PITCH_VIZ_HEIGHT = 128;

const ACCENT = "#EB00F7";
const ACCENT2 = "#009DFF";

const INTERVAL_FROM_ROOT = [
  "root",
  "♭2",
  "2",
  "♭3",
  "3",
  "4",
  "♭5",
  "5",
  "♭6",
  "6",
  "♭7",
  "7",
] as const;

const INTERVAL_INSIGHT: Record<string, string> = {
  root: "Tonic of the detected key — where the profile is anchored.",
  "♭2": "Phrygian / tension tone — usually sparse unless the track leans exotic.",
  "2": "Major second — melodic color; moderate energy is common.",
  "♭3": "Minor third — hallmark of minor keys and bluesy color.",
  "3": "Major third — hallmark of major keys.",
  "4": "Perfect fourth — strong support tone in many progressions.",
  "♭5": "Tritone — unstable; high energy often means tension or dominant flavor.",
  "5": "Perfect fifth — strongest consonant support after the root.",
  "♭6": "Minor sixth — common in minor / Aeolian color.",
  "6": "Major sixth — bright extension above the tonic.",
  "♭7": "Minor seventh — dominant / Mixolydian color.",
  "7": "Major seventh — jazzy / leading-tone color.",
};

const tipClass =
  "border border-white/15 bg-white/[0.08] backdrop-blur-md text-white/85 font-mono shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.1)] rounded-sm px-2.5 py-2.5 max-w-[17rem] z-[80]";

function intervalFromRoot(pc: number, rootPc: number | null): string {
  if (rootPc === null) return "pitch class";
  return INTERVAL_FROM_ROOT[(pc - rootPc + 12) % 12];
}

function formatPct(v: number): string {
  return `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%`;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function peakPitchClass(chroma: number[]): number {
  let best = 0;
  let max = -1;
  for (let i = 0; i < chroma.length; i++) {
    if ((chroma[i] ?? 0) > max) {
      max = chroma[i] ?? 0;
      best = i;
    }
  }
  return best;
}

function formatAlts(alts: KeyCandidate[]): string {
  return alts.map((c) => `${c.key} (${c.camelot})`).join(", ");
}

function averageBarInsight(opts: {
  label: string;
  pc: number;
  isRoot: boolean;
  role: string;
  ratio: number;
  peakPc: number;
  detectedKey: string | null;
  camelot: string | null;
  alternatives: KeyCandidate[];
}): { title: string; body: string; footer?: string } {
  const {
    label,
    pc,
    isRoot,
    role,
    ratio,
    peakPc,
    detectedKey,
    camelot,
    alternatives,
  } = opts;
  const isPeak = pc === peakPc;
  const keyLabel =
    detectedKey && camelot ? `${detectedKey} · ${camelot}` : detectedKey;
  const alts = alternatives.filter((c) => c.key !== detectedKey).slice(0, 3);

  if (isRoot) {
    return {
      title: `${label} · Key root`,
      body: keyLabel
        ? isPeak
          ? `Analysis puts the majority of average chroma energy on ${label}, so the key profile most likely centers here → ${keyLabel}.`
          : `Detected tonic for ${keyLabel}. Bars are scaled to this pitch class even when another note briefly carries more energy.`
        : `Detected tonic pitch class. Bars are scaled relative to this note.`,
      footer: alts.length
        ? `Other likely keys: ${formatAlts(alts)}`
        : undefined,
    };
  }

  if (isPeak && !isRoot) {
    return {
      title: `${label} · Peak energy · ${role}`,
      body: `This pitch class holds the most average energy (${formatPct(ratio)} vs root), but the key profile still favored ${keyLabel ?? "another tonic"}. Often a strong fifth, third, or drone.`,
      footer: alts.length
        ? `Other likely keys: ${formatAlts(alts)}`
        : undefined,
    };
  }

  const insight = INTERVAL_INSIGHT[role] ?? "Pitch-class energy in the track average.";
  return {
    title: `${label} · ${role}`,
    body: `${formatPct(ratio)} of root energy. ${insight}`,
    footer:
      ratio >= 0.45
        ? `Strong support tone for ${keyLabel ?? "the detected key"}.`
        : ratio < 0.18
          ? "Low average energy — not a primary tone in this analysis."
          : undefined,
  };
}

/** Average 12-bin chroma bars with insightful hover tooltips. */
export function ChromaAverageBars({
  chroma,
  rootPc,
  detectedKey = null,
  camelot = null,
}: {
  chroma: number[];
  rootPc: number | null;
  detectedKey?: string | null;
  camelot?: string | null;
}) {
  const rootVal =
    rootPc !== null
      ? Math.max(chroma[rootPc] ?? 0, 0.01)
      : Math.max(...chroma, 0.01);
  const peakPc = peakPitchClass(chroma);
  const ranked = useMemo(() => rankKeyCandidates(chroma, 4), [chroma]);

  return (
    <div className="space-y-1.5">
      <div
        className="flex items-end gap-0.5"
        style={{ height: PITCH_VIZ_HEIGHT }}
      >
        {PITCH_LABELS.map((label, pc) => {
          const isRoot = rootPc === pc;
          const ratio = (chroma[pc] ?? 0) / rootVal;
          const hasEnergy = !isRoot && ratio >= 0.18;
          const h = Math.min(1, Math.max(0.05, ratio));
          const role = intervalFromRoot(pc, rootPc);
          const tip = averageBarInsight({
            label,
            pc,
            isRoot,
            role,
            ratio,
            peakPc,
            detectedKey,
            camelot,
            alternatives: ranked,
          });

          return (
            <Tooltip key={pc}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="group flex-1 flex flex-col items-center justify-end h-full gap-1 min-w-0 outline-none"
                  aria-label={`${tip.title}. ${tip.body}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="w-full rounded-t-[1px] transition-[filter,transform] duration-150 group-hover:brightness-125 group-hover:scale-y-105 origin-bottom group-focus-visible:brightness-125"
                    style={{
                      height: `${h * (PITCH_VIZ_HEIGHT - 14)}px`,
                      background: isRoot
                        ? ACCENT
                        : hasEnergy
                          ? ACCENT2
                          : "rgba(255,255,255,0.12)",
                    }}
                  />
                  <span
                    className="text-[8px] font-mono leading-none transition-colors"
                    style={{
                      color: isRoot
                        ? ACCENT
                        : hasEnergy
                          ? `${ACCENT2}99`
                          : "rgba(255,255,255,0.22)",
                    }}
                  >
                    {label}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={6}
                showArrow={false}
                className={tipClass}
              >
                <div className="flex flex-col gap-1.5 text-left normal-case tracking-normal">
                  <span className="text-[11px] text-white/95 font-medium">
                    {tip.title}
                  </span>
                  <span className="text-[10px] text-white/55 leading-relaxed">
                    {tip.body}
                  </span>
                  {tip.footer ? (
                    <span className="text-[10px] text-white/40 leading-relaxed pt-0.5 border-t border-white/10">
                      {tip.footer}
                    </span>
                  ) : null}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <p className="text-[9px] font-mono text-white/25 tracking-wide">
        Hover a bar · pitch class, key role, and alternatives
      </p>
    </div>
  );
}

const EQ_BANDS = [
  {
    id: "sub" as const,
    label: "Sub",
    range: "20–80 Hz",
    body: "Club weight / 808 territory. High relative sub means the track’s loudest band is the deep low end—watch for mud when stacking bass-heavy tracks.",
  },
  {
    id: "bass" as const,
    label: "Bass",
    range: "80–300 Hz",
    body: "Kick body and bass fundamentals. Dominant bass often reads as groove-forward; low bass can feel thin against a sub-heavy partner.",
  },
  {
    id: "mids" as const,
    label: "Mids",
    range: "300 Hz–3 kHz",
    body: "Vocals, snares, and most melodic body live here. Mid-dominant tracks cut through a mix; low mids can disappear under dense arrangements.",
  },
  {
    id: "highs" as const,
    label: "Highs",
    range: "3–20 kHz",
    body: "Air, hats, and brilliance. High relative highs sound bright / open; low highs feel dark—useful when planning EQ complementary transitions.",
  },
];

/** DJ-style relative EQ band meters with glass tooltips. */
export function ArcEqBands({
  sub,
  bass,
  mids,
  highs,
  variant = "bars",
}: {
  sub: number;
  bass: number;
  mids: number;
  highs: number;
  /** Track card = horizontal meters; design system = tall columns. */
  variant?: "bars" | "columns";
}) {
  const values = { sub, bass, mids, highs };
  const dominant = EQ_BANDS.reduce((best, b) =>
    values[b.id] > values[best.id] ? b : best,
  );

  if (variant === "columns") {
    return (
      <div className="grid grid-cols-4 gap-2 max-w-md">
        {EQ_BANDS.map((b) => {
          const v = values[b.id];
          const isDom = b.id === dominant.id;
          return (
            <Tooltip key={b.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="group space-y-1.5 outline-none text-left"
                  aria-label={`${b.label} ${b.range}, ${formatPct(v)}`}
                >
                  <div className="h-16 rounded-sm border border-white/10 bg-black/20 flex items-end p-1 transition-[border-color] group-hover:border-white/25">
                    <div
                      className="w-full rounded-[1px] transition-[filter] group-hover:brightness-125"
                      style={{
                        height: `${Math.max(6, v * 100)}%`,
                        background: `linear-gradient(180deg, ${ACCENT}, ${ACCENT2})`,
                      }}
                    />
                  </div>
                  <div className="text-[9px] font-mono tracking-widest uppercase text-white/40 text-center group-hover:text-white/70">
                    {b.label}
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={6}
                showArrow={false}
                className={tipClass}
              >
                <div className="flex flex-col gap-1.5 text-left normal-case tracking-normal">
                  <span className="text-[11px] text-white/95 font-medium">
                    {b.label} · {b.range}
                  </span>
                  <span className="text-[10px] text-white/55 leading-relaxed">
                    {formatPct(v)} relative to the loudest band
                    {isDom ? " (dominant)" : ""}. {b.body}
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {EQ_BANDS.map((b) => {
        const v = values[b.id];
        const isDom = b.id === dominant.id;
        return (
          <Tooltip key={b.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="group text-left outline-none"
                aria-label={`${b.label} ${b.range}, ${formatPct(v)}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[8px] font-mono text-white/25 uppercase tracking-wider group-hover:text-white/55 transition-colors">
                    {b.label}
                  </span>
                  <span className="text-[8px] font-mono text-white/35 group-hover:text-white/60 transition-colors">
                    {Math.round(v * 100)}%
                  </span>
                </div>
                <div className="h-0.5 rounded-full bg-white/8 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[filter] group-hover:brightness-125"
                    style={{
                      width: `${v * 100}%`,
                      background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT2})`,
                    }}
                  />
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={6}
              showArrow={false}
              className={tipClass}
            >
              <div className="flex flex-col gap-1.5 text-left normal-case tracking-normal">
                <span className="text-[11px] text-white/95 font-medium">
                  {b.label} · {b.range}
                </span>
                <span className="text-[10px] text-white/55 leading-relaxed">
                  {formatPct(v)} relative to the loudest band
                  {isDom ? " (dominant)" : ""}. {b.body}
                </span>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

/** Time-varying chromagram with hover readout (cell highlight). */
export function ChromagramOverTime({
  frames,
  rootPc,
  currentTime = 0,
  duration = 0,
  onSeek,
  canSeek = false,
}: {
  frames: number[][];
  rootPc: number | null;
  currentTime?: number;
  duration?: number;
  onSeek?: (ratio: number) => void;
  canSeek?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const cols = frames.length;
  const progress =
    duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
  const [hover, setHover] = useState<{
    pc: number;
    fi: number;
    v: number;
  } | null>(null);

  const getRatio = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging.current && canSeek && onSeek) onSeek(getRatio(e.clientX));
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [onSeek, getRatio, canSeek]);

  const rowOrder = Array.from({ length: 12 }, (_, i) => 11 - i);

  const hoverTime =
    hover && cols > 1 && duration > 0
      ? (hover.fi / (cols - 1)) * duration
      : null;

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2" style={{ height: PITCH_VIZ_HEIGHT }}>
        <div className="flex flex-col justify-between flex-shrink-0 w-5 py-0.5">
          {rowOrder.map((pc) => (
            <span
              key={pc}
              className="text-[8px] font-mono leading-none transition-opacity"
              style={{
                color:
                  rootPc === pc ? ACCENT : "rgba(255,255,255,0.35)",
                opacity:
                  hover && hover.pc !== pc ? 0.35 : 1,
              }}
            >
              {PITCH_LABELS[pc]}
            </span>
          ))}
        </div>

        <div
          ref={containerRef}
          className={`relative flex-1 min-w-0 rounded-sm overflow-hidden border border-white/10 ${
            canSeek ? "cursor-pointer" : "cursor-crosshair"
          }`}
          onClick={(e) => e.stopPropagation()}
          onMouseLeave={() => setHover(null)}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (!canSeek || !onSeek) return;
            dragging.current = true;
            onSeek(getRatio(e.clientX));
          }}
        >
          <div
            className="absolute inset-0 grid"
            style={{
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridTemplateRows: "repeat(12, 1fr)",
              gap: 1,
            }}
          >
            {rowOrder.flatMap((pc) =>
              frames.map((frame, fi) => {
                const v = frame[pc] ?? 0;
                const isRoot = rootPc === pc;
                const isHover = hover?.pc === pc && hover?.fi === fi;
                const alpha = 0.08 + v * 0.92;
                const bg = isRoot
                  ? `rgba(235, 0, 247, ${alpha})`
                  : `rgba(0, 157, 255, ${alpha * 0.85})`;
                return (
                  <div
                    key={`${pc}-${fi}`}
                    role="img"
                    aria-label={`${PITCH_LABELS[pc]} at frame ${fi + 1}, ${formatPct(v)}`}
                    onMouseEnter={() => setHover({ pc, fi, v })}
                    style={{
                      gridColumn: fi + 1,
                      gridRow: 11 - pc + 1,
                      background: bg,
                      outline: isHover
                        ? "1px solid rgba(255,255,255,0.85)"
                        : undefined,
                      outlineOffset: -1,
                      filter: isHover ? "brightness(1.35)" : undefined,
                      zIndex: isHover ? 2 : 0,
                    }}
                  />
                );
              }),
            )}
          </div>

          {duration > 0 && (
            <div
              className="absolute top-0 bottom-0 w-px pointer-events-none z-10"
              style={{
                left: `${progress * 100}%`,
                background: "rgba(255,255,255,0.8)",
                boxShadow: "0 0 4px rgba(0,0,0,0.5)",
              }}
            />
          )}
        </div>
      </div>

      <p className="text-[9px] font-mono text-white/25 tracking-wide min-h-[1rem]">
        {hover ? (
          <span className="text-white/55">
            <span style={{ color: rootPc === hover.pc ? ACCENT : ACCENT2 }}>
              {PITCH_LABELS[hover.pc]}
            </span>
            {" · "}
            {intervalFromRoot(hover.pc, rootPc)}
            {" · "}
            {formatPct(hover.v)} energy
            {hoverTime !== null ? ` · ${formatTime(hoverTime)}` : ""}
          </span>
        ) : (
          "Hover a cell · pitch class · interval · energy · time"
        )}
      </p>
    </div>
  );
}
