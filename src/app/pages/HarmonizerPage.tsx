import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "../components/ui/sonner";
import { MiniAppHeader } from "../components/MiniAppHeader";
import { HarmonizerMediaPanel } from "../components/harmonizer/HarmonizerMediaPanel";
import { HarmonizerTrackCard } from "../components/harmonizer/HarmonizerTrackCard";
import { IntervalGrid } from "../components/harmonizer/IntervalGrid";
import {
  HarmonizerProvider,
  useHarmonizer,
} from "../contexts/HarmonizerContext";
import { useHarmonizerCompositor } from "../hooks/useHarmonizerCompositor";
import { useSessionRecorder } from "../hooks/useSessionRecorder";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../components/ui/tooltip";

const tipClass =
  "border border-white/10 bg-[#0A060C] text-white/70 font-mono text-[9px] tracking-wider uppercase px-2 py-1 rounded-sm shadow-none";

function HarmonizerInner() {
  const {
    tracks,
    selectedTrack,
    setSelectedTrack,
    masterLength,
    isPlaying,
    play,
    stop,
    error,
    clearError,
    toggleVoice,
    shiftingSemitone,
    getAudioContext,
    getMasterNode,
    getLoopPhase,
  } = useHarmonizer();

  const selected = tracks[selectedTrack];
  const track0VideoUrl = tracks[0]?.videoUrl ?? null;

  useEffect(() => {
    if (!error) return;
    toast.error(error);
  }, [error]);

  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const clipVideoRef = useRef<HTMLVideoElement>(null);
  const [cameraLive, setCameraLive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const preferClip = !!track0VideoUrl;
  const mediaActive = preferClip || cameraLive;

  const { canvasRef, getCanvasStream } = useHarmonizerCompositor({
    cameraVideoRef,
    clipVideoRef,
    tracks,
    getLoopPhase,
    active: mediaActive,
    preferClip,
    isPlaying,
  });

  useEffect(() => {
    const el = clipVideoRef.current;
    if (!el) return;
    if (track0VideoUrl) {
      el.src = track0VideoUrl;
      el.load();
      el.pause();
      try {
        el.currentTime = 0;
      } catch {
        /* ignore */
      }
    } else {
      el.removeAttribute("src");
      el.load();
    }
  }, [track0VideoUrl]);

  useEffect(() => {
    const el = clipVideoRef.current;
    if (!el || !track0VideoUrl) return;
    if (isPlaying) {
      void el.play().catch(() => undefined);
    } else {
      el.pause();
      try {
        el.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
  }, [isPlaying, track0VideoUrl]);

  const stopCamera = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
    setCameraLive(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        await cameraVideoRef.current.play();
      }
      setCameraLive(true);
    } catch (err) {
      setCameraError(
        err instanceof Error ? err.message : "Camera unavailable",
      );
      setCameraLive(false);
    }
  }, []);

  useEffect(() => {
    if (preferClip && cameraLive) stopCamera();
  }, [preferClip, cameraLive, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const getVideoStream = useCallback(
    () => (mediaActive ? getCanvasStream() : null),
    [mediaActive, getCanvasStream],
  );

  const {
    isCapturing,
    isFinalizing,
    format,
    hasVideo,
    startCapture,
    stopCapture,
  } = useSessionRecorder({
    getAudioContext,
    getMasterNode,
    getVideoStream,
    fileBaseName: "harmonizer-session",
  });

  function downloadBlob(blob: Blob, ext: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `harmonizer-session.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function toggleRecord() {
    if (isCapturing) {
      const blob = await stopCapture();
      if (blob) {
        const ext = blob.type.includes("wav")
          ? "wav"
          : blob.type.includes("mp4")
            ? "mp4"
            : format;
        downloadBlob(blob, ext);
      }
      return;
    }
    getAudioContext();
    await startCapture();
  }

  const mediaMode: "clip" | "camera" | "idle" = preferClip
    ? "clip"
    : cameraLive
      ? "camera"
      : "idle";

  return (
    <div
      className="h-screen w-full overflow-hidden relative"
      style={{ background: "#0A060C" }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 65% 55% at 8% 85%, rgba(255,77,109,0.22) 0%, transparent 70%)",
            "radial-gradient(ellipse 55% 60% at 92% 15%, rgba(245,158,11,0.14) 0%, transparent 65%)",
            "radial-gradient(ellipse 35% 35% at 50% 50%, rgba(120,20,40,0.06) 0%, transparent 70%)",
          ].join(", "),
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "300px 300px",
        }}
      />

      <div className="relative h-full flex flex-col p-4 gap-4">
        <MiniAppHeader
          title="Harmonizer"
          subtitle="parallel interval stacks"
          titleClassName="bg-gradient-to-r from-white/90 to-white/60 bg-clip-text text-transparent"
          className="gap-3"
          yOffset={-20}
          right={
            <div className="flex items-center gap-2">
              {masterLength != null && (
                <span className="font-mono text-[10px] tracking-wider text-white/35 uppercase">
                  {masterLength.toFixed(2)}s
                </span>
              )}
              <button
                type="button"
                onClick={() => (isPlaying ? stop() : play())}
                className="px-3 py-1.5 rounded-sm border border-white/15 font-mono text-[10px] tracking-widest uppercase text-white/60 hover:text-white/85 hover:border-white/30 transition-colors"
              >
                {isPlaying ? "Stop" : "Play"}
              </button>
            </div>
          }
        />

        {error && (
          <button
            type="button"
            onClick={clearError}
            className="text-left font-mono text-[11px] text-red-300/90 border border-red-400/25 bg-red-500/10 px-3 py-2 rounded-sm"
          >
            {error} · dismiss
          </button>
        )}

        <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0">
          <div className="flex-1 lg:flex-none lg:w-[30%] xl:w-[28%] min-h-[220px] lg:min-h-0">
            <HarmonizerMediaPanel
              cameraVideoRef={cameraVideoRef}
              clipVideoRef={clipVideoRef}
              canvasRef={canvasRef}
              mode={mediaMode}
              cameraLive={cameraLive}
              isCapturing={isCapturing && hasVideo}
              onStartCamera={() => void startCamera()}
              onStopCamera={stopCamera}
              error={cameraError}
            />
          </div>

          <div className="flex gap-2 flex-1 min-h-0">
            <div className="shrink-0 self-start flex flex-col gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => void toggleRecord()}
                    disabled={isFinalizing}
                    className="w-9 h-9 flex items-center justify-center rounded-sm border transition-all duration-150 disabled:opacity-40"
                    style={
                      isCapturing
                        ? {
                            borderColor: "rgba(248,113,113,0.65)",
                            background: "rgba(248,113,113,0.18)",
                            color: "rgba(254,202,202,0.95)",
                          }
                        : {
                            borderColor: "rgba(255,255,255,0.12)",
                            color: "rgba(255,255,255,0.45)",
                          }
                    }
                    aria-label={
                      isCapturing
                        ? "Stop session recording"
                        : mediaActive
                          ? "Record 9:16 session"
                          : "Record session audio"
                    }
                  >
                    {isFinalizing ? (
                      <span className="w-3.5 h-3.5 border border-white/30 border-t-white/70 rounded-full animate-spin" />
                    ) : isCapturing ? (
                      <span className="w-3 h-3 rounded-[2px] bg-red-400" />
                    ) : (
                      <span className="w-3 h-3 rounded-full bg-red-400/85" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  sideOffset={8}
                  showArrow={false}
                  className={tipClass}
                >
                  {isCapturing
                    ? "Stop recording"
                    : isFinalizing
                      ? "Saving…"
                      : mediaActive
                        ? "Record 9:16 video"
                        : "Record session · WAV"}
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
              {([0, 1, 2] as const).map((id) => (
                <HarmonizerTrackCard
                  key={id}
                  trackId={id}
                  selected={selectedTrack === id}
                  onSelect={() => setSelectedTrack(id)}
                />
              ))}
            </div>

            <div className="hidden md:flex lg:w-[38%] xl:w-[36%] shrink-0 rounded-sm border border-white/10 bg-white/[0.03] p-3 flex-col gap-3 min-h-[180px] overflow-y-auto">
              <div className="font-mono text-[10px] tracking-widest uppercase text-white/45">
                Track {selectedTrack + 1} harmonies
              </div>
              {selected?.rootBuffer ? (
                <IntervalGrid
                  activeSemitones={selected.voices.map((v) => v.semitones)}
                  shiftingSemitone={
                    shiftingSemitone?.trackId === selectedTrack
                      ? shiftingSemitone.semitones
                      : null
                  }
                  onToggle={(s) => void toggleVoice(selectedTrack, s)}
                />
              ) : (
                <p className="font-mono text-[11px] text-white/30 leading-relaxed">
                  Record or upload a root on this track, then stack parallel
                  intervals. Track 1 sets the master loop length.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Mobile interval grid */}
        <div className="md:hidden rounded-sm border border-white/10 bg-white/[0.03] p-3">
          {selected?.rootBuffer ? (
            <IntervalGrid
              activeSemitones={selected.voices.map((v) => v.semitones)}
              shiftingSemitone={
                shiftingSemitone?.trackId === selectedTrack
                  ? shiftingSemitone.semitones
                  : null
              }
              onToggle={(s) => void toggleVoice(selectedTrack, s)}
            />
          ) : (
            <p className="font-mono text-[11px] text-white/30">
              Select a loaded track to stack intervals.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function HarmonizerPage() {
  return (
    <HarmonizerProvider>
      <Toaster theme="dark" />
      <HarmonizerInner />
    </HarmonizerProvider>
  );
}
