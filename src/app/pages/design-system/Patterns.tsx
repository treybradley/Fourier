import { Link } from "react-router";
import { GlassContainer } from "../../components/GlassContainer";
import { MiniAppHeader } from "../../components/MiniAppHeader";
import { FileUploader } from "../../components/FileUploader";
import { Waveform } from "../../components/Waveform";
import { useVisualMode } from "../../hooks/useVisualMode";
import { Block, CalloutGrid, Section } from "./shared";

function HubToToolPattern() {
  const { mono } = useVisualMode();
  const accentA = mono ? "#111111" : "#00EBB8";

  return (
    <div className="rounded-sm border border-white/10 overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-stretch">
        <div className="p-4 space-y-3 border-b md:border-b-0 md:border-r border-white/10">
          <div className="text-[9px] font-mono tracking-widest uppercase text-white/30">
            01 · Hub
          </div>
          <div
            className="rounded-sm border p-4 space-y-2"
            style={{
              borderColor: `${accentA}4D`,
              background: mono ? "rgba(0,0,0,0.03)" : "rgba(8,14,35,0.4)",
            }}
          >
            <div className="text-sm tracking-widest uppercase text-white/85">
              Loop Station
            </div>
            <div className="text-[10px] font-mono text-white/40">
              Multi-track looper
            </div>
            <div
              className="text-[10px] font-mono tracking-widest uppercase py-2 text-center rounded-sm border"
              style={{
                borderColor: `${accentA}50`,
                color: mono ? "#111" : accentA,
              }}
            >
              Enter →
            </div>
          </div>
        </div>
        <div className="hidden md:flex items-center px-3 text-white/25 font-mono text-[10px]">
          →
        </div>
        <div className="p-4 space-y-3 bg-white/[0.02]">
          <div className="text-[9px] font-mono tracking-widest uppercase text-white/30">
            02 · Mini-app shell
          </div>
          <MiniAppHeader
            title="Loop Station"
            subtitle="Multi-track looper"
            yOffset={0}
            right={
              <span className="text-[10px] font-mono text-white/35">5 tr</span>
            }
          />
          <p className="text-[11px] text-white/35 leading-relaxed pt-2">
            Same brand back-link, title stack, and right slot on every tool—so
            navigation stays learned.
          </p>
        </div>
      </div>
    </div>
  );
}

function CollageStagePattern() {
  return (
    <div className="rounded-sm border border-white/10 p-4 space-y-3">
      <MiniAppHeader
        title="Stem Collage"
        subtitle="Multi-stem mixer"
        yOffset={0}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_9rem] gap-3">
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <GlassContainer key={i} className="p-3 space-y-2" isSelected={i === 0}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-widest uppercase text-white/50">
                  Stem {i + 1}
                </span>
                <span className="text-[9px] font-mono text-white/30">
                  {i === 0 ? "Selected" : "Idle"}
                </span>
              </div>
              {i === 0 ? (
                <Waveform
                  audioBuffer={null}
                  isPlaying={false}
                  currentTime={0}
                  duration={0}
                  isSelected
                  markers={[]}
                  onSeek={() => {}}
                  onMarkerClick={() => {}}
                />
              ) : (
                <FileUploader onFileSelect={async () => {}} />
              )}
            </GlassContainer>
          ))}
        </div>
        <div
          data-visual-exempt
          className="rounded-sm border border-white/10 bg-[#04050F] p-3 flex flex-col gap-2 min-h-[10rem]"
        >
          <div className="text-[9px] font-mono tracking-widest uppercase text-white/40">
            Camera rail
          </div>
          <div className="flex-1 rounded-sm border border-dashed border-white/15 grid place-items-center text-[10px] font-mono text-white/25">
            Webcam / HUD
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-white/15 bg-black/50 px-2 py-1 text-[9px] font-mono tracking-widest uppercase text-white/70 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
            Hands · off
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyGatedPattern() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
      <div className="rounded-sm border border-white/10 p-4 space-y-3">
        <div className="text-[11px] font-mono tracking-widest uppercase text-white/60">
          Empty · honest
        </div>
        <FileUploader onFileSelect={async () => {}} />
        <p className="text-[11px] text-white/35 leading-relaxed">
          No placeholder peaks or fake BPM. Upload unlocks waveform + analysis.
        </p>
      </div>
      <div className="rounded-sm border border-white/10 p-4 space-y-3 opacity-70">
        <div className="text-[11px] font-mono tracking-widest uppercase text-white/60">
          Gated · waiting
        </div>
        <div className="rounded-sm border border-dashed border-white/10 p-6 text-center text-[11px] text-white/30 font-mono tracking-wider">
          Drop a track to separate
        </div>
        <p className="text-[11px] text-white/35 leading-relaxed">
          Separator / Arc stay quiet until a buffer exists.
        </p>
      </div>
    </div>
  );
}

export function PatternsSection() {
  return (
    <Section
      title="Design System Patterns"
      lead="Composed journeys—not isolated widgets. Hub entry, collage stage + camera rail, and empty/gated intake. Install architecture lives on Overview."
    >
      <CalloutGrid
        items={[
          {
            title: "One chrome language",
            body: "Every mini-app opens with Mini App Header + glass rails so muscle memory transfers.",
          },
          {
            title: "Stage + rail",
            body: "Primary mixer/workspace on the left; optional camera / HUD on the right—never a dashboard of cards.",
          },
          {
            title: "Empty before fake",
            body: "Upload gates unlock waveforms and analysis. Prefer silence over invented precision.",
          },
        ]}
      />

      <Block
        title="Hub → enter tool"
        description="Home card CTA lands in a mini-app that keeps Fourier back-navigation and the same type hierarchy."
        source="Home ToolCard → /loop-station · MiniAppHeader.tsx"
      >
        <HubToToolPattern />
      </Block>

      <Block
        title="Collage stage + camera rail"
        description="Selected stem glass + waveform (or uploader) beside an exempt camera column for gesture HUD."
        source="StemCollagePage · StemVisualizer · WebcamFeed"
      >
        <CollageStagePattern />
      </Block>

      <Block
        title="Empty / gated upload"
        description="Intake states before any buffer exists—used by Collage, Separator, Grid, Arc."
        source="FileUploader · StemSeparatorUpload · ImportZone"
      >
        <EmptyGatedPattern />
      </Block>

      <Block title="Try the suite">
        <div className="flex flex-wrap gap-2">
          {[
            { to: "/", label: "Hub" },
            { to: "/stem-collage", label: "Stem Collage" },
            { to: "/grid", label: "Grid" },
            { to: "/harmonizer", label: "Harmonizer" },
          ].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="px-3 py-1.5 rounded-sm border border-white/15 text-[10px] font-mono tracking-widest uppercase text-white/55 hover:text-white/90 hover:border-white/30 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </Block>
    </Section>
  );
}
