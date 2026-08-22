import { useCallback, useEffect, useState } from "react";
import { WebcamFeed } from "../components/WebcamFeed";
import { StemVisualizer } from "../components/StemVisualizer";
import { MiniAppHeader } from "../components/MiniAppHeader";
import { AudioEngineProvider } from "../contexts/AudioEngineContext";
import { useAudioEngine } from "../contexts/AudioEngineContext";
import { useHandTracking } from "../hooks/useHandTracking";
import { useGestureController } from "../hooks/useGestureController";
import { useStemCompositor } from "../hooks/useStemCompositor";
import { useSessionRecorder } from "../hooks/useSessionRecorder";
import { EXPORT_ASPECT } from "../utils/exportFormat";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../components/ui/tooltip";
import { motion } from "motion/react";
import { useVisualMode } from "../hooks/useVisualMode";

const tipClass =
  "border border-white/10 bg-[#04050F] text-white/70 font-mono text-[9px] tracking-wider uppercase px-2 py-1 rounded-sm shadow-none";

function StemCollageInner() {
  const [selectedStem, setSelectedStem] = useState(0);
  const [handControl, setHandControl] = useState(false);
  const audioEngine = useAudioEngine();
  const { mono, ink, inkFg } = useVisualMode();

  const {
    videoRef,
    isReady,
    started,
    start,
    stop,
    error,
    leftHand,
    rightHand,
  } = useHandTracking(undefined, { frameAspect: EXPORT_ASPECT });

  const cameraLive = handControl && started && !error;

  const { canvasRef, getCanvasStream } = useStemCompositor({
    videoRef,
    stems: audioEngine.stems,
    selectedStem,
    leftHand,
    rightHand,
    active: cameraLive,
  });

  useGestureController({
    leftHand,
    rightHand,
    selectedStem,
    setSelectedStem,
    audioEngine,
    enabled: cameraLive,
  });

  const getVideoStream = useCallback(
    () => (cameraLive ? getCanvasStream() : null),
    [cameraLive, getCanvasStream],
  );

  const {
    isCapturing,
    isFinalizing,
    format,
    hasVideo,
    startCapture,
    stopCapture,
  } = useSessionRecorder({
    getAudioContext: audioEngine.getAudioContext,
    getMasterNode: audioEngine.getMasterNode,
    getVideoStream,
    fileBaseName: "stem-collage-session",
  });

  // Keys 1–4 → jump to cue markers on the selected stem
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }
      const n = Number(e.key);
      if (n < 1 || n > 4) return;
      e.preventDefault();
      const markerIndex = n - 1;
      const markers = audioEngine.stems[selectedStem]?.markers;
      if (markers?.[markerIndex]) {
        audioEngine.seekToMarker(selectedStem, markerIndex);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [audioEngine, selectedStem]);

  function downloadBlob(blob: Blob, ext: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stem-collage-session.${ext}`;
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
    // Ensure master bus exists before arming
    audioEngine.getAudioContext();
    await startCapture();
  }

  async function exitHandControl() {
    if (isCapturing && hasVideo) {
      const blob = await stopCapture();
      if (blob) {
        const ext = blob.type.includes("wav")
          ? "wav"
          : blob.type.includes("mp4")
            ? "mp4"
            : format;
        downloadBlob(blob, ext);
      }
    }
    stop();
    setHandControl(false);
  }

  function toggleHandControl() {
    if (handControl) {
      void exitHandControl();
    } else {
      setHandControl(true);
    }
  }

  async function handleStopCamera() {
    if (isCapturing && hasVideo) {
      const blob = await stopCapture();
      if (blob) {
        const ext = blob.type.includes("wav")
          ? "wav"
          : blob.type.includes("mp4")
            ? "mp4"
            : format;
        downloadBlob(blob, ext);
      }
    }
    stop();
  }

  const videoMode = cameraLive;
  const canCapture = !isFinalizing;

  return (
    <div
      className="app-page h-screen w-full overflow-hidden relative"
      style={{ background: "#04050F" }}
    >
      <div
        className="app-atmosphere pointer-events-none absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 65% 55% at 8% 85%, rgba(0,89,206,0.28) 0%, transparent 70%)",
            "radial-gradient(ellipse 55% 60% at 92% 15%, rgba(255,100,227,0.22) 0%, transparent 65%)",
            "radial-gradient(ellipse 35% 35% at 50% 50%, rgba(80,0,180,0.06) 0%, transparent 70%)",
          ].join(", "),
        }}
      />
      <div
        className="app-grain pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "300px 300px",
        }}
      />
      <div className="relative h-full flex flex-col p-4 gap-4">
        <MiniAppHeader
          title="Stem Collage"
          subtitle="multi-stem player"
          titleClassName="bg-gradient-to-r from-white/90 to-white/60 bg-clip-text text-transparent"
          className="gap-3"
          yOffset={-20}
        />

        <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0">
          {handControl && (
            <div className="flex-1 lg:flex-none lg:w-[32%] xl:w-[30%] min-h-[260px] lg:min-h-0">
              <WebcamFeed
                videoRef={videoRef}
                canvasRef={canvasRef}
                isReady={isReady}
                started={started}
                error={error}
                isCapturing={isCapturing && hasVideo}
                onStart={start}
                onStop={() => void handleStopCamera()}
              />
            </div>
          )}

          <div
            className={`min-h-0 flex gap-2 ${
              handControl
                ? "flex-1 lg:flex-none lg:w-[66%] xl:w-[68%]"
                : "flex-1 w-full"
            }`}
          >
            {/* Rec + Hand control rail */}
            <div className="shrink-0 self-start flex flex-col gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => void toggleRecord()}
                    disabled={!canCapture}
                    className="w-9 h-9 flex items-center justify-center rounded-sm border transition-all duration-150 disabled:opacity-40"
                    style={
                      isCapturing
                        ? {
                            borderColor: "rgba(248,113,113,0.65)",
                            background: "rgba(248,113,113,0.18)",
                            color: "rgba(254,202,202,0.95)",
                          }
                        : {
                            borderColor: ink(0.3),
                            background: mono ? "rgba(0,0,0,0.06)" : "transparent",
                            color: inkFg(0.75),
                          }
                    }
                    aria-label={
                      isCapturing
                        ? "Stop session recording"
                        : videoMode
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
                      : videoMode
                        ? "Record 9:16 video"
                        : "Record session · WAV"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={toggleHandControl}
                    className="w-9 h-9 flex items-center justify-center rounded-sm border transition-all duration-150"
                    style={
                      handControl
                        ? {
                            borderColor: mono
                              ? "rgba(0,0,0,0.55)"
                              : "rgba(255,100,227,0.55)",
                            background: mono
                              ? "rgba(0,0,0,0.12)"
                              : "rgba(255,100,227,0.14)",
                            color: mono
                              ? "rgba(17,17,17,0.95)"
                              : "rgba(255,180,240,0.95)",
                          }
                        : {
                            borderColor: ink(0.3),
                            background: mono ? "rgba(0,0,0,0.06)" : "transparent",
                            color: inkFg(0.75),
                          }
                    }
                    aria-label={
                      handControl ? "Exit hand control" : "Hand control"
                    }
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
                      />
                    </svg>
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  sideOffset={8}
                  showArrow={false}
                  className={tipClass}
                >
                  {handControl ? "Exit hand control" : "Hand control"}
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-3 overflow-y-auto p-0">
              {[1, 2, 3, 4].map((num, index) => (
                <StemVisualizer
                  key={num}
                  stemIndex={index}
                  stemNumber={num}
                  isSelected={selectedStem === index}
                  onSelect={() => setSelectedStem(index)}
                />
              ))}
            </div>
          </div>
        </div>

        <p className="flex-shrink-0 text-white/45 text-[8px] font-mono tracking-wider">
          Keys 1–4: jump to cues on selected stem
          {handControl
            ? " · Pitch / volume bands at bottom · Pinch outside band to switch stem"
            : " · Rec captures stems as WAV (enable Hand control for 9:16 video)"}
        </p>
      </div>
    </div>
  );
}

export function StemCollagePage() {
  return (
    <AudioEngineProvider>
      <StemCollageInner />
    </AudioEngineProvider>
  );
}
