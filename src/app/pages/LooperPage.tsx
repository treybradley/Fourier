import { useCallback } from "react";
import { motion } from "motion/react";
import { Mic, MicOff } from "lucide-react";
import {
  LooperProvider,
  useLooper,
} from "../contexts/LooperContext";
import { LoopTrack } from "../components/looper/LoopTrack";
import { LooperCamera } from "../components/looper/LooperCamera";
import { MiniAppHeader } from "../components/MiniAppHeader";
import { useCamera } from "../hooks/useCamera";
import { useSessionRecorder } from "../hooks/useSessionRecorder";
import { useLooperCompositor } from "../hooks/useLooperCompositor";

function LooperInner() {
  const {
    tracks,
    selectedTrack,
    masterLength,
    masterBpm,
    isListening,
    error: audioError,
    startListening,
    stopListening,
    setSelectedTrack,
    getAudioContext,
    getMasterNode,
    getMicSourceNode,
  } = useLooper();

  const {
    videoRef,
    started,
    error: cameraError,
    start: startCamera,
    stop: stopCamera,
  } = useCamera();

  const { canvasRef, getCanvasStream } = useLooperCompositor({
    videoRef,
    tracks,
    masterBpm,
    masterLength,
    active: started && !cameraError,
  });

  const cameraLive = started && !cameraError;
  const getVideoStream = useCallback(
    () => (cameraLive ? getCanvasStream() : null),
    [cameraLive, getCanvasStream],
  );
  const getExtraAudioNodes = useCallback(
    () => [getMicSourceNode()],
    [getMicSourceNode],
  );

  const {
    isCapturing,
    isFinalizing,
    captureBlob,
    format,
    hasVideo,
    startCapture,
    stopCapture,
    download,
  } = useSessionRecorder({
    getAudioContext,
    getMasterNode,
    getVideoStream,
    getExtraAudioNodes,
    fileBaseName: "loop-session",
  });

  const start = useCallback(async () => {
    await startCamera();
  }, [startCamera]);

  // Turning the camera off mid-video-capture ends the take rather than
  // silently switching to audio (the video track would freeze).
  const stop = useCallback(() => {
    if (isCapturing && hasVideo) stopCapture();
    stopCamera();
  }, [isCapturing, hasVideo, stopCapture, stopCamera]);

  const selectedStatus = tracks[selectedTrack]?.status;
  const isRecording =
    selectedStatus === "recording" ||
    selectedStatus === "overdubbing";
  const canCapture = isListening && !!getMasterNode();

  return (
    <div
      className="h-screen w-full overflow-hidden relative"
      style={{ background: "#030810" }}
    >
      {/* Surge gradient atmosphere */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 60% 55% at 90% 85%, rgba(0,235,184,0.20) 0%, transparent 70%)",
            "radial-gradient(ellipse 55% 60% at 10% 15%, rgba(0,48,197,0.26) 0%, transparent 68%)",
            "radial-gradient(ellipse 35% 35% at 50% 50%, rgba(0,80,120,0.06) 0%, transparent 70%)",
          ].join(", "),
        }}
      />
      {/* Grain noise */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "300px 300px",
        }}
      />
      <div className="relative h-full flex flex-col p-4 gap-4">
        {/* Header */}
        <MiniAppHeader
          title="Loop Station"
          subtitle="multi-track looper"
          right={
            <>
              {masterBpm && (
                <div className="text-right">
                  <div className="text-white/70 text-sm font-mono font-medium">
                    {masterBpm}
                  </div>
                  <div className="text-white/25 text-[9px] font-mono tracking-wider">
                    BPM EST
                  </div>
                </div>
              )}
              {masterLength && (
                <div className="text-right">
                  <div className="text-white/70 text-sm font-mono font-medium">
                    {masterLength.toFixed(2)}s
                  </div>
                  <div className="text-white/25 text-[9px] font-mono tracking-wider">
                    LOOP LEN
                  </div>
                </div>
              )}
            </>
          }
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
          {/* Left: controls + camera */}
          <div className="flex-shrink-0 lg:w-90 flex flex-col gap-3 min-h-0">
            {/* Mic + session record */}
            <div className="flex items-stretch gap-2 flex-shrink-0">
              <motion.button
                className={`
                  flex-1 min-w-0 flex items-center justify-center gap-2 py-3 rounded-sm border font-mono text-xs tracking-widest uppercase transition-all
                  ${
                    isListening
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300/80 hover:bg-emerald-500/20"
                      : "bg-white/5 border-white/15 text-white/50 hover:bg-white/8 hover:border-white/25"
                  }
                `}
                onClick={() =>
                  isListening ? stopListening() : startListening()
                }
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isListening ? (
                  <Mic className="w-3.5 h-3.5" />
                ) : (
                  <MicOff className="w-3.5 h-3.5" />
                )}
                {isListening ? "Mic on" : "Enable mic"}
              </motion.button>

              {!isCapturing ? (
                <motion.button
                  type="button"
                  disabled={!canCapture || isFinalizing}
                  onClick={() => void startCapture()}
                  className="flex-1 min-w-0 flex items-center justify-center gap-1.5 py-3 rounded-sm border font-mono text-xs tracking-widest uppercase transition-all disabled:opacity-35 disabled:cursor-not-allowed bg-white/5 border-white/15 text-white/50 hover:bg-white/8 hover:border-white/25 hover:text-white/80"
                  whileHover={canCapture ? { scale: 1.02 } : undefined}
                  whileTap={canCapture ? { scale: 0.98 } : undefined}
                  title={
                    !canCapture
                      ? "Enable mic first"
                      : started && !cameraError
                        ? "Record 9:16 video + loops + mic"
                        : "Record loops + mic as WAV (enable camera for video)"
                  }
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400/85" />
                  {isFinalizing
                    ? "…"
                    : started && !cameraError
                      ? "Rec · 9:16"
                      : "Rec · wav"}
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  onClick={() => void stopCapture()}
                  className="flex-1 min-w-0 flex items-center justify-center gap-1.5 py-3 rounded-sm border font-mono text-xs tracking-widest uppercase transition-all bg-red-500/20 border-red-400/40 text-red-200/90 hover:bg-red-500/30"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  Stop
                </motion.button>
              )}

              {captureBlob && !isCapturing && (
                <motion.button
                  type="button"
                  onClick={download}
                  className="flex items-center justify-center px-2.5 py-3 rounded-sm border font-mono text-[10px] tracking-wider uppercase transition-all bg-white/5 border-white/15 text-white/55 hover:bg-white/8 hover:border-white/25 hover:text-white/80"
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  title={`Save .${format}`}
                >
                  Save
                </motion.button>
              )}
            </div>

            {audioError && (
              <p className="text-red-400/70 text-[10px] font-mono text-center flex-shrink-0">
                {audioError}
              </p>
            )}

            {/* Controls reference */}
            <div className="space-y-1.5 border border-white/5 rounded-sm p-3 flex-shrink-0">
              <p className="text-white/20 text-[9px] font-mono tracking-widest uppercase mb-2">
                Controls
              </p>
              {[
                { key: "Space", action: "Record / stop" },
                { key: "Keys 1-5", action: "Select track" },
              ].map(({ key, action }) => (
                <div
                  key={key}
                  className="flex items-center justify-between"
                >
                  <span className="text-white/40 text-[9px] font-mono">
                    {key}
                  </span>
                  <span className="text-white/20 text-[9px] font-mono">
                    {action}
                  </span>
                </div>
              ))}
            </div>

            {/* Camera panel */}
            <div
              className="flex-1 min-h-0"
              style={{ minHeight: "220px" }}
            >
              <LooperCamera
                videoRef={videoRef}
                canvasRef={canvasRef}
                started={started}
                error={cameraError}
                onStart={start}
                onStop={stop}
                isCapturing={isCapturing}
              />
            </div>
          </div>

          {/* Right: tracks */}
          <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto pt-1 lg:pt-0">
            {tracks.map((track) => (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: track.id * 0.05 }}
              >
                <LoopTrack
                  track={track}
                  isSelected={selectedTrack === track.id}
                  onSelect={() => setSelectedTrack(track.id)}
                />
              </motion.div>
            ))}

            {!isListening && (
              <p className="text-center text-white/40 text-[10px] font-mono mt-4">
                Enable mic to start recording audio. Use headphones to avoid feedback while recording.
              </p>
            )}

            {isListening && (
              <motion.p
                className="text-center text-white/40 text-[10px] font-mono mt-2"
                animate={{ opacity: [0.3, 0.9, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                {isRecording
                  ? "Recording… press Space or usb foot pedal to stop"
                  : "Select a track — press Space or usb foot pedalto record"}
              </motion.p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LooperPage() {
  return (
    <LooperProvider>
      <LooperInner />
    </LooperProvider>
  );
}
