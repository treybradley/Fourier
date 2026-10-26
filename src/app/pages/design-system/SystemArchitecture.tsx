import { useState } from "react";
import { useVisualMode } from "../../hooks/useVisualMode";
import { Block } from "./shared";

type Context = "station" | "sculpture";

const CONTEXTS: Record<
  Context,
  {
    label: string;
    eyebrow: string;
    title: string;
    body: string;
    points: string[];
  }
> = {
  station: {
    label: "Guided station",
    eyebrow: "Facilitated · hardware in the room",
    title: "Computer station + guest producer",
    body: "VibeCon ran Fourier on a dedicated machine tied to real controllers and a camera—so a host could walk a guest music producer through live demos without fighting the browser.",
    points: [
      "Host drives the narrative; guest plays into the tools",
      "Desktop chrome, camera rail, and transport stay reachable",
      "Color mode for stage lighting; mono when the room washes out contrast",
      "Local export only—no account layer required for the demo loop",
    ],
  },
  sculpture: {
    label: "Interactive sculpture",
    eyebrow: "Walk-up · self-serve floor piece",
    title: "Same stack, no facilitator",
    body: "On the floor it had to read as an object you could approach: load audio, move, hear something change. Same client build—different social contract.",
    points: [
      "Empty states stay honest so strangers aren’t staring at fake stems",
      "Gesture / camera optional—tools still work with mouse and keys",
      "Dense mixers assume a standing laptop or kiosk, not phone browse",
      "Session dies with the tab; no cloud sync in the install path",
    ],
  },
};

const STACK = [
  {
    id: "shell",
    label: "UI shell",
    detail: "Hub, Mini App Header, Glass Container, color↔mono tokens",
    files: "Home · MiniAppHeader · GlassContainer · visual-mode.css",
  },
  {
    id: "vision",
    label: "MediaPipe",
    detail: "Hands / face / camera rails for gesture-aware tools",
    files: "useHandTracking · WebcamFeed · LooperCamera",
  },
  {
    id: "audio",
    label: "Web Audio",
    detail: "Playback graphs, analysers, recording, offline render",
    files: "AudioEngineContext · GridEngine · GranularEngine",
  },
  {
    id: "dsp",
    label: "ONNX / SoundTouch",
    detail: "In-browser stem separation and pitch-preserving shifts",
    files: "useStemSeparator · pitchShiftBuffer · Harmonizer",
  },
  {
    id: "export",
    label: "Local export",
    detail: "WAV / session JSON / optional 9:16 compositor—on device",
    files: "audioUtils · useSessionRecorder · exportFormat",
  },
] as const;

const FLOW = [
  { step: "01", label: "Design", note: "Tokens, glass, accents locked early" },
  { step: "02", label: "VibeCon", note: "Station + sculpture pressure-test" },
  { step: "03", label: "Suite", note: "New mini-apps reuse the shell" },
  { step: "04", label: "Transfer", note: "Patterns move to other Matte builds" },
] as const;

