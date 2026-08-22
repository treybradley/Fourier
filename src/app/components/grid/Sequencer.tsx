import type { Dispatch } from "react";
import type { Pad, GridAction } from "./types";
import { PAD_KEYS } from "./types";
import { useVisualMode } from "../../hooks/useVisualMode";

interface SequencerProps {
  pads: Pad[];
  pattern: boolean[][];
  currentStep: number;
  isPlaying: boolean;
  selectedPadId: number | null;
  dispatch: Dispatch<GridAction>;
}

const STEPS = Array.from({ length: 16 }, (_, i) => i);
const BEAT_MARKERS = new Set([0, 4, 8, 12]);

export function Sequencer({
  pads,
  pattern,
  currentStep,
  isPlaying,
  selectedPadId,
  dispatch,
}: SequencerProps) {
  const { ink, accent, mono } = useVisualMode();
  const accentA = accent("#62FF00");
  return (
    <div className="w-full h-full overflow-y-auto overflow-x-auto">
      <div
        className="flex flex-col gap-1 h-full md:min-w-0"
        style={{ minWidth: "max(100%, 740px)" }}
      >
        {/* Column headers */}
        <div
          className="flex items-center shrink-0 mb-1"
          style={{ paddingLeft: "108px" }}
        >
          {STEPS.map((step) => (
            <div
              key={step}
              className="flex-1 text-center text-[8px] font-mono tabular-nums"
              style={{
                color:
                  isPlaying && currentStep === step
                    ? accentA
                    : BEAT_MARKERS.has(step)
                      ? ink(0.81)
                      : ink(0.6),
                fontWeight: BEAT_MARKERS.has(step)
                  ? "500"
                  : "400",
              }}
            >
              {step + 1}
            </div>
          ))}
        </div>

        {/* Pad rows */}
        {pads.map((pad) => {
          const isSelected = selectedPadId === pad.id;
          const hasContent = !!pad.buffer;
          return (
            <div
              key={pad.id}
              className="flex items-center shrink-0 gap-0 rounded-sm transition-colors duration-100"
              style={{
                background: isSelected
                  ? `${accentA}18`
                  : "transparent",
                opacity: hasContent ? 1 : 0.45,
              }}
            >
              {/* Pad label */}
              <div
                className="shrink-0 flex items-center gap-2 cursor-pointer select-none"
                style={{ width: "108px", paddingLeft: "4px" }}
                onClick={() =>
                  dispatch({
                    type: "SELECT_PAD",
                    padId: pad.id,
                  })
                }
              >
                <span
                  className="text-[9px] font-mono tabular-nums shrink-0"
                  style={{
                    color: isSelected
                      ? accentA
                      : ink(0.69),
                    width: "14px",
                  }}
                >
                  {PAD_KEYS[pad.id]}
                </span>
                <span
                  className="text-[9px] font-mono truncate"
                  style={{
                    color: isSelected
                      ? ink(0.7)
                      : ink(0.3),
                  }}
                >
                  {pad.fileName
                    ? pad.fileName
                        .replace(
                          /\.(mp3|wav|ogg|flac|m4a)$/i,
                          "",
                        )
                        .slice(0, 9)
                    : "––"}
                </span>
              </div>

              {/* Steps */}
              <div className="flex flex-1 items-center gap-0">
                {STEPS.map((step) => {
                  const active =
                    pattern[pad.id]?.[step] ?? false;
                  const isCurrentStep =
                    isPlaying && currentStep === step;
                  const isBeat = BEAT_MARKERS.has(step);
                  return (
                    <button
                      key={step}
                      className="flex-1 flex items-center justify-center py-2"
                      onClick={() =>
                        dispatch({
                          type: "TOGGLE_STEP",
                          padId: pad.id,
                          step,
                        })
                      }
                    >
                      <div
                        className="rounded-full transition-all duration-75"
                        style={{
                          width: "16px",
                          height: "16px",
                          background: active
                            ? isCurrentStep
                              ? mono
                                ? "#111111"
                                : "#FFFFFF"
                              : accentA
                            : isCurrentStep
                              ? `${accentA}40`
                              : isBeat
                                ? ink(0.12)
                                : ink(0.07),
                          boxShadow:
                            active && isCurrentStep
                              ? `0 0 8px ${accentA}`
                              : "none",
                          transform:
                            isCurrentStep && active
                              ? "scale(1.25)"
                              : "scale(1)",
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}