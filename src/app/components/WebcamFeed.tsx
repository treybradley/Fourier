import { motion } from "motion/react";
import { EXPORT_HEIGHT, EXPORT_WIDTH } from "../utils/exportFormat";

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

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="relative flex-1 min-h-0 flex items-center justify-center rounded-sm border border-white/8 bg-black/60 overflow-hidden p-2">
        {/* Hidden camera source for compositor + MediaPipe */}
        <video
          ref={videoRef as React.RefObject<HTMLVideoElement>}
          className="absolute w-px h-px opacity-0 pointer-events-none"
          autoPlay
          muted
          playsInline
        />

        <div
          className="relative h-full max-w-full mx-auto"
          style={{ aspectRatio }}
        >
          <canvas
            ref={canvasRef as React.RefObject<HTMLCanvasElement>}
            className="absolute inset-0 w-full h-full rounded-sm bg-[#04050F]"
          />

          {!started && (
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/85 backdrop-blur-sm p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="w-full max-w-[15rem] space-y-1.5">
                <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-3 text-center">
                  Gesture controls
                </p>
                {GESTURES.map((g) => (
                  <div
                    key={g.gesture}
                    className="flex items-center gap-2 bg-white/5 rounded px-2.5 py-1.5"
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-sm flex-shrink-0 ${DOT[g.color]}`}
                    />
                    <span className="text-white/30 text-[9px] font-mono w-3 flex-shrink-0">
                      {g.hand}
                    </span>
                    <span className="text-white/55 text-[9px] font-mono flex-1 leading-tight">
                      {g.gesture}
                    </span>
                    <span className="text-white/30 text-[9px] font-mono text-right">
                      {g.action}
                    </span>
                  </div>
                ))}
              </div>

              <motion.button
                type="button"
                onClick={onStart}
                className="flex items-center gap-2 bg-white/8 hover:bg-white/12 border border-white/15 hover:border-white/30 text-white/70 hover:text-white/90 text-[11px] font-mono tracking-widest uppercase rounded-sm px-4 py-2.5 transition-colors"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Enable camera
              </motion.button>
            </motion.div>
          )}

          {started && !isReady && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
              <div className="w-7 h-7 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              <p className="text-white/40 text-[11px] font-mono">
                Loading hand tracking…
              </p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 p-6 text-center">
              <p className="text-red-400/80 text-sm font-mono">
                Camera unavailable
              </p>
              <p className="text-white/30 text-xs">{error}</p>
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
