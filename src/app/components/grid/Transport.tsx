import { useEffect, useRef, useState, type Dispatch } from "react";
import type { GridMode, GridState, GridAction } from "./types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip";
import { useVisualMode } from "../../hooks/useVisualMode";

function useBpmHold(
  dispatch: Dispatch<GridAction>,
  bpm: number,
  delta: number,
) {
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clear() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = null;
    intervalRef.current = null;
  }

  function step() {
    dispatch({
      type: "SET_BPM",
      bpm: Math.max(40, Math.min(240, bpmRef.current + delta)),
    });
  }

  function start() {
    clear();
    step();
    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(step, 60);
    }, 320);
  }

  useEffect(() => () => clear(), []);

  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      start();
    },
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: (e: React.PointerEvent) => {
      // Only clear if we lost capture / mouse left while held
      if (e.buttons === 0) clear();
    },
  };
}

interface TransportProps {
  state: GridState;
  dispatch: Dispatch<GridAction>;
  onExportLoop?: (bars: 1 | 2 | 4) => void;
  onExportJson?: () => void;
  onImportJson?: () => void;
  isSessionRecording?: boolean;
  onToggleSessionRecord?: () => void;
}

const ACCENT_COLOR = "#62FF00";

const tipClass =
  "border border-white/10 bg-[#0A0509] text-white/70 font-mono text-[9px] tracking-wider uppercase px-2 py-1 rounded-sm shadow-none";

