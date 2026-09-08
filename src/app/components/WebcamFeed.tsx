import { motion } from "motion/react";
import { EXPORT_HEIGHT, EXPORT_WIDTH } from "../utils/exportFormat";
import { useVisualMode } from "../hooks/useVisualMode";

interface WebcamFeedProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isReady: boolean;
  started: boolean;
  error: string | null;
  isCapturing?: boolean;
  onStart: () => void;
  onStop: () => void;
}

const GESTURES = [
  {
    color: "amber",
    hand: "R",
    gesture: "Quick pinch",
    action: "Switch stem",
  },
  {
    color: "sky",
    hand: "R",
    gesture: "Pinch in pitch band ←→",
    action: "Pitch",
  },
  {
    color: "rose",
    hand: "L",
    gesture: "Pinch in volume band ←→",
    action: "Volume",
  },
  {
    color: "emerald",
    hand: "L",
    gesture: "Open / close fist",
    action: "Pause / play",
  },
  {
    color: "violet",
    hand: "⌨",
    gesture: "Keys 1–4",
    action: "Jump to cue",
  },
];

const DOT: Record<string, string> = {
  amber: "bg-amber-400/80",
  sky: "bg-sky-400/80",
  violet: "bg-violet-400/80",
  rose: "bg-rose-400/80",
  emerald: "bg-emerald-400/80",
};

export function WebcamFeed({
  videoRef,
  canvasRef,
  isReady,
  started,
  error,
  isCapturing,
  onStart,
  onStop,
}: WebcamFeedProps) {
  const aspectRatio = `${EXPORT_WIDTH} / ${EXPORT_HEIGHT}`;
  const { mono } = useVisualMode();
  const staging = mono && (!started || !!error || (started && !isReady && !error));

  return (
    <div className="h-full flex flex-col min-h-0">
      <div
        className={`relative flex-1 min-h-0 flex items-center justify-center rounded-sm border overflow-hidden p-2 ${
          staging ? "border-black/25" : "border-white/8 bg-black/60"
        }`}
        style={staging ? { background: "#ffffff" } : undefined}
        {...(staging ? {} : { "data-visual-exempt": true })}
      >
        <video
          ref={videoRef as React.RefObject<HTMLVideoElement>}
          className="absolute w-px h-px opacity-0 pointer-events-none"
          autoPlay
          muted
          playsInline
        />

        {/* Full-width gesture panel — not locked inside 9:16 */}
        {!started && (
          <motion.div
            className={`w-full flex flex-col items-stretch justify-center gap-4 p-3 sm:p-4 rounded-sm ${
              mono ? "" : "bg-black/85 backdrop-blur-sm"
            }`}
            style={mono ? { background: "#ffffff" } : undefined}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-full space-y-1.5">
              <p
                className={`text-[10px] font-mono uppercase tracking-widest mb-2 text-center ${
                  mono ? "text-black/80" : "text-white/80"
                }`}
              >
                Gesture controls
              </p>
              {GESTURES.map((g) => (
                <div
                  key={g.gesture}
                  className={`flex items-center gap-2.5 rounded px-3 py-2 ${
                    mono ? "bg-black/5" : "bg-white/5"
                  }`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-sm flex-shrink-0 ${DOT[g.color]}`}
                  />
                  <span
                    className={`text-[10px] font-mono w-3.5 flex-shrink-0 ${
                      mono ? "text-black/70" : "text-white/80"
                    }`}
                  >
                    {g.hand}
                  </span>
                  <span
                    className={`text-[10px] font-mono flex-1 leading-snug min-w-0 ${
                      mono ? "text-black/85" : "text-white/90"
                    }`}
                  >
                    {g.gesture}
                  </span>
                  <span
                    className={`text-[10px] font-mono text-right shrink-0 whitespace-nowrap ${
                      mono ? "text-black/65" : "text-white/75"
                    }`}
                  >
                    {g.action}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-center">
              <motion.button
                type="button"
                onClick={onStart}
                className={`flex items-center gap-2 text-[11px] font-mono tracking-widest uppercase rounded-sm px-4 py-2.5 transition-colors border ${
                  mono
                    ? "border-black/35 bg-black hover:bg-black/85"
                    : "bg-white/8 hover:bg-white/12 border-white/15 hover:border-white/30 text-white/70 hover:text-white/90"
                }`}
                style={mono ? { color: "#ffffff" } : undefined}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Enable camera
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Single canvas always mounted; 9:16 only when live */}
        <div
          className={
            started
              ? "relative h-full max-w-full mx-auto"
              : "absolute w-px h-px overflow-hidden opacity-0 pointer-events-none"
          }
          style={started ? { aspectRatio } : undefined}
        >
          <canvas
            ref={canvasRef as React.RefObject<HTMLCanvasElement>}
            className={
              started
                ? `absolute inset-0 w-full h-full rounded-sm ${
                    staging ? "" : "bg-[#04050F]"
                  }`
                : "w-px h-px"
            }
            style={started && staging ? { background: "#ffffff" } : undefined}
          />

          {started && !isReady && !error && (
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-sm ${
                mono ? "" : "bg-black/60"
              }`}
              style={mono ? { background: "#ffffff" } : undefined}
            >
              <div
                className={`w-7 h-7 border-2 rounded-full animate-spin ${
                  mono
                    ? "border-black/20 border-t-black/70"
                    : "border-white/20 border-t-white/60"
                }`}
              />
              <p
                className={`text-[11px] font-mono ${
                  mono ? "text-black/70" : "text-white/40"
                }`}
              >
                Loading hand tracking…
              </p>
            </div>
          )}

          {started && error && (
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center rounded-sm ${
                mono ? "" : "bg-black/70"
              }`}
              style={mono ? { background: "#ffffff" } : undefined}
            >
              <p
                className={`text-sm font-mono ${
                  mono ? "text-red-600" : "text-red-400/80"
                }`}
              >
                Camera unavailable
              </p>
              <p
                className={`text-xs ${
                  mono ? "text-black/60" : "text-white/30"
                }`}
              >
                {error}
              </p>
            </div>
          )}

          {started && !error && (
            <motion.button
              type="button"
              onClick={onStop}
              className="absolute top-2 right-2 z-10 flex items-center gap-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-sm border border-white/10 hover:border-white/20 text-white/40 hover:text-white/70 text-[9px] font-mono rounded-sm px-2 py-1 transition-colors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              off
            </motion.button>
          )}

          {isCapturing && (
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm border border-red-400/30 rounded-sm px-2 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              <span className="text-red-200/90 text-[9px] font-mono tracking-wider uppercase">
                Rec
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
