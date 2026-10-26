import { useEffect, useMemo, useState } from "react";
import { Waveform } from "../../components/Waveform";
import {
  ArcEqBands,
  ChromaAverageBars,
  ChromagramOverTime,
} from "../../components/arc/PitchClassViz";
import { analyzeAudioBuffer } from "../../hooks/useArcAnalyzer";
import {
  STEM_COLORS,
  STEM_LABELS,
  STEM_NAMES,
  type StemName,
} from "../../hooks/useStemSeparator";
import { useVisualMode } from "../../hooks/useVisualMode";
import { createDemoBuffer } from "./demoAudio";
import { PitchZoomControls } from "./PitchZoomControls";
import { Block, Section } from "./shared";

const ARC_ACCENT = "#EB00F7";
const ARC_ACCENT2 = "#009DFF";

function PitchZoomDemo({
  buffer,
  duration,
}: {
  buffer: AudioBuffer | null;
  duration: number;
}) {
  const [pitch, setPitch] = useState(1);
  const mid = duration / 2;

  return (
    <div className="space-y-3 max-w-xl">
      <PitchZoomControls pitch={pitch} onChange={setPitch} />
      <Waveform
        audioBuffer={buffer}
        isPlaying={false}
        currentTime={mid}
        duration={duration}
        pitch={pitch}
        isSelected
        markers={[{ id: "c1", time: mid * 0.35 }]}
        onSeek={() => {}}
        onMarkerClick={() => {}}
      />
      <p className="text-[11px] text-white/35 leading-relaxed max-w-lg">
        − zooms out (wider path), + zooms in (skinnier). Same mapping as Collage
        pitch: path width = 300 / pitch, playhead stays centered.
      </p>
    </div>
  );
}

