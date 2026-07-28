import { useState } from "react";
import { Link } from "react-router";
import { WebcamFeed } from "../components/WebcamFeed";
import { StemVisualizer } from "../components/StemVisualizer";
import { AudioEngineProvider } from "../contexts/AudioEngineContext";
import { useAudioEngine } from "../contexts/AudioEngineContext";
import { useHandTracking } from "../hooks/useHandTracking";
import { useGestureController } from "../hooks/useGestureController";
import { motion } from "motion/react";

function StemCollageInner() {
  const [selectedStem, setSelectedStem] = useState(0);
  const audioEngine = useAudioEngine();
  const { videoRef, overlayCanvasRef, isReady, started, start, stop, error, leftHand, rightHand } =
    useHandTracking(undefined, { showPitchZone: true });

  useGestureController({ leftHand, rightHand, selectedStem, setSelectedStem, audioEngine });

  return (
    <div className="h-screen w-full overflow-hidden relative" style={{ background: "#04050F" }}>
      {/* Lunar Sky gradient atmosphere — deep blue + hot pink */}
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
        <motion.div
          className="flex items-center justify-between flex-shrink-0"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link
            to="/"
            className="text-white/30 hover:text-white/60 text-[10px] font-mono tracking-widest uppercase transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Fourier
          </Link>
          <div className="text-center">
            <h1 className="text-sm font-medium bg-gradient-to-r from-white/90 to-white/60 bg-clip-text text-transparent tracking-widest uppercase">
              Stem Collage
            </h1>
            <p className="text-white/30 text-[10px] font-mono tracking-wider">
              hand-tracked stem player
            </p>
          </div>
          <div className="w-16" /> {/* balance the back link */}
        </motion.div>

        {/* Main content */}
        <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0">
          <div className="flex-1 lg:flex-none lg:w-[60%] min-h-0">
            <WebcamFeed
              videoRef={videoRef}
              overlayCanvasRef={overlayCanvasRef}
              isReady={isReady}
              started={started}
              error={error}
              selectedStem={selectedStem}
              selectedStemBpm={audioEngine.stems[selectedStem]?.detectedBpm ?? null}
              leftHand={leftHand}
              rightHand={rightHand}
              onStart={start}
              onStop={stop}
            />
          </div>
          <div className="flex-1 lg:flex-none lg:w-[39%] min-h-0 flex flex-col gap-3 overflow-y-auto p-0">
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
