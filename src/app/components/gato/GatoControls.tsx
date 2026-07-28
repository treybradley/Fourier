import { useRef, useState, useEffect } from "react";
import type { FeatureKey } from "./featureExtraction";

const FEATURE_OPTIONS: { key: FeatureKey; label: string }[] = [
  { key: "spectralCentroid", label: "Spectral Centroid" },
  { key: "rms",              label: "Energy (RMS)" },
  { key: "pitch",            label: "Pitch" },
  { key: "zcr",              label: "Zero Crossing Rate" },
  { key: "spectralFlatness", label: "Spectral Flatness" },
  { key: "spectralFlux",     label: "Spectral Flux" },
];

interface Props {
  fileName: string | null;
  grainCount: number;
  grainSizeMs: number;
  overlapFactor: number;
  xAxis: FeatureKey;
  yAxis: FeatureKey;
  isPlaying: boolean;
  appState: "idle" | "analyzing" | "ready";
  onFileLoaded: (buffer: AudioBuffer, name: string) => void;
  onGrainSizeChange: (v: number) => void;
  onOverlapChange: (v: number) => void;
  onXAxisChange: (v: FeatureKey) => void;
  onYAxisChange: (v: FeatureKey) => void;
  onReanalyze: () => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[9px] uppercase tracking-widest font-mono text-white/25 shrink-0">{children}</span>
      <div className="flex-1 h-px bg-white/8" />
    </div>
  );
}

function AxisSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: FeatureKey;
  onChange: (v: FeatureKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = FEATURE_OPTIONS.find((o) => o.key === value)!;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <span className="text-[9px] text-white/25 font-mono block mb-1">{label}</span>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-mono border transition-all duration-150"
        style={{
          background: open ? "rgba(173,24,136,0.12)" : "rgba(255,255,255,0.05)",
          borderColor: open ? "rgba(173,24,136,0.50)" : "rgba(255,255,255,0.10)",
          color: open ? "#FF9060" : "rgba(255,255,255,0.70)",
        }}
      >
        <span>{selected.label}</span>
        <svg
          className="w-3 h-3 shrink-0 transition-transform duration-150"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            color: open ? "#AD1888" : "rgba(255,255,255,0.3)",
          }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute z-50 left-0 right-0 mt-1 rounded-lg overflow-hidden border border-white/10 shadow-2xl"
          style={{ background: "rgba(18,6,14,0.97)", backdropFilter: "blur(20px)" }}
        >
          {FEATURE_OPTIONS.map((opt) => {
            const isSelected = opt.key === value;
            return (
              <button
                key={opt.key}
                onClick={() => { onChange(opt.key); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-[11px] font-mono transition-colors duration-100 flex items-center justify-between group"
                style={{
                  background: isSelected ? "rgba(173,24,136,0.18)" : "transparent",
                  color: isSelected ? "#FF9060" : "rgba(255,255,255,0.50)",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                  if (!isSelected) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.75)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent";
                  if (!isSelected) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.50)";
                }}
              >
                {opt.label}
                {isSelected && (
                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: "#AD1888" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function GatoControls({
  fileName,
  grainCount,
  grainSizeMs,
  overlapFactor,
  xAxis,
  yAxis,
  isPlaying,
  appState,
  onFileLoaded,
  onGrainSizeChange,
  onOverlapChange,
  onXAxisChange,
  onYAxisChange,
  onReanalyze,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);

  async function processFile(file: File) {
    setIsDecoding(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const ctx = new AudioContext();
      const buffer = await ctx.decodeAudioData(arrayBuffer);
      ctx.close();
      onFileLoaded(buffer, file.name);
    } catch {
      // ignore decode errors
    } finally {
      setIsDecoding(false);
    }
  }

  return (
    <div className="h-full flex flex-col p-4 gap-5 overflow-y-auto">

      {/* Audio */}
      <div>
        <SectionLabel>Audio</SectionLabel>
        <div
          className={[
            "h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors duration-200",
            isDragging
              ? "border-[#FF6100]/60 bg-[#FF6100]/[0.06]"
              : "border-white/15 bg-white/[0.02] hover:border-[#AD1888]/40 hover:bg-white/[0.04]",
          ].join(" ")}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) processFile(f);
          }}
        >
          {isDecoding ? (
            <>
              <div className="w-4 h-4 border-2 border-white/20 border-t-[#FF6100] rounded-full animate-spin" />
              <span className="text-[10px] text-white/30 font-mono">Decoding…</span>
            </>
          ) : fileName ? (
            <>
              <span className="text-[10px] text-white/60 font-mono truncate max-w-full px-2">{fileName}</span>
              <span className="text-[9px] text-white/25 font-mono hover:text-white/50 transition-colors">
                Click to change
              </span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span className="text-[10px] text-white/25 font-mono">Drop audio or click to browse</span>
            </>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
        />
      </div>

      {/* Corpus Analysis */}
      <div>
        <SectionLabel>Corpus Analysis</SectionLabel>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[10px] text-white/40 font-mono">Grain Size</span>
              <span className="text-[10px] text-white/50 font-mono tabular-nums">{grainSizeMs}ms</span>
            </div>
            <input
              type="range" min={30} max={500} step={10} value={grainSizeMs}
              onChange={(e) => onGrainSizeChange(Number(e.target.value))}
              className="w-full cursor-pointer"
              style={{ "--thumb-color": "#AD1888", "--track-bg": "rgba(173,24,136,0.22)" } as React.CSSProperties}
            />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[10px] text-white/40 font-mono">Overlap</span>
              <span className="text-[10px] text-white/50 font-mono tabular-nums">{Math.round(overlapFactor * 100)}%</span>
            </div>
            <input
              type="range" min={0} max={0.9} step={0.05} value={overlapFactor}
              onChange={(e) => onOverlapChange(Number(e.target.value))}
              className="w-full cursor-pointer"
              style={{ "--thumb-color": "#AD1888", "--track-bg": "rgba(173,24,136,0.22)" } as React.CSSProperties}
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-white/25 font-mono">
              {grainCount > 0 ? `${grainCount} grains` : "No corpus"}
            </span>
            <button
              onClick={onReanalyze}
              disabled={!fileName || appState === "analyzing"}
              className="text-[10px] font-mono text-white/35 hover:text-[#FF6100] disabled:text-white/15 transition-colors"
            >
              Reanalyze ↻
            </button>
          </div>
        </div>
      </div>

      {/* Axes */}
      <div>
        <SectionLabel>Axes</SectionLabel>
        <div className="space-y-3">
          <AxisSelect label="X Axis" value={xAxis} onChange={onXAxisChange} />
          <AxisSelect label="Y Axis" value={yAxis} onChange={onYAxisChange} />
        </div>
      </div>

      {/* Footer status */}
      <div className="mt-auto pt-3 border-t border-white/5">
        {isPlaying ? (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#FF6100" }} />
            <span className="text-[9px] font-mono" style={{ color: "#FF6100" }}>Playing</span>
          </div>
        ) : (
          <p className="text-[9px] font-mono text-white/20">
            {appState === "ready" ? "Hover over corpus to trigger grains" : "Upload audio to begin"}
          </p>
        )}
      </div>
    </div>
  );
}
