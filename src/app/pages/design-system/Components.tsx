import { useEffect, useState } from "react";
import { GlassContainer } from "../../components/GlassContainer";
import { MiniAppHeader } from "../../components/MiniAppHeader";
import { FileUploader } from "../../components/FileUploader";
import { Waveform } from "../../components/Waveform";
import { IntervalGrid } from "../../components/harmonizer/IntervalGrid";
import { useVisualMode } from "../../hooks/useVisualMode";
import { createDemoBuffer } from "./demoAudio";
import { PitchZoomControls } from "./PitchZoomControls";
import { Block, Section } from "./shared";

function ModeToggleDemo() {
  const { mode, setMode } = useVisualMode();
  return (
    <div className="flex rounded-sm overflow-hidden border border-white/15 w-fit">
      {(["color", "mono"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMode(m)}
          className={`px-2.5 py-1 text-[10px] font-mono tracking-widest uppercase transition-colors ${
            mode === m
              ? "bg-white/15 text-white/90"
              : "text-white/30 hover:text-white/60"
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

function FeatureChips() {
  const { mono } = useVisualMode();
  const chips = ["4-track stem mixer", "Cue points", "Optional hand control"];
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((f) => (
        <span
          key={f}
          className={`text-[9px] font-mono tracking-wider uppercase rounded-sm px-2 py-0.5 border ${
            mono
              ? "text-black/70 border-black/25"
              : "text-white/30 border-white/8"
          }`}
        >
          {f}
        </span>
      ))}
    </div>
  );
}

function HubCardDemo() {
  const { mono } = useVisualMode();
  const accentA = mono ? "#111111" : "#0059CE";
  const accentB = mono ? "#555555" : "#FF64E3";

  return (
    <div
      className="relative rounded-sm border p-6 flex flex-col gap-4 max-w-md"
      style={
        {
          "--ab-dim": `${accentA}4D`,
          "--ab-bright": `${accentA}99`,
          borderColor: `var(--ab-dim)`,
          background: mono ? "rgba(0,0,0,0.03)" : "rgba(8,14,35,0.40)",
          backdropFilter: "blur(18px)",
        } as React.CSSProperties
      }
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-sm"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentA}70, ${accentB}70, transparent)`,
        }}
      />
      <div>
        <h3 className="text-white/90 text-xl font-medium tracking-widest uppercase leading-none mb-1.5">
          Stem Collage
        </h3>
        <p
          className={`text-[11px] font-mono tracking-wider uppercase ${
            mono ? "text-black/70" : "text-[#a78bfa]/80"
          }`}
        >
          Multi-stem mixer
        </p>
      </div>
      <p className="text-white/40 text-xs leading-relaxed">
        Load up to 4 audio stems and mix them live. Optional hand control for
        volume and pitch.
      </p>
      <FeatureChips />
      <button
        type="button"
        className="w-full py-2.5 rounded-sm border text-xs font-mono tracking-widest uppercase text-white/70"
        style={{
          borderColor: `${accentA}50`,
          backgroundColor: `${accentA}12`,
        }}
      >
        Enter →
      </button>
    </div>
  );
}

function TransportChromeDemo() {
  const { accent, inkFg } = useVisualMode();
  const ACCENT = accent("#62FF00");
  const [mode, setMode] = useState<"live" | "seq">("live");
  const [playing, setPlaying] = useState(false);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex rounded-sm overflow-hidden border border-white/10 text-[9px]">
        {(["live", "seq"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className="px-2.5 py-1 font-mono tracking-widest uppercase transition-all"
            style={
              mode === m
                ? { background: `${ACCENT}28`, color: ACCENT }
                : { color: inkFg(0.55) }
            }
          >
            {m}
          </button>
        ))}
      </div>
      <div className="w-px h-4 bg-white/10" />
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        className="px-3 py-1 rounded-sm border border-white/15 font-mono text-[9px] tracking-widest uppercase text-white/70 hover:text-white/90"
        style={
          playing
            ? { borderColor: `${ACCENT}80`, color: ACCENT, background: `${ACCENT}18` }
            : undefined
        }
      >
        {playing ? "Stop" : "Play"}
      </button>
      <span className="font-mono text-[10px] tracking-widest text-white/40 tabular-nums">
        120 BPM
      </span>
    </div>
  );
}

