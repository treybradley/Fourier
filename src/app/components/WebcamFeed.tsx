import { GlassContainer } from "./GlassContainer";
import { motion } from "motion/react";
import type { ProcessedHand } from "../hooks/useHandTracking";

interface WebcamFeedProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  overlayCanvasRef: React.RefObject<HTMLCanvasElement>;
  isReady: boolean;
  started: boolean;
  error: string | null;
  selectedStem: number;
  selectedStemBpm?: number | null;
  leftHand: ProcessedHand | null;
  rightHand: ProcessedHand | null;
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
    gesture: "Pinch in zone ↕",
    action: "Pitch",
  },
  {
    color: "rose",
    hand: "L",
    gesture: "Pinch in zone ↕",
    action: "Volume",
  },
  {
    color: "emerald",
    hand: "L",
    gesture: "Open / close fist",
    action: "Pause / play",
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
  overlayCanvasRef,
  isReady,
  started,
  error,
  selectedStem,
  selectedStemBpm,
  leftHand,
  rightHand,
  onStart,
  onStop,
}: WebcamFeedProps) {
  const volumePct = leftHand ? Math.round((leftHand.pinchDistance / 50) * 100) : null;
  const pitchActive = rightHand?.isPinching && rightHand.isPinchInPitchZone;
  const pitchRatio = pitchActive ? 2.0 - rightHand!.pitchZoneNormalizedY * 1.5 : null;
  const pitchLabel = pitchActive
    ? selectedStemBpm
      ? `${Math.round(selectedStemBpm * pitchRatio!)} BPM`
      : `PITCH ${Math.round(pitchRatio! * 100)}%`
    : null;

  return (
    <GlassContainer className="relative overflow-hidden h-full">
      <div className="relative w-full h-full bg-black/60">

        {/* Live webcam video */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
          autoPlay
          muted
          playsInline
        />

        {/* Hand landmark overlay */}
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* ── Pre-start screen ─────────────────────────────── */}
        {!started && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/80 backdrop-blur-sm p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Gesture reference table */}
            <div className="w-full max-w-sm space-y-1.5">
              <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-3 text-center">
                Gesture controls
              </p>
              {GESTURES.map((g) => (
                <div
                  key={g.gesture}
                  className="flex items-center gap-3 bg-white/5 rounded px-3 py-2"
                >
                  <div className={`w-2 h-2 rounded-sm flex-shrink-0 ${DOT[g.color]}`} />
                  <span className="text-white/30 text-[10px] font-mono w-4 flex-shrink-0">
                    {g.hand}
                  </span>
                  <span className="text-white/60 text-[11px] font-mono flex-1">
                    {g.gesture}
                  </span>
                  <span className="text-white/35 text-[10px] font-mono text-right">
                    {g.action}
                  </span>
                </div>
              ))}
            </div>

            {/* Start button */}
            <motion.button
              onClick={onStart}
              className="flex items-center gap-2.5 bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/35 text-white/80 hover:text-white text-sm font-mono rounded px-6 py-3 transition-colors"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
              Enable camera
            </motion.button>
          </motion.div>
        )}

        {/* ── Loading state ────────────────────────────────── */}
        {started && !isReady && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
            <div className="w-7 h-7 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            <p className="text-white/40 text-[11px] font-mono">Loading hand tracking…</p>
          </div>
        )}

        {/* ── Error state ───────────────────────────────────── */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 p-6 text-center">
            <p className="text-red-400/80 text-sm font-mono">Camera unavailable</p>
            <p className="text-white/30 text-xs">{error}</p>
          </div>
        )}

        {/* ── Stop camera button (top-right) ──────────────────── */}
        {started && (
          <motion.button
            onClick={onStop}
            className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-sm border border-white/10 hover:border-white/25 text-white/50 hover:text-white/80 text-[10px] font-mono rounded px-2.5 py-1.5 transition-colors z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            stop camera
          </motion.button>
        )}

        {/* ── Live gesture readout (top-left) ───────────────── */}
        {isReady && (
          <div className="absolute top-3 left-3 space-y-1 pointer-events-none">
            <Chip color="amber">
              STEM {selectedStem + 1}
              {rightHand?.isPinching && !rightHand.isPinchInPitchZone ? " ← PINCH" : ""}
            </Chip>

            {leftHand && volumePct !== null && (
              <Chip color="rose">
                VOL {Math.min(200, volumePct)}%
              </Chip>
            )}

            {pitchLabel !== null && (
              <Chip color="sky">{pitchLabel}</Chip>
            )}

            {leftHand && (
              <Chip color={leftHand.isOpen ? "rose" : "emerald"}>
                {leftHand.isOpen ? "PAUSE" : "PLAY"}
              </Chip>
            )}
          </div>
        )}
      </div>
    </GlassContainer>
  );
}

function Chip({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  const dot: Record<string, string> = {
    amber: "bg-amber-400/80",
    sky: "bg-sky-400/80",
    violet: "bg-violet-400/80",
    rose: "bg-rose-400/80",
    emerald: "bg-emerald-400/80",
  };
  return (
    <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded px-2 py-1">
      <div className={`w-1.5 h-1.5 rounded-sm ${dot[color]}`} />
      <span className="text-white/80 text-[10px] font-mono">{children}</span>
    </div>
  );
}