export function Transport({
  state,
  dispatch,
  onExportLoop,
  onExportJson,
  onImportJson,
  isSessionRecording,
  onToggleSessionRecord,
}: TransportProps) {
  const { isPlaying, bpm, mode } = state;
  const { accent, ink, inkFg, mono } = useVisualMode();
  const ACCENT = accent(ACCENT_COLOR);
  const [exportOpen, setExportOpen] = useState(false);
  const [lastBars, setLastBars] = useState<1 | 2 | 4>(1);
  const decBpm = useBpmHold(dispatch, bpm, -1);
  const incBpm = useBpmHold(dispatch, bpm, 1);

  function pickBars(bars: 1 | 2 | 4) {
    setLastBars(bars);
    setExportOpen(false);
    onExportLoop?.(bars);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      {/* Mode toggle */}
      <div
        className="flex rounded-sm overflow-hidden border border-white/10"
        style={{ fontSize: "9px" }}
      >
        {(["live", "seq"] as GridMode[]).map((m) => (
          <button
            key={m}
            onClick={() => dispatch({ type: "SET_MODE", mode: m })}
            className="px-2.5 py-1 font-mono tracking-widest uppercase transition-all duration-150"
            style={
              mode === m
                ? {
                    background: `${ACCENT}28`,
                    color: ACCENT,
                    borderColor: "transparent",
                  }
                : { color: inkFg(0.55) }
            }
          >
            {m}
          </button>
        ))}
      </div>

      <div className="w-px h-4 bg-white/10" />

      {/* Play */}
      <button
        onClick={() =>
          dispatch({ type: isPlaying ? "STOP" : "PLAY" })
        }
        className="w-7 h-7 flex items-center justify-center rounded-sm border transition-all duration-150"
        style={
          isPlaying
            ? {
                borderColor: `${ACCENT}60`,
                background: `${ACCENT}20`,
                color: ACCENT,
              }
            : {
                borderColor: ink(0.28),
                color: inkFg(0.7),
                background: mono ? "rgba(0,0,0,0.05)" : "transparent",
              }
        }
        title={isPlaying ? "Stop (Space)" : "Play (Space)"}
      >
        {isPlaying ? (
          <svg
            className="w-2.5 h-2.5"
            fill="currentColor"
            viewBox="0 0 16 16"
          >
            <rect x="3" y="3" width="3" height="10" rx="0.5" />
            <rect x="10" y="3" width="3" height="10" rx="0.5" />
          </svg>
        ) : (
          <svg
            className="w-2.5 h-2.5"
            fill="currentColor"
            viewBox="0 0 16 16"
          >
            <polygon points="4,3 13,8 4,13" />
          </svg>
        )}
      </button>

      {/* Session record */}
      <button
        onClick={onToggleSessionRecord}
        className="h-7 px-2 flex items-center justify-center rounded-sm border transition-all duration-150"
        style={
          isSessionRecording
            ? {
                borderColor: `${ACCENT}60`,
                background: `${ACCENT}20`,
                color: ACCENT,
              }
            : {
                borderColor: ink(0.28),
                color: inkFg(0.7),
                background: mono ? "rgba(0,0,0,0.05)" : "transparent",
              }
        }
        title={
          isSessionRecording
            ? "Stop session recording"
            : "Record session (live + seq)"
        }
      >
        <span className="text-[9px] font-mono tracking-wider uppercase">
          {isSessionRecording ? "● Stop" : "Record"}
        </span>
      </button>

      {/* BPM — steppers for touch; number still editable */}
      <div className="flex items-center gap-0.5">
        <span className="text-white/25 text-[9px] font-mono tracking-widest mr-0.5">
          BPM
        </span>
        <button
          type="button"
          aria-label="Decrease BPM"
          className="w-8 h-8 flex items-center justify-center rounded-sm border border-white/10 text-white/55 hover:text-white/85 hover:border-white/25 active:bg-white/10 text-sm font-mono select-none touch-manipulation"
          style={{ touchAction: "manipulation" }}
          {...decBpm}
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={40}
          max={240}
          value={bpm}
          onChange={(e) =>
            dispatch({
              type: "SET_BPM",
              bpm: Math.round(Number(e.target.value)),
            })
          }
          className="w-11 h-8 text-center text-xs font-mono text-white/80 bg-white/5 border border-white/10 rounded-sm focus:outline-none focus:border-white/25 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          aria-label="Increase BPM"
          className="w-8 h-8 flex items-center justify-center rounded-sm border border-white/10 text-white/55 hover:text-white/85 hover:border-white/25 active:bg-white/10 text-sm font-mono select-none touch-manipulation"
          style={{ touchAction: "manipulation" }}
          {...incBpm}
        >
          +
        </button>
      </div>

      <div className="w-px h-4 bg-white/10" />

      {/* Export loop popover */}
      <Popover open={exportOpen} onOpenChange={setExportOpen}>
        <PopoverTrigger asChild>
          <button
            className="h-6 px-2 flex items-center justify-center rounded-sm border border-white/10 hover:border-white/25 transition-colors"
            style={
              exportOpen
                ? {
                    borderColor: `${ACCENT}50`,
                    color: ACCENT,
                  }
                : undefined
            }
          >
            <span className="text-[9px] font-mono tracking-wider text-white/55 uppercase">
              Export loop
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={6}
          className="w-auto p-2 border-white/10 bg-[#0A0509] shadow-lg"
        >
          <p className="text-[8px] font-mono tracking-widest uppercase text-white/30 px-1 mb-1.5">
            Bars
          </p>
          <div className="flex gap-1">
            {([1, 2, 4] as const).map((b) => (
              <button
                key={b}
                onClick={() => pickBars(b)}
                className="min-w-9 px-2.5 py-1.5 text-[10px] font-mono tabular-nums rounded-sm border transition-all duration-150"
                style={
                  lastBars === b
                    ? {
                        background: `${ACCENT}28`,
                        color: ACCENT,
                        borderColor: `${ACCENT}50`,
                      }
                    : {
                        color: "rgba(255,255,255,0.45)",
                        borderColor: "rgba(255,255,255,0.10)",
                      }
                }
              >
                {b}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Save JSON */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onExportJson}
            className="w-6 h-6 flex items-center justify-center rounded-sm border border-white/10 hover:border-white/25 transition-colors"
          >
            <svg
              className="w-3 h-3 text-white/55"
              fill="none"
              viewBox="0 0 16 16"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <rect x="3" y="2" width="10" height="12" rx="1" />
              <path strokeLinecap="round" d="M6 6h4M6 9h4M6 12h2" />
            </svg>
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          sideOffset={6}
          showArrow={false}
          className={tipClass}
        >
          Save project
        </TooltipContent>
      </Tooltip>

      {/* Load JSON */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onImportJson}
            className="w-6 h-6 flex items-center justify-center rounded-sm border border-white/10 hover:border-white/25 transition-colors"
          >
            <svg
              className="w-3 h-3 text-white/55"
              fill="none"
              viewBox="0 0 16 16"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 13V6m0 0l-2.5 2.5M8 6l2.5 2.5M3 3h10"
              />
            </svg>
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          sideOffset={6}
          showArrow={false}
          className={tipClass}
        >
          Load project
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
