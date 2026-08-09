import { useEffect, useState } from "react";
import { Link } from "react-router";
import { WebcamFeed } from "../components/WebcamFeed";
import { StemVisualizer } from "../components/StemVisualizer";
import { AudioEngineProvider } from "../contexts/AudioEngineContext";
import { useAudioEngine } from "../contexts/AudioEngineContext";
import { useHandTracking } from "../hooks/useHandTracking";
import { useGestureController } from "../hooks/useGestureController";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../components/ui/tooltip";
import { motion } from "motion/react";

const tipClass =
  "border border-white/10 bg-[#04050F] text-white/70 font-mono text-[9px] tracking-wider uppercase px-2 py-1 rounded-sm shadow-none";

function StemCollageInner() {
  const [selectedStem, setSelectedStem] = useState(0);
  const [handControl, setHandControl] = useState(false);
  const audioEngine = useAudioEngine();
  const {
    videoRef,
    overlayCanvasRef,
    isReady,
    started,
    start,
    stop,
    error,
    leftHand,
    rightHand,
  } = useHandTracking(undefined, { showPitchZone: true });

  useGestureController({
    leftHand,
    rightHand,
    selectedStem,
    setSelectedStem,
    audioEngine,
    enabled: handControl && started,
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

  function toggleHandControl() {
    if (handControl) {
      stop();
      setHandControl(false);
    } else {
      setHandControl(true);
    }
  }

  function handleStopCamera() {
    stop();
  }

  return (
    <div
      className="h-screen w-full overflow-hidden relative"
      style={{ background: "#04050F" }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 65% 55% at 8% 85%, rgba(0,89,206,0.28) 0%, transparent 70%)",
            "radial-gradient(ellipse 55% 60% at 92% 15%, rgba(255,100,227,0.22) 0%, transparent 65%)",
            "radial-gradient(ellipse 35% 35% at 50% 50%, rgba(80,0,180,0.06) 0%, transparent 70%)",
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
        <motion.div
          className="flex items-center justify-between flex-shrink-0 gap-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link
            to="/"
            className="text-white/30 hover:text-white/60 text-[10px] font-mono tracking-widest uppercase transition-colors flex items-center gap-1.5 shrink-0"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Fourier
          </Link>
          <div className="text-center min-w-0">
            <h1 className="text-sm font-medium bg-gradient-to-r from-white/90 to-white/60 bg-clip-text text-transparent tracking-widest uppercase">
              Stem Collage
            </h1>
            <p className="text-white/30 text-[10px] font-mono tracking-wider">
              multi-stem player
            </p>
          </div>
          <div className="w-16 shrink-0" />
        </motion.div>

        <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0">
          {handControl && (
            <div className="flex-1 lg:flex-none lg:w-[60%] min-h-[220px] lg:min-h-0">
              <WebcamFeed
                videoRef={videoRef}
                overlayCanvasRef={overlayCanvasRef}
                isReady={isReady}
                started={started}
                error={error}
                selectedStem={selectedStem}
                selectedStemBpm={
                  audioEngine.stems[selectedStem]?.detectedBpm ?? null
                }
                leftHand={leftHand}
                rightHand={rightHand}
                onStart={start}
                onStop={handleStopCamera}
              />
            </div>
          )}

          <div
            className={`min-h-0 flex gap-2 ${
              handControl
                ? "flex-1 lg:flex-none lg:w-[39%]"
                : "flex-1 w-full"
            }`}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleHandControl}
                  className="shrink-0 self-start w-15 h-15 flex items-center justify-center rounded-sm border transition-all duration-150"
                  style={
                    handControl
                      ? {
                          borderColor: "rgba(255,100,227,0.55)",
                          background: "rgba(255,100,227,0.14)",
                          color: "rgba(255,180,240,0.95)",
                        }
                      : {
                          borderColor: "rgba(255,255,255,0.12)",
                          color: "rgba(255,255,255,0.45)",
                        }
                  }
                  aria-label={
                    handControl ? "Exit hand control" : "Hand control"
                  }
                >
                  <svg
                    className="w-6 h-6"
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

        <p className="flex-shrink-0 text-white/20 text-[8px] font-mono tracking-wider">
          Keys 1–4: jump to cues on selected stem
          {handControl
            ? " · Pinch / zones: pitch, volume, switch stem, play/pause"
            : ""}
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
