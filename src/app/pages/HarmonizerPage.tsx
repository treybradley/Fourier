import { MiniAppHeader } from "../components/MiniAppHeader";
import { HarmonizerTrackCard } from "../components/harmonizer/HarmonizerTrackCard";
import { IntervalGrid } from "../components/harmonizer/IntervalGrid";
import {
  HarmonizerProvider,
  useHarmonizer,
} from "../contexts/HarmonizerContext";

function HarmonizerInner() {
  const {
    tracks,
    selectedTrack,
    setSelectedTrack,
    masterLength,
    isPlaying,
    play,
    stop,
    error,
    clearError,
    toggleVoice,
    shiftingSemitone,
  } = useHarmonizer();

  const selected = tracks[selectedTrack];

  return (
    <div
      className="h-screen w-full overflow-hidden relative"
      style={{ background: "#0A060C" }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 65% 55% at 8% 85%, rgba(255,77,109,0.22) 0%, transparent 70%)",
            "radial-gradient(ellipse 55% 60% at 92% 15%, rgba(245,158,11,0.14) 0%, transparent 65%)",
            "radial-gradient(ellipse 35% 35% at 50% 50%, rgba(120,20,40,0.06) 0%, transparent 70%)",
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
        <MiniAppHeader
          title="Harmonizer"
          subtitle="parallel interval stacks"
          titleClassName="bg-gradient-to-r from-white/90 to-white/60 bg-clip-text text-transparent"
          className="gap-3"
          yOffset={-20}
          right={
            <div className="flex items-center gap-2">
              {masterLength != null && (
                <span className="font-mono text-[10px] tracking-wider text-white/35 uppercase">
                  {masterLength.toFixed(2)}s
                </span>
              )}
              <button
                type="button"
                onClick={() => (isPlaying ? stop() : play())}
                className="px-3 py-1.5 rounded-sm border border-white/15 font-mono text-[10px] tracking-widest uppercase text-white/60 hover:text-white/85 hover:border-white/30 transition-colors"
              >
                {isPlaying ? "Stop" : "Play"}
              </button>
            </div>
          }
        />

        {error && (
          <button
            type="button"
            onClick={clearError}
            className="text-left font-mono text-[11px] text-red-300/90 border border-red-400/25 bg-red-500/10 px-3 py-2 rounded-sm"
          >
            {error} · dismiss
          </button>
        )}

        <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
            {([0, 1, 2] as const).map((id) => (
              <HarmonizerTrackCard
                key={id}
                trackId={id}
                selected={selectedTrack === id}
                onSelect={() => setSelectedTrack(id)}
              />
            ))}
          </div>

          <div className="lg:w-[42%] shrink-0 rounded-sm border border-white/10 bg-white/[0.03] p-3 flex flex-col gap-3 min-h-[180px]">
            <div className="font-mono text-[10px] tracking-widest uppercase text-white/45">
              Track {selectedTrack + 1} harmonies
            </div>
            {selected?.rootBuffer ? (
              <IntervalGrid
                activeSemitones={selected.voices.map((v) => v.semitones)}
                shiftingSemitone={
                  shiftingSemitone?.trackId === selectedTrack
                    ? shiftingSemitone.semitones
                    : null
                }
                onToggle={(s) => void toggleVoice(selectedTrack, s)}
              />
            ) : (
              <p className="font-mono text-[11px] text-white/30 leading-relaxed">
                Record or upload a root on this track, then stack parallel
                intervals. Track 1 sets the master loop length.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HarmonizerPage() {
  return (
    <HarmonizerProvider>
      <HarmonizerInner />
    </HarmonizerProvider>
  );
}