function StemSourcesDemo() {
  const { mono, inkFg } = useVisualMode();
  const [selected, setSelected] = useState<Record<StemName, boolean>>({
    vocals: true,
    drums: true,
    bass: true,
    other: true,
  });

  // Demo envelopes — distinct silhouettes so each source reads differently.
  const envelopes: Record<StemName, number[]> = {
    vocals: [0.2, 0.55, 0.7, 0.45, 0.8, 0.6, 0.35, 0.5, 0.75, 0.4, 0.25, 0.15],
    drums: [0.9, 0.15, 0.85, 0.2, 0.9, 0.18, 0.7, 0.25, 0.95, 0.12, 0.8, 0.2],
    bass: [0.55, 0.6, 0.5, 0.65, 0.45, 0.7, 0.55, 0.6, 0.5, 0.68, 0.48, 0.55],
    other: [0.3, 0.4, 0.55, 0.35, 0.6, 0.45, 0.5, 0.38, 0.55, 0.42, 0.35, 0.28],
  };

  return (
    <div className="space-y-4 max-w-xl">
      <p className="text-[11px] text-white/35 leading-relaxed">
        Separator isolates four Demucs sources in the browser. Toggle which
        models to run; result rails keep the same color language as Collage.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {STEM_NAMES.map((stem) => {
          const on = selected[stem];
          const color = mono ? "#111111" : STEM_COLORS[stem];
          return (
            <button
              key={stem}
              type="button"
              onClick={() =>
                setSelected((prev) => ({ ...prev, [stem]: !prev[stem] }))
              }
              className="flex items-center gap-2 px-3 py-2.5 rounded-sm border text-left transition-all"
              style={{
                borderColor: on
                  ? mono
                    ? "rgba(0,0,0,0.45)"
                    : `${color}66`
                  : mono
                    ? "rgba(0,0,0,0.18)"
                    : "rgba(255,255,255,0.10)",
                background: on
                  ? mono
                    ? "rgba(0,0,0,0.08)"
                    : `${color}14`
                  : mono
                    ? "rgba(0,0,0,0.03)"
                    : "rgba(255,255,255,0.02)",
              }}
            >
              <span
                className="w-3.5 h-3.5 rounded-[2px] border flex items-center justify-center shrink-0"
                style={{
                  borderColor: on
                    ? color
                    : mono
                      ? "rgba(0,0,0,0.35)"
                      : "rgba(255,255,255,0.25)",
                  background: on ? color : "transparent",
                }}
              >
                {on ? (
                  <svg
                    className="w-2.5 h-2.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={mono ? "#fff" : "#04050F"}
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : null}
              </span>
              <span
                className="text-[10px] font-mono tracking-widest uppercase"
                style={{ color: on ? inkFg(0.85) : inkFg(0.45) }}
              >
                {STEM_LABELS[stem]}
              </span>
            </button>
          );
        })}
      </div>
      <div className="space-y-2">
        {STEM_NAMES.filter((s) => selected[s]).map((stem) => {
          const color = mono ? "#111111" : STEM_COLORS[stem];
          const peaks = envelopes[stem];
          return (
            <div
              key={stem}
              className="rounded-sm border border-white/10 px-3 py-2 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-[9px] font-mono tracking-widest uppercase"
                  style={{ color }}
                >
                  {STEM_LABELS[stem]}
                </span>
                <span className="text-[8px] font-mono text-white/25">
                  source · Demucs
                </span>
              </div>
              <div className="flex items-end gap-0.5 h-8">
                {peaks.map((v, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-[1px] min-w-0"
                    style={{
                      height: `${Math.max(12, v * 100)}%`,
                      background: color,
                      opacity: mono ? 0.55 : 0.75,
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[9px] font-mono text-white/25 tracking-wide">
        STEM_NAMES · STEM_LABELS · STEM_COLORS — useStemSeparator
      </p>
    </div>
  );
}

function ArcPeakWaveform({ peaks }: { peaks: number[] }) {
  const pathD = peaks
    .map((v, i) => {
      const x = (i / Math.max(1, peaks.length - 1)) * 100;
      const h = Math.max(0.04, v) * 0.5;
      return `M${x},${50 - h * 100} L${x},${50 + h * 100}`;
    })
    .join(" ");

  return (
    <div className="h-14 rounded-sm border border-white/10 bg-black/20 overflow-hidden">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="block"
      >
        <path
          d={pathD}
          stroke={ARC_ACCENT2}
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

function rootPitchClass(key: string | null): number | null {
  if (!key) return null;
  const base = key.replace(/m$/, "");
  const map: Record<string, number> = {
    C: 0,
    "C#": 1,
    Db: 1,
    D: 2,
    Eb: 3,
    "D#": 3,
    E: 4,
    F: 5,
    "F#": 6,
    Gb: 6,
    G: 7,
    Ab: 8,
    "G#": 8,
    A: 9,
    Bb: 10,
    "A#": 10,
    B: 11,
  };
  return map[base] ?? null;
}

export function SignalSection() {
  const { mono, ink, inkFg } = useVisualMode();
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [pitchView, setPitchView] = useState<"average" | "overtime">("average");

  useEffect(() => {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AC();
    setBuffer(createDemoBuffer(ctx, 6));
    return () => {
      void ctx.close();
    };
  }, []);

  const analysis = useMemo(
    () => (buffer ? analyzeAudioBuffer(buffer) : null),
    [buffer],
  );

  const duration = buffer?.duration ?? 6;
  const rootPc = analysis ? rootPitchClass(analysis.key) : null;
  const barPeaks = analysis?.waveform
    ? (() => {
        const src = analysis.waveform;
        const bars = 48;
        const step = Math.max(1, Math.floor(src.length / bars));
        const out: number[] = [];
        for (let i = 0; i < bars; i++) {
          let peak = 0;
          for (let j = 0; j < step; j++) {
            peak = Math.max(peak, src[i * step + j] ?? 0);
          }
          out.push(peak);
        }
        return out;
      })()
    : Array.from({ length: 48 }, () => 0.08);

  return (
    <Section
      title="Signal surfaces"
      lead="Stem waveforms with pitch zoom, peak envelopes, and Arc analysis—chromagrams, key, and EQ bands from the same browser DSP path."
    >
      <Block
        title="Stem waveform · pitch zoom"
        description="Production Waveform from AudioBuffer RMS. Pitch remaps path width so the stem zooms in/out under a fixed playhead."
        why="Collage playback pitch doubles as visual zoom without a separate scrubber scale."
        source="Waveform.tsx · useWaveform · AudioControls pitch"
      >
        <PitchZoomDemo buffer={buffer} duration={duration} />
      </Block>

      <Block
        title="Peak strip"
        description="Compact bar envelope used in Harmonizer / Looper rails—peak buckets, not RMS zig-zag."
        source="HarmonizerTrackCard · Looper WaveformDisplay"
      >
        <div className="flex items-end gap-0.5 h-12 max-w-md rounded-sm border border-white/10 bg-black/20 px-2 py-1.5">
          {barPeaks.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-[1px] bg-white/50 min-w-0"
              style={{
                height: `${Math.max(8, v * 100)}%`,
                background: mono ? "rgba(17,17,17,0.55)" : undefined,
              }}
            />
          ))}
        </div>
      </Block>

      <Block
        title="Arc peak waveform"
        description="Arc track cards draw a peak amplitude envelope (computeWaveform) — classic DAW silhouette for scrubbing."
        source="useArcAnalyzer · TrackCard MiniWaveform"
      >
        <div className="max-w-xl space-y-2">
          {analysis ? (
            <ArcPeakWaveform peaks={analysis.waveform} />
          ) : (
            <div className="h-14 rounded-sm border border-dashed border-white/15 grid place-items-center text-[10px] font-mono text-white/30">
              Analyzing…
            </div>
          )}
        </div>
      </Block>

      <Block
        title="Arc pitch classes"
        description="12-bin chroma average (HPS, energy-weighted) with Average ↔ Over time chromagram frames across the track."
        source="PitchClassViz.tsx · useArcAnalyzer · TrackCard"
      >
        {analysis ? (
          <div className="space-y-3 max-w-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-mono text-white/25 uppercase tracking-wider">
                  Pitch classes
                </span>
                <div className="flex items-center rounded-sm border border-white/15 p-0.5">
                  <button
                    type="button"
                    onClick={() => setPitchView("average")}
                    className="px-2 py-1 text-[9px] font-mono rounded-[2px] transition-colors"
                    style={{
                      color:
                        pitchView === "average"
                          ? mono
                            ? "#ffffff"
                            : inkFg(0.9)
                          : inkFg(0.55),
                      background:
                        pitchView === "average"
                          ? mono
                            ? "#111111"
                            : ink(0.1)
                          : "transparent",
                    }}
                  >
                    Average
                  </button>
                  <button
                    type="button"
                    onClick={() => setPitchView("overtime")}
                    className="px-2 py-1 text-[9px] font-mono rounded-[2px] transition-colors"
                    style={{
                      color:
                        pitchView === "overtime"
                          ? mono
                            ? "#ffffff"
                            : inkFg(0.9)
                          : inkFg(0.55),
                      background:
                        pitchView === "overtime"
                          ? mono
                            ? "#111111"
                            : ink(0.1)
                          : "transparent",
                    }}
                  >
                    Over time
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <span style={{ color: ARC_ACCENT }}>
                  {analysis.key} · {analysis.camelot}
                </span>
                <span className="text-white/30">{analysis.bpm} BPM</span>
              </div>
            </div>
            {pitchView === "overtime" ? (
              <ChromagramOverTime
                frames={analysis.chromaFrames}
                rootPc={rootPc}
                duration={analysis.duration}
              />
            ) : (
              <ChromaAverageBars
                chroma={analysis.chroma}
                rootPc={rootPc}
                detectedKey={analysis.key}
                camelot={analysis.camelot}
              />
            )}
          </div>
        ) : (
          <div className="h-32 rounded-sm border border-dashed border-white/15 grid place-items-center text-[10px] font-mono text-white/30">
            Analyzing…
          </div>
        )}
      </Block>

      <Block
        title="Arc EQ bands"
        description="Sub / bass / mids / highs — relative band energy for DJ-style planning. Hover for Hz range and mix notes."
        source="PitchClassViz ArcEqBands · useArcAnalyzer computeBands"
      >
        {analysis ? (
          <ArcEqBands
            sub={analysis.sub}
            bass={analysis.bass}
            mids={analysis.mids}
            highs={analysis.highs}
            variant="columns"
          />
        ) : null}
      </Block>

      <Block
        title="Stem separation sources"
        description="Four track sources the Separator can isolate—vocals, drums, bass, other—with the same color language as Collage result rails."
        why="Illustrate Demucs outputs as first-class signal surfaces, not a blank waveform."
        source="useStemSeparator · StemSeparatorUpload · StemSeparatorResults"
      >
        <StemSourcesDemo />
      </Block>
    </Section>
  );
}
