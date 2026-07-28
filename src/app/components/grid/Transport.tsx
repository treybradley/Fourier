import type { Dispatch } from "react";
import type { GridMode, GridState, GridAction } from "./types";

interface TransportProps {
  state: GridState;
  dispatch: Dispatch<GridAction>;
  onExportWav?: () => void;
  onExportJson?: () => void;
  onImportJson?: () => void;
}

const ACCENT = "#62FF00";

export function Transport({
  state,
  dispatch,
  onExportWav,
  onExportJson,
  onImportJson,
}: TransportProps) {
  const { isPlaying, bpm, mode } = state;

  return (
    <div className="flex items-center gap-2">
      {/* Mode toggle */}
      <div
        className="flex rounded-sm overflow-hidden border border-white/10"
        style={{ fontSize: "9px" }}
      >
        {(["live", "seq"] as GridMode[]).map((m) => (
          <button
            key={m}
            onClick={() =>
              dispatch({ type: "SET_MODE", mode: m })
            }
            className="px-2.5 py-1 font-mono tracking-widest uppercase transition-all duration-150"
            style={
              mode === m
                ? {
                    background: `${ACCENT}28`,
                    color: ACCENT,
                    borderColor: "transparent",
                  }
                : { color: "rgba(255,255,255,0.30)" }
            }
          >
            {m}
          </button>
        ))}
      </div>

      {/* Divider */}
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
                borderColor: "rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.55)",
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

      {/* BPM */}
      <div className="flex items-center gap-1">
        <span className="text-white/25 text-[9px] font-mono tracking-widest">
          BPM
        </span>
        <input
          type="number"
          min={40}
          max={240}
          value={bpm}
          onChange={(e) =>
            dispatch({
              type: "SET_BPM",
              bpm: Math.round(Number(e.target.value)),
            })
          }
          className="w-12 text-center text-xs font-mono text-white/80 bg-white/5 border border-white/10 rounded-sm py-0.5 focus:outline-none focus:border-white/25"
        />
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-white/10" />

      {/* Export WAV */}
      <button
        onClick={onExportWav}
        className="w-6 h-6 flex items-center justify-center rounded-sm border border-white/10 hover:border-white/25 transition-colors"
        title="Export loop as WAV"
      >
        <svg
          className="w-3 h-3 text-white/35"
          fill="none"
          viewBox="0 0 16 16"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 3v7m0 0l-2.5-2.5M8 10l2.5-2.5M3 13h10"
          />
        </svg>
      </button>

      {/* Save JSON */}
      <button
        onClick={onExportJson}
        className="w-6 h-6 flex items-center justify-center rounded-sm border border-white/10 hover:border-white/25 transition-colors"
        title="Save project as JSON"
      >
        <svg
          className="w-3 h-3 text-white/35"
          fill="none"
          viewBox="0 0 16 16"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <rect x="3" y="2" width="10" height="12" rx="1" />
          <path strokeLinecap="round" d="M6 6h4M6 9h4M6 12h2" />
        </svg>
      </button>

      {/* Load JSON */}
      <button
        onClick={onImportJson}
        className="w-6 h-6 flex items-center justify-center rounded-sm border border-white/10 hover:border-white/25 transition-colors"
        title="Load project from JSON"
      >
        <svg
          className="w-3 h-3 text-white/35"
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
    </div>
  );
}