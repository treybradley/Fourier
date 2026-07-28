import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
} from "react";
import type { ArcTrack, ArcAction } from "./types";
import { formatDuration } from "./types";
import type { Dispatch } from "react";

const PITCH_LABELS = [
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
];

const KEY_TO_PC: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  Eb: 3,
  "D#": 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  Ab: 8,
  "G#": 8,
  A: 9,
  Bb: 10,
  "A#": 10,
  B: 11,
  Cm: 0,
  "C#m": 1,
  Dm: 2,
  Ebm: 3,
  Em: 4,
  Fm: 5,
  "F#m": 6,
  Gm: 7,
  "G#m": 8,
  Am: 9,
  Bbm: 10,
  Bm: 11,
};

function rootPitchClass(key: string | null): number | null {
  if (!key) return null;
  return KEY_TO_PC[key] ?? null;
}

interface TrackCardProps {
  track: ArcTrack;
  index: number;
  isExpanded: boolean;
  dispatch: Dispatch<ArcAction>;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  isDragOver: boolean;
}

const ACCENT = "#EB00F7";
const ACCENT2 = "#009DFF";

function Badge({
  children,
  color,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-mono tracking-wide border"
      style={{
        borderColor: color
          ? `${color}40`
          : "rgba(255,255,255,0.12)",
        color: color ?? "rgba(255,255,255,0.5)",
        background: color
          ? `${color}12`
          : "rgba(255,255,255,0.04)",
      }}
    >
      {children}
    </span>
  );
}

function MiniWaveform({
  waveform,
  isPlaying,
  currentTime,
  duration,
  onSeek,
}: {
  waveform: number[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onSeek: (ratio: number) => void;
}) {
  const uid = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  const getRatio = useCallback((clientX: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging.current) onSeek(getRatio(e.clientX));
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [onSeek, getRatio]);

  const pts = waveform.length;
  const progress = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
  const playheadX = progress * 100;

  const pathD = waveform
    .map((v, i) => {
      const x = (i / (pts - 1)) * 100;
      const h = Math.max(0.04, v) * 0.5;
      return `M${x},${50 - h * 100} L${x},${50 + h * 100}`;
    })
    .join(" ");

  const playedId  = `played-${uid}`;
  const unplayedId = `unplayed-${uid}`;

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="cursor-pointer overflow-visible"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        e.stopPropagation();
        dragging.current = true;
        onSeek(getRatio(e.clientX));
      }}
    >
      <defs>
        <clipPath id={playedId}>
          <rect x="0" y="0" width={playheadX} height="100" />
        </clipPath>
        <clipPath id={unplayedId}>
          <rect x={playheadX} y="0" width={100 - playheadX} height="100" />
        </clipPath>
      </defs>

      {/* Played portion — accented */}
      <g clipPath={`url(#${playedId})`}>
        <path d={pathD} stroke={ACCENT2} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </g>

      {/* Unplayed portion — dim */}
      <g clipPath={`url(#${unplayedId})`}>
        <path
          d={pathD}
          stroke={isPlaying ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.20)"}
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />
      </g>

      {/* Playhead */}
      {duration > 0 && (
        <line
          x1={playheadX} y1={5}
          x2={playheadX} y2={95}
          stroke="rgba(255,255,255,0.75)"
          strokeWidth="0.6"
        />
      )}
    </svg>
  );
}

/** Shared pitch-viz height so Average ↔ Over time doesn't jump. */
const PITCH_VIZ_HEIGHT = 128;

