import { GlassContainer } from "../../components/GlassContainer";
import { MiniAppHeader } from "../../components/MiniAppHeader";
import { FileUploader } from "../../components/FileUploader";
import { Waveform } from "../../components/Waveform";
import { useVisualMode } from "../../hooks/useVisualMode";

export function HubToToolPattern() {
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
            interactive={false}
            right={
              <span className="text-[10px] font-mono text-white/35">5 tr</span>
            }
          />
          <p className="text-[11px] text-white/35 leading-relaxed pt-2">
            Same brand back mark, title stack, and right slot on every tool—so
            navigation stays learned. (Back is inert in this demo.)
          </p>
        </div>
      </div>
    </div>
  );
}

const STEM_SLOTS = [
  { label: "Stem 1", state: "selected" as const },
  { label: "Stem 2", state: "idle" as const },
  { label: "Stem 3", state: "empty" as const },
  { label: "Stem 4", state: "empty" as const },
];

export function CollageStagePattern() {
  return (
    <div className="rounded-sm border border-white/10 p-4 space-y-3">
      <MiniAppHeader
        title="Stem Collage"
        subtitle="Multi-stem mixer"
        yOffset={0}
        interactive={false}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_9rem] gap-3">
        <div className="space-y-2">
          {STEM_SLOTS.map((slot) => (
            <GlassContainer
              key={slot.label}
              className="p-3 space-y-2"
              isSelected={slot.state === "selected"}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-widest uppercase text-white/50">
                  {slot.label}
                </span>
                <span className="text-[9px] font-mono text-white/30">
                  {slot.state === "selected"
                    ? "Selected"
                    : slot.state === "idle"
                      ? "Idle"
                      : "Empty"}
                </span>
              </div>
              {slot.state === "selected" ? (
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
              ) : slot.state === "idle" ? (
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
              ) : (
                <FileUploader onFileSelect={async () => {}} />
              )}
            </GlassContainer>
          ))}
        </div>
        <div
          data-visual-exempt
          className="rounded-sm border border-white/10 bg-[#04050F] p-3 flex flex-col gap-2 min-h-[22rem] lg:min-h-full"
        >
          <div className="text-[9px] font-mono tracking-widest uppercase text-white/40">
            Camera rail
          </div>
          <div className="flex-1 rounded-sm border border-dashed border-white/15 grid place-items-center text-[10px] font-mono text-white/25 min-h-[8rem]">
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

export function EmptyGatedPattern() {
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
