import { motion } from "motion/react";
import { EXPORT_HEIGHT, EXPORT_WIDTH } from "../../utils/exportFormat";

interface LooperCameraProps {
  videoRef: React.Ref<HTMLVideoElement>;
  canvasRef: React.Ref<HTMLCanvasElement>;
  started: boolean;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
  isCapturing?: boolean;
}

export function LooperCamera({
  videoRef,
  canvasRef,
  started,
  error,
  onStart,
  onStop,
  isCapturing,
}: LooperCameraProps) {
  const aspectRatio = `${EXPORT_WIDTH} / ${EXPORT_HEIGHT}`;

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="relative flex-1 min-h-0 flex items-center justify-center rounded-sm border border-white/8 bg-black/60 overflow-hidden p-2">
        {/* Hidden source video for compositor */}
        <video
          ref={videoRef as React.RefObject<HTMLVideoElement>}
          className="absolute w-px h-px opacity-0 pointer-events-none"
          autoPlay
          muted
          playsInline
        />

        {/* Vertical export-matched preview */}
        <div
          className="relative h-full max-w-full mx-auto"
          style={{ aspectRatio }}
        >
          <canvas
            ref={canvasRef as React.RefObject<HTMLCanvasElement>}
            className="absolute inset-0 w-full h-full rounded-sm bg-[#030810]"
          />

          {!started && (
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/85 backdrop-blur-sm p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-center space-y-1">
                <p className="text-white/50 text-[10px] font-mono tracking-widest uppercase">
                  Record video
                </p>
                <p className="text-white/40 text-[9px] font-mono max-w-[14rem]">
                  Capture 9:16 video, or record the session as WAV with the
                  camera off
                </p>
              </div>

              <motion.button
                type="button"
                onClick={onStart}
                className="flex items-center gap-2 bg-white/8 hover:bg-white/12 border border-white/15 hover:border-white/30 text-white/60 hover:text-white/85 text-[11px] font-mono tracking-widest uppercase rounded-sm px-4 py-2.5 transition-colors"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Enable camera
              </motion.button>
            </motion.div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 p-4 text-center">
              <p className="text-red-400/70 text-xs font-mono">
                Camera unavailable
              </p>
              <p className="text-white/25 text-[10px]">{error}</p>
            </div>
          )}

          {started && !error && (
            <div className="absolute top-2 right-2 z-10">
              <motion.button
                type="button"
                onClick={onStop}
                className="flex items-center gap-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-sm border border-white/10 hover:border-white/20 text-white/40 hover:text-white/70 text-[9px] font-mono rounded-sm px-2 py-1 transition-colors"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                off
              </motion.button>
            </div>
          )}

          {isCapturing && (
            <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm border border-red-400/30 rounded-sm px-2 py-1">
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