function ChromagramOverTime({
  frames,
  rootPc,
  currentTime,
  duration,
  onSeek,
  canSeek,
}: {
  frames: number[][];
  rootPc: number | null;
  currentTime: number;
  duration: number;
  onSeek: (ratio: number) => void;
  canSeek: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const cols = frames.length;
  const progress =
    duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;

  const getRatio = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging.current && canSeek) onSeek(getRatio(e.clientX));
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

  // Render C at bottom (pc 0) → B at top, music-viz convention
  const rowOrder = Array.from({ length: 12 }, (_, i) => 11 - i);

  return (
    <div className="flex gap-2" style={{ height: PITCH_VIZ_HEIGHT }}>
      <div className="flex flex-col justify-between flex-shrink-0 w-5 py-0.5">
        {rowOrder.map((pc) => (
          <span
            key={pc}
            className="text-[8px] font-mono leading-none"
            style={{
              color:
                rootPc === pc
                  ? ACCENT
                  : "rgba(255,255,255,0.35)",
            }}
          >
            {PITCH_LABELS[pc]}
          </span>
        ))}
      </div>

      <div
        ref={containerRef}
        className={`relative flex-1 min-w-0 rounded-sm overflow-hidden ${
          canSeek ? "cursor-pointer" : "cursor-default"
        }`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => {
          e.stopPropagation();
          if (!canSeek) return;
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
              const alpha = 0.08 + v * 0.92;
              const bg = isRoot
                ? `rgba(235, 0, 247, ${alpha})`
                : `rgba(0, 157, 255, ${alpha * 0.85})`;
              return (
                <div
                  key={`${pc}-${fi}`}
                  style={{
                    gridColumn: fi + 1,
                    gridRow: 11 - pc + 1,
                    background: bg,
                  }}
                />
              );
            }),
          )}
        </div>

        {duration > 0 && (
          <div
            className="absolute top-0 bottom-0 w-px pointer-events-none"
            style={{
              left: `${progress * 100}%`,
              background: "rgba(255,255,255,0.8)",
              boxShadow: "0 0 4px rgba(0,0,0,0.5)",
            }}
          />
        )}
      </div>
    </div>
  );
}

