import { useEffect, useMemo, useState } from "react";
import { Waveform } from "../../components/Waveform";
import {
  ArcEqBands,
  ChromaAverageBars,
  ChromagramOverTime,
} from "../../components/arc/PitchClassViz";
import { analyzeAudioBuffer } from "../../hooks/useArcAnalyzer";
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
  const { mono } = useVisualMode();
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
                          ? "rgba(255,255,255,0.9)"
                          : "rgba(255,255,255,0.35)",
                      background:
                        pitchView === "average"
                          ? "rgba(255,255,255,0.1)"
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
                          ? "rgba(255,255,255,0.9)"
                          : "rgba(255,255,255,0.35)",
                      background:
                        pitchView === "overtime"
                          ? "rgba(255,255,255,0.1)"
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
        title="Empty signal"
        description="Quiet placeholder line until a buffer exists."
      >
        <div className="max-w-xl">
          <Waveform
            audioBuffer={null}
            isPlaying={false}
            currentTime={0}
            duration={0}
            isSelected={false}
            markers={[]}
            onSeek={() => {}}
            onMarkerClick={() => {}}
          />
        </div>
      </Block>
    </Section>
  );
}
