import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
} from "react";
import type { Pad, GridAction, PatternBars, Subdivision } from "./types";
import {
  PAD_KEYS,
  stepsPerBar,
  stepsPerBeatMarker,
  stepCountLabel,
  totalStepsForBars,
} from "./types";
import { useVisualMode } from "../../hooks/useVisualMode";
import { useIsMobile } from "../ui/use-mobile";

interface SequencerProps {
  pads: Pad[];
  pattern: boolean[][];
  bars: PatternBars;
  subdivision: Subdivision;
  currentStep: number;
  isPlaying: boolean;
  selectedPadId: number | null;
  dispatch: Dispatch<GridAction>;
}

const LABEL_W = 108;
/** Hit dots are always this size — never stretch with the cell. */
const DOT_SIZE = 14;
const MIN_STEP_MOBILE = 36;
const MIN_STEP_DESKTOP = 24;

export function Sequencer({
  pads,
  pattern,
  bars,
  subdivision,
  currentStep,
  isPlaying,
  selectedPadId,
  dispatch,
}: SequencerProps) {
  const { accent, mono } = useVisualMode();
  const accentA = accent("#62FF00", "#FFFFFF");
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [availW, setAvailW] = useState(0);

  const spb = stepsPerBar(subdivision);
  const beatEvery = stepsPerBeatMarker(subdivision);
  const totalSteps = totalStepsForBars(bars, subdivision);
  const steps = useMemo(
    () => Array.from({ length: totalSteps }, (_, i) => i),
    [totalSteps],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setAvailW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const minStep = isMobile ? MIN_STEP_MOBILE : MIN_STEP_DESKTOP;
  const fitted =
    availW > LABEL_W ? (availW - LABEL_W) / totalSteps : minStep;
  // Fill the viewport when there's room; only scroll when cells would be too small
  const stepW = Math.max(minStep, fitted);
  const gridW = LABEL_W + totalSteps * stepW;
  const fillsWidth = availW > 0 && gridW <= availW + 0.5;

  // Mono palette: black field, white live hits
  const surface = mono ? "#000000" : "transparent";
  const labelBg = mono ? "#000000" : "rgba(10,5,9,0.96)";
  const labelBgSelected = mono ? "#0a0a0a" : "rgba(12,18,8,0.96)";
  const labelFg = mono ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.69)";
  const labelFgMuted = mono
    ? "rgba(255,255,255,0.35)"
    : "rgba(255,255,255,0.3)";
  const headerMuted = mono
    ? "rgba(255,255,255,0.45)"
    : "rgba(255,255,255,0.55)";
  const headerBeat = mono
    ? "rgba(255,255,255,0.75)"
    : "rgba(255,255,255,0.81)";
  const barLine = mono ? "rgba(255,255,255,0.2)" : `${accentA}28`;
  const barLineHeader = mono ? "rgba(255,255,255,0.28)" : `${accentA}35`;
  const rowSelected = mono ? "rgba(255,255,255,0.08)" : `${accentA}18`;

  function dotColor(active: boolean, isCurrent: boolean, isBeat: boolean) {
    if (mono) {
      if (active) return "#FFFFFF";
      if (isCurrent) return "rgba(255,255,255,0.5)";
      // Brighter inactive / subdivision dots so dense grids stay readable
      if (isBeat) return "rgba(255,255,255,0.28)";
      return "rgba(255,255,255,0.16)";
    }
    if (active) return isCurrent ? "#FFFFFF" : accentA;
    if (isCurrent) return `${accentA}40`;
    if (isBeat) return "rgba(255,255,255,0.12)";
    return "rgba(255,255,255,0.07)";
  }

  // Keep playhead in view when the grid scrolls
  useEffect(() => {
    if (!isPlaying || currentStep < 0) return;
    const scroller = scrollRef.current;
    if (!scroller) return;
    const stepLeft = LABEL_W + currentStep * stepW;
    const stepRight = stepLeft + stepW;
    const viewLeft = scroller.scrollLeft;
    const viewRight = viewLeft + scroller.clientWidth;
    const pad = 48;
    if (stepLeft < viewLeft + pad) {
      scroller.scrollTo({
        left: Math.max(0, stepLeft - LABEL_W - pad),
        behavior: "smooth",
      });
    } else if (stepRight > viewRight - pad) {
      scroller.scrollTo({
        left: stepRight - scroller.clientWidth + pad,
        behavior: "smooth",
      });
    }
  }, [currentStep, isPlaying, stepW]);

  function jumpToBar(barIndex: number) {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const left = barIndex * spb * stepW;
    scroller.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }

  return (
    <div
      className="w-full h-full flex flex-col min-h-0 gap-2"
      style={{ background: surface }}
    >
      {bars > 1 && (
        <div className="flex items-center gap-1 flex-shrink-0 px-0.5">
          <span
            className="text-[8px] font-mono tracking-widest uppercase mr-1"
            style={{ color: mono ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.25)" }}
          >
            Jump
          </span>
          {Array.from({ length: bars }, (_, b) => {
            const onBar =
              isPlaying &&
              Math.floor(Math.max(0, currentStep) / spb) === b;
            return (
              <button
                key={b}
                type="button"
                onClick={() => jumpToBar(b)}
                className="h-7 min-w-8 px-2 rounded-sm border text-[9px] font-mono tracking-wider uppercase transition-colors touch-manipulation"
                style={{
                  touchAction: "manipulation",
                  color: onBar
                    ? accentA
                    : mono
                      ? "rgba(255,255,255,0.5)"
                      : "rgba(255,255,255,0.45)",
                  borderColor: onBar
                    ? `${accentA}55`
                    : mono
                      ? "rgba(255,255,255,0.18)"
                      : "rgba(255,255,255,0.12)",
                  background: onBar ? `${accentA}14` : "transparent",
                }}
              >
                Bar {b + 1}
              </button>
            );
          })}
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-x-auto overflow-y-auto overscroll-contain rounded-sm"
        style={{
          WebkitOverflowScrolling: "touch",
          background: mono ? "#000000" : "transparent",
        }}
      >
        <div
          className="flex flex-col h-full min-h-full"
          style={{
            width: fillsWidth ? "100%" : gridW,
            minWidth: gridW,
          }}
        >
          {/* Column headers */}
          <div className="flex items-center shrink-0 mb-1 relative">
            <div
              className="shrink-0 sticky left-0 z-20"
              style={{ width: LABEL_W, background: labelBg }}
            />
            {steps.map((step) => {
              const inBar = step % spb;
              const isBarStart = inBar === 0;
              const isBeat = inBar % beatEvery === 0;
              const count = stepCountLabel(inBar, subdivision);
              return (
                <div
                  key={step}
                  className="shrink-0 text-center text-[8px] font-mono tabular-nums lowercase"
                  style={{
                    width: fillsWidth
                      ? `calc((100% - ${LABEL_W}px) / ${totalSteps})`
                      : stepW,
                    minWidth: fillsWidth ? undefined : stepW,
                    color:
                      isPlaying && currentStep === step
                        ? accentA
                        : isBeat
                          ? headerBeat
                          : headerMuted,
                    fontWeight: isBeat ? 500 : 400,
                    borderLeft:
                      isBarStart && step > 0
                        ? `1px solid ${barLineHeader}`
                        : "1px solid transparent",
                  }}
                  title={
                    bars > 1
                      ? `Bar ${Math.floor(step / spb) + 1} · ${count}`
                      : count
                  }
                >
                  {count}
                </div>
              );
            })}
          </div>

          {/* Pad rows — flex vertically to fill height on desktop */}
          {pads.map((pad) => {
            const isSelected = selectedPadId === pad.id;
            const hasContent = !!pad.buffer;
            return (
              <div
                key={pad.id}
                className="flex items-stretch flex-1 min-h-[40px] gap-0 rounded-sm transition-colors duration-100"
                style={{
                  background: isSelected ? rowSelected : "transparent",
                  opacity: hasContent ? 1 : 0.45,
                }}
              >
                <div
                  className="shrink-0 sticky left-0 z-10 flex items-center gap-2 cursor-pointer select-none"
                  style={{
                    width: LABEL_W,
                    paddingLeft: 4,
                    background: isSelected ? labelBgSelected : labelBg,
                    boxShadow: mono
                      ? "4px 0 8px rgba(0,0,0,0.8)"
                      : "4px 0 8px rgba(0,0,0,0.25)",
                  }}
                  onClick={() =>
                    dispatch({ type: "SELECT_PAD", padId: pad.id })
                  }
                >
                  <span
                    className="text-[9px] font-mono tabular-nums shrink-0"
                    style={{
                      color: isSelected ? accentA : labelFg,
                      width: 14,
                    }}
                  >
                    {PAD_KEYS[pad.id]}
                  </span>
                  <span
                    className="text-[9px] font-mono truncate"
                    style={{
                      color: isSelected ? labelFg : labelFgMuted,
                    }}
                  >
                    {pad.fileName
                      ? pad.fileName
                          .replace(/\.(mp3|wav|ogg|flac|m4a)$/i, "")
                          .slice(0, 9)
                      : "––"}
                  </span>
                </div>

                <div className="flex items-stretch flex-1 min-w-0">
                  {steps.map((step) => {
                    const active = pattern[pad.id]?.[step] ?? false;
                    const isCurrentStep =
                      isPlaying && currentStep === step;
                    const inBar = step % spb;
                    const isBarStart = inBar === 0;
                    const isBeat = inBar % beatEvery === 0;
                    return (
                      <button
                        key={step}
                        type="button"
                        className="flex items-center justify-center touch-manipulation"
                        style={{
                          width: fillsWidth
                            ? `calc(100% / ${totalSteps})`
                            : stepW,
                          minWidth: fillsWidth ? 0 : stepW,
                          flex: fillsWidth ? "1 1 0" : undefined,
                          touchAction: "manipulation",
                          borderLeft:
                            isBarStart && step > 0
                              ? `1px solid ${barLine}`
                              : "1px solid transparent",
                        }}
                        onClick={() =>
                          dispatch({
                            type: "TOGGLE_STEP",
                            padId: pad.id,
                            step,
                          })
                        }
                      >
                        {/* Fixed square circle — never inherits cell aspect ratio */}
                        <span
                          aria-hidden
                          className="rounded-full transition-transform duration-75 shrink-0 block"
                          style={{
                            width: DOT_SIZE,
                            height: DOT_SIZE,
                            minWidth: DOT_SIZE,
                            minHeight: DOT_SIZE,
                            maxWidth: DOT_SIZE,
                            maxHeight: DOT_SIZE,
                            aspectRatio: "1 / 1",
                            boxSizing: "border-box",
                            background: dotColor(
                              active,
                              isCurrentStep,
                              isBeat,
                            ),
                            boxShadow:
                              active && isCurrentStep
                                ? mono
                                  ? "0 0 8px rgba(255,255,255,0.55)"
                                  : `0 0 8px ${accentA}`
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
    </div>
  );
}