export function TrackCard({
  track,
  index,
  isExpanded,
  dispatch,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: TrackCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [pitchView, setPitchView] = useState<"average" | "overtime">("average");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const getOrCreateAudio = useCallback(() => {
    if (!audioRef.current && track.fileUrl) {
      audioRef.current = new Audio(track.fileUrl);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.ontimeupdate = () =>
        setCurrentTime(audioRef.current?.currentTime ?? 0);
    }
    return audioRef.current;
  }, [track.fileUrl]);

  const togglePlay = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const audio = getOrCreateAudio();
      if (!audio) return;
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play();
        setIsPlaying(true);
      }
    },
    [getOrCreateAudio, isPlaying],
  );

  const handleSeek = useCallback(
    (ratio: number) => {
      const audio = getOrCreateAudio();
      if (!audio || !track.duration) return;
      const t = ratio * track.duration;
      audio.currentTime = t;
      setCurrentTime(t);
    },
    [getOrCreateAudio, track.duration],
  );

  const toggle = () =>
    dispatch({
      type: "SET_EXPANDED",
      id: isExpanded ? null : track.id,
    });

  const remove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    dispatch({ type: "REMOVE_TRACK", id: track.id });
    if (isExpanded)
      dispatch({ type: "SET_EXPANDED", id: null });
  };

  return (
    <div
      className="relative"
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
    >
      {isDragOver && (
        <div
          className="absolute -top-px left-0 right-0 h-0.5 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT2})`,
          }}
        />
      )}

      <div
        className="rounded-sm border transition-all select-none"
        style={{
          borderColor: isExpanded
            ? `${ACCENT}40`
            : "rgba(255,255,255,0.07)",
          background: isExpanded
            ? `${ACCENT}08`
            : "rgba(255,255,255,0.02)",
        }}
      >
        {/* Collapsed row */}
        <div className="flex flex-col px-3 pt-2.5 pb-2 gap-1.5">
          {/* Top row: drag · index · chevron · title/artist · badges · remove */}
          <div className="flex items-center gap-2">
            {/* Drag handle */}
            <div className="flex-shrink-0 cursor-grab text-white/15 hover:text-white/35 transition-colors">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 8h16M4 16h16"
                />
              </svg>
            </div>

            {/* Index */}
            <span
              className="text-[10px] font-mono tabular-nums flex-shrink-0 w-5 text-right"
              style={{ color: `${ACCENT}80` }}
            >
              {String(index + 1).padStart(2, "0")}
            </span>

            {/* Expand / collapse — only control that toggles the drawer */}
            <button
              type="button"
              aria-label={isExpanded ? "Collapse track details" : "Expand track details"}
              aria-expanded={isExpanded}
              onClick={toggle}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-sm border border-white/15 text-white/50 hover:text-white/80 hover:border-white/30 transition-colors"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isExpanded ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Title + artist */}
            <div className="flex-1 min-w-0">
              {track.analyzing ? (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-20 rounded-full bg-white/10 animate-pulse" />
                  <span className="text-[9px] font-mono text-white/25">
                    analyzing…
                  </span>
                </div>
              ) : (
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <span className="text-white/80 text-xs font-medium truncate">
                    {track.title || "Untitled"}
                  </span>
                  {track.artist && (
                    <span className="text-white/30 text-[10px] truncate flex-shrink-0">
                      {track.artist}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {track.duration > 0 && (
                <span className="text-white/30 text-[9px] font-mono tabular-nums">
                  {formatDuration(track.duration)}
                </span>
              )}
              {track.bpm && (
                <Badge color={ACCENT2}>{track.bpm} BPM</Badge>
              )}
              {track.key && <Badge>{track.key}</Badge>}
              {track.camelot && (
                <Badge color={ACCENT}>{track.camelot}</Badge>
              )}
            </div>

            {/* Remove */}
            <button
              onClick={remove}
              className="flex-shrink-0 text-white/15 hover:text-red-400/60 transition-colors ml-0.5"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Bottom row: play · waveform — seek/play only, never expands */}
          {(track.fileUrl || track.waveform) && (
            <div className="flex items-center gap-2 pt-2 pb-2">
              <button
                onClick={togglePlay}
                disabled={!track.fileUrl}
                className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full border transition-all"
                style={{
                  borderColor: isPlaying
                    ? `${ACCENT2}60`
                    : "rgba(255,255,255,0.15)",
                  background: isPlaying
                    ? `${ACCENT2}18`
                    : "transparent",
                  color: isPlaying
                    ? ACCENT2
                    : "rgba(255,255,255,0.35)",
                }}
              >
                {isPlaying ? (
                  <svg
                    className="w-2 h-2"
                    viewBox="0 0 8 8"
                    fill="currentColor"
                  >
                    <rect
                      x="1"
                      y="0.5"
                      width="2"
                      height="7"
                      rx="0.5"
                    />
                    <rect
                      x="5"
                      y="0.5"
                      width="2"
                      height="7"
                      rx="0.5"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-2 h-2"
                    viewBox="0 0 8 8"
                    fill="currentColor"
                    style={{ marginLeft: 1 }}
                  >
                    <polygon points="1,0.5 7,4 1,7.5" />
                  </svg>
                )}
              </button>

              <div className="flex-1 min-w-0 h-10">
                {track.waveform ? (
                  <MiniWaveform
                    waveform={track.waveform}
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    duration={track.duration}
                    onSeek={handleSeek}
                  />
                ) : (
                  <div className="h-px bg-white/8 my-auto mt-2.5" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Expanded section */}
        {isExpanded && (
          <div className="border-t border-white/5 px-3 py-3 space-y-6">
            {/* EQ band bars */}
            {!track.analyzing && (
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Sub",   value: track.sub },
                  { label: "Bass",  value: track.bass },
                  { label: "Mids",  value: track.mids },
                  { label: "Highs", value: track.highs },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[8px] font-mono text-white/25 uppercase tracking-wider">
                        {label}
                      </span>
                      <span className="text-[8px] font-mono text-white/35">
                        {Math.round(value * 100)}%
                      </span>
                    </div>
                    <div className="h-0.5 rounded-full bg-white/8 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${value * 100}%`,
                          background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT2})`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pitch classes — Average bars ↔ Over-time chromagram */}
            {!track.analyzing &&
              track.chroma &&
              (() => {
                const rootPc = rootPitchClass(track.key);
                const rootVal =
                  rootPc !== null
                    ? Math.max(track.chroma[rootPc], 0.01)
                    : Math.max(...track.chroma);
                const hasFrames =
                  !!track.chromaFrames && track.chromaFrames.length > 0;
                const showOvertime =
                  pitchView === "overtime" && hasFrames;

                return (
                  <div>
                    <div className="flex items-center justify-between mb-2 gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[8px] font-mono text-white/25 uppercase tracking-wider">
                          Pitch classes
                        </span>
                        <div className="flex items-center rounded-sm border border-white/15 p-0.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPitchView("average");
                            }}
                            className="px-2 py-1 text-[9px] font-mono rounded-[2px] transition-colors"
                            style={{
                              color:
                                pitchView === "average"
                                  ? "rgba(255,255,255,0.9)"
                                  : "rgba(255,255,255,0.35)",
                              background:
                                pitchView === "average"
                                  ? "rgba(255,255,255,0.1)"
                                  : "transparent",
                            }}
                          >
                            Average
                          </button>
                          <button
                            type="button"
                            disabled={!hasFrames}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (hasFrames) setPitchView("overtime");
                            }}
                            className="px-2 py-1 text-[9px] font-mono rounded-[2px] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{
                              color:
                                pitchView === "overtime"
                                  ? "rgba(255,255,255,0.9)"
                                  : "rgba(255,255,255,0.35)",
                              background:
                                pitchView === "overtime"
                                  ? "rgba(255,255,255,0.1)"
                                  : "transparent",
                            }}
                            title={
                              hasFrames
                                ? "Chromagram over time"
                                : "Re-import track to generate chromagram"
                            }
                          >
                            Over time
                          </button>
                        </div>
                      </div>

                      {track.key && (
                        <span
                          className="text-[8px] font-mono truncate flex-shrink-0"
                          style={{ color: ACCENT }}
                        >
                          root · {track.key}
                        </span>
                      )}
                    </div>

                    {showOvertime ? (
                      <ChromagramOverTime
                        frames={track.chromaFrames!}
                        rootPc={rootPc}
                        currentTime={currentTime}
                        duration={track.duration}
                        onSeek={handleSeek}
                        canSeek={!!track.fileUrl && track.duration > 0}
                      />
                    ) : (
                      <div
                        className="flex items-end gap-0.5"
                        style={{ height: PITCH_VIZ_HEIGHT }}
                      >
                        {PITCH_LABELS.map((label, pc) => {
                          const isRoot = rootPc === pc;
                          const ratio = track.chroma![pc] / rootVal;
                          const hasEnergy = !isRoot && ratio >= 0.18;
                          const h = Math.min(1, Math.max(0.05, ratio));
                          return (
                            <div
                              key={pc}
                              className="flex-1 flex flex-col items-center justify-end h-full"
                              style={{ gap: 4 }}
                            >
                              <div
                                className="w-full rounded-t-[1px]"
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
                                className="text-[8px] font-mono leading-none"
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
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

            {/* Notes */}
            <div>
              <label className="text-[9px] font-mono text-white/25 uppercase tracking-widest block mb-1">
                Notes
              </label>
              <textarea
                className="w-full bg-white/[0.04] border border-white/8 rounded-sm px-2.5 py-2 text-[11px] text-white/70 placeholder:text-white/20 resize-none outline-none focus:border-white/20 transition-colors"
                rows={3}
                placeholder="Thoughts, cue points, drop markers…"
                value={track.notes}
                onChange={(e) =>
                  dispatch({
                    type: "UPDATE_TRACK",
                    id: track.id,
                    updates: { notes: e.target.value },
                  })
                }
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}