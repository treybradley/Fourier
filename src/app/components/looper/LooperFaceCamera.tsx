import { motion } from "motion/react";

interface LooperFaceCameraProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  overlayCanvasRef: React.RefObject<HTMLCanvasElement>;
  handCanvasRef?: React.RefObject<HTMLCanvasElement>;
  isReady: boolean;
  started: boolean;
  error: string | null;
  eyebrowsRaised: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function LooperFaceCamera({
  videoRef,
  overlayCanvasRef,
  handCanvasRef,
  isReady,
  started,
  error,
  eyebrowsRaised,
  onStart,
  onStop,
}: LooperFaceCameraProps) {
  return (
    <div className="relative w-full h-full rounded-sm overflow-hidden border border-white/8 bg-black/50">
      {/* Live video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: "scaleX(-1)" }}
        autoPlay
        muted
        playsInline
      />

      {/* Face landmark overlay */}
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      {/* Hand landmark overlay — shares same video feed */}
      {handCanvasRef && (
        <canvas
          ref={handCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      )}

      {/* Pre-start screen */}
      {!started && (
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/85 backdrop-blur-sm p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="text-center space-y-1">
            <p className="text-white/50 text-[10px] font-mono tracking-widest uppercase">
              Record Video
            </p>
            <p className="text-white/20 text-[9px] font-mono">
              Pinch with right hand to switch tracks
            </p>
          </div>

          <motion.button
            onClick={onStart}
            className="flex items-center gap-2 bg-white/8 hover:bg-white/12 border border-white/15 hover:border-white/30 text-white/60 hover:text-white/85 text-[11px] font-mono tracking-widest uppercase rounded-sm px-4 py-2.5 transition-colors"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Enable camera
          </motion.button>
        </motion.div>
      )}

      {/* Loading */}
      {started && !isReady && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
          <div className="w-6 h-6 border-2 border-white/15 border-t-white/50 rounded-full animate-spin" />
          <p className="text-white/35 text-[10px] font-mono">Loading face tracking…</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 p-4 text-center">
          <p className="text-red-400/70 text-xs font-mono">Camera unavailable</p>
          <p className="text-white/25 text-[10px]">{error}</p>
        </div>
      )}

      {/* Stop button */}
      {started && (
        <motion.button
          onClick={onStop}
          className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-sm border border-white/10 hover:border-white/20 text-white/40 hover:text-white/70 text-[9px] font-mono rounded-sm px-2 py-1 transition-colors z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          off
        </motion.button>
      )}

      {/* Live eyebrow indicator */}
      {isReady && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
          <motion.div
            className={`w-2 h-2 rounded-full ${eyebrowsRaised ? "bg-amber-400" : "bg-white/20"}`}
            animate={eyebrowsRaised ? { scale: [1, 1.4, 1] } : {}}
            transition={{ duration: 0.3 }}
          />
          <span className={`text-[9px] font-mono tracking-wider ${eyebrowsRaised ? "text-amber-300/90" : "text-white/25"}`}>
            {eyebrowsRaised ? "RAISE DETECTED" : "watching brows"}
          </span>
        </div>
      )}
    </div>
  );
}