function PadDemo() {
  const { mono, accent } = useVisualMode();
  const ACCENT = accent("#62FF00");
  const [active, setActive] = useState(4);

  return (
    <div className="grid grid-cols-3 gap-2 max-w-xs">
      {Array.from({ length: 9 }, (_, i) => {
        const on = active === i;
        return (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            className="aspect-square rounded-sm border p-2 flex flex-col justify-between text-left transition-colors"
            style={{
              borderColor: on
                ? `${ACCENT}99`
                : mono
                  ? "rgba(0,0,0,0.2)"
                  : "rgba(255,255,255,0.12)",
              background: on
                ? `${ACCENT}22`
                : mono
                  ? "rgba(0,0,0,0.03)"
                  : "rgba(255,255,255,0.03)",
            }}
          >
            <span className="text-[9px] font-mono text-white/35">
              {i + 1}
            </span>
            <span className="text-[10px] font-mono text-white/55 truncate">
              {i === 4 ? "kick.wav" : "—"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function HudChipDemo() {
  return (
    <div className="flex flex-wrap gap-2">
      {["Camera · on", "Hands · tracking", "Rec · armed"].map((label) => (
        <span
          key={label}
          className="inline-flex items-center gap-1.5 rounded-sm border border-white/15 bg-black/50 px-2 py-1 text-[9px] font-mono tracking-widest uppercase text-white/70"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
          {label}
        </span>
      ))}
    </div>
  );
}

function WaveformDemo() {
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [selected, setSelected] = useState(true);
  const [pitch, setPitch] = useState(1);

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

  const duration = buffer?.duration ?? 6;
  const mid = duration / 2;

  return (
    <div className="space-y-3 max-w-xl">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSelected((s) => !s)}
          className="text-[9px] font-mono tracking-widest uppercase px-2 py-1 rounded-sm border border-white/15 text-white/50 hover:text-white/80"
        >
          {selected ? "Selected" : "Idle"}
        </button>
        <PitchZoomControls pitch={pitch} onChange={setPitch} />
      </div>
      <Waveform
        audioBuffer={buffer}
        isPlaying={false}
        currentTime={mid}
        duration={duration}
        pitch={pitch}
        isSelected={selected}
        markers={[{ id: "c1", time: mid * 0.25 }]}
        onSeek={() => {}}
        onMarkerClick={() => {}}
      />
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
  );
}

function IntervalDemo() {
  const [active, setActive] = useState<number[]>([3, 7]);

  return (
    <IntervalGrid
      activeSemitones={active}
      shiftingSemitone={null}
      onToggle={(s) =>
        setActive((prev) =>
          prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
        )
      }
    />
  );
}

export function ComponentsSection() {
  return (
    <Section
      title="Design System Components"
      lead="Production React surfaces reused across mini-apps—not redrawn mocks. Each block names the source file a developer should open."
    >
      <Block
        title="Color / mono toggle"
        description="Segmented control on the hub and this page. Writes html[data-visual] + localStorage."
        source="Home.tsx · useVisualMode · visualMode.ts"
      >
        <ModeToggleDemo />
      </Block>

      <Block
        title="Mini App Header"
        description="Back to hub, centered title + mono subtitle, optional right slot (BPM, export)."
        source="src/app/components/MiniAppHeader.tsx"
      >
        <div className="rounded-sm border border-white/10 bg-white/[0.02] p-4">
          <MiniAppHeader
            title="Stem Collage"
            subtitle="Multi-stem mixer"
            right={
              <span className="text-[10px] font-mono text-white/35 tracking-widest">
                4 stems
              </span>
            }
          />
        </div>
      </Block>

      <Block
        id="glass"
        title="Glass Container"
        description="Motion glass panel with rest / selected elevation via ink alphas."
        source="src/app/components/GlassContainer.tsx"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          <GlassContainer className="p-4">
            <div className="text-[11px] font-mono tracking-widest uppercase text-white/60">
              Rest
            </div>
            <p className="text-xs text-white/40 mt-2">Stem card shell</p>
          </GlassContainer>
          <GlassContainer className="p-4" isSelected>
            <div className="text-[11px] font-mono tracking-widest uppercase text-white/60">
              Selected
            </div>
            <p className="text-xs text-white/40 mt-2">Active stem focus</p>
          </GlassContainer>
        </div>
      </Block>

      <Block
        id="hub"
        title="Hub tool card"
        description="Accent edge, tagline, feature chips, Enter CTA—pattern from the home grid."
        source="src/app/pages/Home.tsx · ToolCard"
      >
        <HubCardDemo />
      </Block>

      <Block
        title="Feature chips"
        description="Uppercase mono pills for capability lists on hub cards."
        source="Home.tsx"
      >
        <FeatureChips />
      </Block>

      <Block
        title="File Uploader"
        description="Empty / loading / loaded / error states for stem and sample intake."
        why="Honest empty — no fake filename until a real file lands."
        source="src/app/components/FileUploader.tsx"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
          <FileUploader onFileSelect={async () => {}} />
          <FileUploader
            onFileSelect={async () => {}}
            onClear={() => {}}
            fileName="demo-kick.wav"
          />
          <FileUploader onFileSelect={async () => {}} isLoading />
        </div>
      </Block>

      <Block
        title="Waveform"
        description="SVG path from AudioBuffer peaks; pitch compresses width; central playhead + markers."
        source="src/app/components/Waveform.tsx · useWaveform"
      >
        <WaveformDemo />
      </Block>

      <Block
        title="Grid transport chrome"
        description="Live / seq mode, play, BPM — accent-driven segmented controls."
        source="src/app/components/grid/Transport.tsx"
      >
        <TransportChromeDemo />
      </Block>

      <Block
        title="Pad Grid"
        description="9-pad sampler chrome with active flash and filename meta."
        source="src/app/components/grid/PadCard.tsx · PadGrid.tsx"
      >
        <PadDemo />
      </Block>

      <Block
        title="HUD Chips"
        description="Camera / tracking / record status over live views (camera trees keep color HUD in mono)."
        source="Looper / Collage camera rails"
      >
        <div data-visual-exempt>
          <HudChipDemo />
        </div>
      </Block>

      <Block
        title="Interval Grid"
        description="Harmonizer ±12 semitone voice picker with degree / ±st label modes."
        source="src/app/components/harmonizer/IntervalGrid.tsx"
      >
        <IntervalDemo />
      </Block>
    </Section>
  );
}
