import { useState, useEffect, useRef, useCallback } from "react";
import { GranularEngine } from "./GranularEngine";
import { extractGrains, type Grain, type FeatureKey } from "./featureExtraction";
import { CorpusCanvas } from "./CorpusCanvas";
import { GatoControls } from "./GatoControls";

type AppState = "idle" | "analyzing" | "ready";

export function GatoApp() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [grains, setGrains] = useState<Grain[]>([]);
  const [activeGrainId, setActiveGrainId] = useState<number | null>(null);
  const [xAxis, setXAxis] = useState<FeatureKey>("spectralCentroid");
  const [yAxis, setYAxis] = useState<FeatureKey>("rms");
  const [grainSizeMs, setGrainSizeMs] = useState(120);
  const [overlapFactor, setOverlapFactor] = useState(0.5);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const engineRef = useRef<GranularEngine | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const activeGrainIdRef = useRef<number | null>(null);

  useEffect(() => {
    const engine = new GranularEngine();
    engineRef.current = engine;
    return () => { engine.dispose(); };
  }, []);

  const runAnalysis = useCallback(async (buffer: AudioBuffer, gsMs: number, overlap: number) => {
    setAppState("analyzing");
    setAnalysisProgress(0);
    setGrains([]);
    const result = await extractGrains(buffer, gsMs, overlap, setAnalysisProgress);
    setGrains(result);
    setAppState("ready");
  }, []);

  const handleFileLoaded = useCallback((buffer: AudioBuffer, name: string) => {
    bufferRef.current = buffer;
    engineRef.current?.setBuffer(buffer);
    setFileName(name);
    runAnalysis(buffer, grainSizeMs, overlapFactor);
  }, [grainSizeMs, overlapFactor, runAnalysis]);

  const handleReanalyze = useCallback(() => {
    if (!bufferRef.current) return;
    runAnalysis(bufferRef.current, grainSizeMs, overlapFactor);
  }, [grainSizeMs, overlapFactor, runAnalysis]);

  const handleGrainHover = useCallback((grain: Grain | null) => {
    if (grain) {
      if (grain.id === activeGrainIdRef.current) return;
      activeGrainIdRef.current = grain.id;
      setActiveGrainId(grain.id);
      engineRef.current?.playOnce(grain);
      setIsPlaying(true);
    } else {
      activeGrainIdRef.current = null;
      setActiveGrainId(null);
      setIsPlaying(false);
    }
  }, []);

  const handleGrainClick = useCallback((grain: Grain) => {
    engineRef.current?.playOnce(grain);
    setActiveGrainId(grain.id);
    setTimeout(() => setActiveGrainId(null), 500);
  }, []);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-[11px]">
        {/* Controls — fixed width left panel */}
        <div
          className="w-full lg:w-[330px] shrink-0 lg:h-full rounded-[15px] overflow-hidden"
          style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(8px)" }}
        >
          <GatoControls
            fileName={fileName}
            grainCount={grains.length}
            grainSizeMs={grainSizeMs}
            overlapFactor={overlapFactor}
            xAxis={xAxis}
            yAxis={yAxis}
            isPlaying={isPlaying}
            appState={appState}
            onFileLoaded={handleFileLoaded}
            onGrainSizeChange={setGrainSizeMs}
            onOverlapChange={setOverlapFactor}
            onXAxisChange={setXAxis}
            onYAxisChange={setYAxis}
            onReanalyze={handleReanalyze}
          />
        </div>

        {/* Canvas — fills remaining space */}
        <div className="flex-1 min-w-0 h-64 lg:h-full rounded-[15px] overflow-hidden" style={{ background: "#0D050A" }}>
          <CorpusCanvas
            grains={grains}
            xAxis={xAxis}
            yAxis={yAxis}
            activeGrainId={activeGrainId}
            cursorPos={null}
            onGrainHover={handleGrainHover}
            onGrainClick={handleGrainClick}
            appState={appState}
            analysisProgress={analysisProgress}
          />
        </div>
      </div>
    </div>
  );
}