function ContextSchematic({ context }: { context: Context }) {
  const { mono } = useVisualMode();
  const isStation = context === "station";
  const accent = mono ? "#111111" : isStation ? "#009DFF" : "#EB00F7";
  const accentSoft = mono
    ? "rgba(17,17,17,0.12)"
    : isStation
      ? "rgba(0,157,255,0.18)"
      : "rgba(235,0,247,0.18)";

  return (
    <div
      className="relative rounded-sm border border-white/10 overflow-hidden min-h-[13rem]"
      style={{
        background: mono
          ? "rgba(0,0,0,0.03)"
          : "linear-gradient(160deg, rgba(8,14,35,0.9), rgba(4,6,14,0.95))",
      }}
    >
      {/* Floor / desk plane */}
      <div
        className="absolute inset-x-6 bottom-5 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}66, transparent)`,
        }}
      />
      <div
        className="absolute inset-x-10 bottom-5 h-10 rounded-sm opacity-40"
        style={{
          background: `linear-gradient(180deg, transparent, ${accentSoft})`,
        }}
      />

      {/* Screen */}
      <div className="absolute left-1/2 top-7 -translate-x-1/2 w-[58%] max-w-[16rem]">
        <div
          className="rounded-sm border px-2.5 py-2 space-y-1.5"
          style={{
            borderColor: `${accent}55`,
            background: mono ? "rgba(255,255,255,0.7)" : "rgba(4,6,14,0.85)",
            boxShadow: `0 0 24px ${accentSoft}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-mono tracking-widest uppercase text-white/50">
              Fourier
            </span>
            <span
              className="text-[7px] font-mono tracking-widest uppercase"
              style={{ color: accent }}
            >
              {isStation ? "Station" : "Sculpture"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-5 rounded-[2px] border border-white/10"
                style={{
                  background:
                    i === 1
                      ? accentSoft
                      : mono
                        ? "rgba(0,0,0,0.04)"
                        : "rgba(255,255,255,0.04)",
                }}
              />
            ))}
          </div>
          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full w-2/3 rounded-full"
              style={{ background: accent }}
            />
          </div>
        </div>
        {/* Stand */}
        <div
          className="mx-auto w-px h-4"
          style={{ background: `${accent}44` }}
        />
        <div
          className="mx-auto w-10 h-1 rounded-full"
          style={{ background: `${accent}33` }}
        />
      </div>

      {/* Side props */}
      {isStation ? (
        <>
          <div className="absolute left-5 bottom-8 space-y-1.5 w-14">
            <div
              className="h-8 rounded-sm border border-white/15"
              style={{ background: accentSoft }}
            />
            <div className="text-[7px] font-mono tracking-widest uppercase text-white/35 text-center">
              Hardware
            </div>
          </div>
          <div className="absolute right-5 bottom-10 space-y-1">
            <div className="flex gap-1 justify-end">
              <span className="w-5 h-5 rounded-full border border-white/20 bg-white/5" />
              <span className="w-5 h-5 rounded-full border border-white/20 bg-white/5" />
            </div>
            <div className="text-[7px] font-mono tracking-widest uppercase text-white/35 text-right">
              Host + guest
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="absolute left-6 bottom-9 text-[7px] font-mono tracking-widest uppercase text-white/30 rotate-[-8deg]">
            Approach
          </div>
          <div className="absolute right-5 bottom-8 space-y-1.5 w-12">
            <div
              className="aspect-square rounded-sm border border-dashed border-white/20 grid place-items-center"
              style={{ background: accentSoft }}
            >
              <span className="text-[8px] font-mono text-white/45">CAM</span>
            </div>
            <div className="text-[7px] font-mono tracking-widest uppercase text-white/35 text-center">
              Optional
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function SystemArchitecture() {
  const [context, setContext] = useState<Context>("station");
  const [activeLayer, setActiveLayer] = useState<string | null>("shell");
  const { mono } = useVisualMode();
  const cfg = CONTEXTS[context];
  const layer = STACK.find((s) => s.id === activeLayer) ?? STACK[0];

  return (
    <Block
      id="architecture"
      title="System architecture"
      description="Fourier wasn’t only a URL. For VibeCon it lived as a guided station and as a walk-up sculpture—two physical contexts, one browser stack, then a suite that kept growing on the same foundations."
      why="Design the shell for the room first; ship mini-apps without inventing new chrome."
      source="VibeCon install · client-only stack · docs/portfolio"
    >
      <div className="space-y-6">
        {/* Context toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[9px] font-mono tracking-widest uppercase text-white/30">
            Live context
          </span>
          <div className="flex rounded-sm overflow-hidden border border-white/15">
            {(Object.keys(CONTEXTS) as Context[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setContext(id)}
                className={`px-3 py-1.5 text-[10px] font-mono tracking-widest uppercase transition-colors ${
                  context === id
                    ? "bg-white/15 text-white/90"
                    : "text-white/35 hover:text-white/65"
                }`}
              >
                {CONTEXTS[id].label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ContextSchematic context={context} />
          <div className="rounded-sm border border-white/10 bg-white/[0.02] p-4 space-y-3 flex flex-col">
            <div className="text-[9px] font-mono tracking-widest uppercase text-white/35">
              {cfg.eyebrow}
            </div>
            <h3 className="text-sm text-white/85 font-medium tracking-tight">
              {cfg.title}
            </h3>
            <p className="text-xs text-white/40 leading-relaxed">{cfg.body}</p>
            <ul className="space-y-2 pt-1">
              {cfg.points.map((p) => (
                <li
                  key={p}
                  className="flex gap-2 text-[11px] text-white/45 leading-relaxed"
                >
                  <span
                    className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0"
                    style={{
                      background: mono
                        ? "#111"
                        : context === "station"
                          ? "#009DFF"
                          : "#EB00F7",
                    }}
                  />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Shared stack */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-mono text-white/30 tracking-widest uppercase">
            <span className="flex-1 h-px bg-white/10" />
            Shared client stack
            <span className="flex-1 h-px bg-white/10" />
          </div>
          <p className="text-[11px] text-white/35 leading-relaxed max-w-2xl">
            Both contexts run the same build on the machine. Nothing here is a
            native shell—MediaPipe, Web Audio, and ONNX / SoundTouch stay in the
            browser; exports stay local.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex flex-col gap-1 sm:w-44 flex-shrink-0">
              {STACK.map((s) => {
                const on = activeLayer === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveLayer(s.id)}
                    onMouseEnter={() => setActiveLayer(s.id)}
                    className={`text-left px-3 py-2 rounded-sm border text-[10px] font-mono tracking-widest uppercase transition-colors ${
                      on
                        ? "border-white/25 bg-white/10 text-white/90"
                        : "border-white/10 text-white/40 hover:text-white/70 hover:border-white/20"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
            <div className="flex-1 rounded-sm border border-white/10 bg-white/[0.03] p-4 space-y-2 min-h-[7.5rem]">
              <div className="text-[11px] font-mono tracking-widest uppercase text-white/70">
                {layer.label}
              </div>
              <p className="text-xs text-white/45 leading-relaxed">
                {layer.detail}
              </p>
              <p className="text-[10px] font-mono text-white/25 tracking-wide pt-1">
                {layer.files}
              </p>
            </div>
          </div>
        </div>

        {/* Comparison */}
        <div className="overflow-x-auto rounded-sm border border-white/10">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[10px] font-mono tracking-widest uppercase text-white/35">
                <th className="px-3 py-2.5 font-normal">Concern</th>
                <th className="px-3 py-2.5 font-normal">Station</th>
                <th className="px-3 py-2.5 font-normal">Sculpture</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  concern: "Who drives",
                  station: "Host + guest producer",
                  sculpture: "Anyone who walks up",
                },
                {
                  concern: "Hardware",
                  station: "Controllers / mic in the loop",
                  sculpture: "Optional camera; mouse OK",
                },
                {
                  concern: "Failure mode",
                  station: "Host recovers the demo",
                  sculpture: "Honest empty / retry in UI",
                },
                {
                  concern: "Visual mode",
                  station: "Color for stage; mono for docs",
                  sculpture: "Pick for room light",
                },
                {
                  concern: "Data",
                  station: "Local files for the session",
                  sculpture: "No accounts; tab is ephemeral",
                },
              ].map((row) => (
                <tr
                  key={row.concern}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="px-3 py-2.5 text-white/70 whitespace-nowrap">
                    {row.concern}
                  </td>
                  <td className="px-3 py-2.5 text-white/40">{row.station}</td>
                  <td className="px-3 py-2.5 text-white/40">{row.sculpture}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Timeline */}
        <div className="space-y-3">
          <div className="text-[10px] font-mono tracking-widest uppercase text-white/30">
            After the install
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {FLOW.map((f, i) => (
              <div
                key={f.step}
                className="relative rounded-sm border border-white/10 bg-white/[0.02] p-3 space-y-1"
              >
                {i < FLOW.length - 1 ? (
                  <div className="hidden md:block absolute top-1/2 -right-1 w-2 h-px bg-white/15 z-10" />
                ) : null}
                <div className="text-[9px] font-mono text-white/30 tracking-widest">
                  {f.step}
                </div>
                <div className="text-[11px] text-white/80 font-medium">
                  {f.label}
                </div>
                <p className="text-[10px] text-white/35 leading-relaxed">
                  {f.note}
                </p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-white/35 leading-relaxed max-w-2xl">
            Locking foundations at VibeCon made scaling into Looper, Grid, Arc,
            Gato, and Harmonizer tractable—and the same glass / mono language
            transferred to other Matte / Replit experiments.
          </p>
        </div>
      </div>
    </Block>
  );
}
