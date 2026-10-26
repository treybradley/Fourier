import { useState } from "react";
import { useVisualMode } from "../../hooks/useVisualMode";
import { Block, Section } from "./shared";

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
    tech: "React · tokens · glass",
    detail: "Hub, Mini App Header, Glass Container, color↔mono tokens",
    files: "Home · MiniAppHeader · GlassContainer · visual-mode.css",
    role: "Presents tools; remaps chrome for the room",
  },
  {
    id: "vision",
    label: "MediaPipe",
    tech: "Webcam · hands / face",
    detail: "Hands / face / camera rails for gesture-aware tools",
    files: "useHandTracking · WebcamFeed · LooperCamera",
    role: "Turns presence into control signals",
  },
  {
    id: "audio",
    label: "Web Audio",
    tech: "Graph · analysers · record",
    detail: "Playback graphs, analysers, recording, offline render",
    files: "AudioEngineContext · GridEngine · GranularEngine",
    role: "Realtime playback + metering for every mini-app",
  },
  {
    id: "dsp",
    label: "ONNX / SoundTouch",
    tech: "Stems · pitch shift",
    detail: "In-browser stem separation and pitch-preserving shifts",
    files: "useStemSeparator · pitchShiftBuffer · Harmonizer",
    role: "Heavy ML / DSP without leaving the tab",
  },
  {
    id: "export",
    label: "Local export",
    tech: "WAV · JSON · 9:16",
    detail: "WAV / session JSON / optional 9:16 compositor—on device",
    files: "audioUtils · useSessionRecorder · exportFormat",
    role: "Session leaves as a file; nothing syncs to a cloud",
  },
] as const;

const FLOW = [
  { step: "01", label: "Design", note: "Tokens, glass, accents locked early" },
  { step: "02", label: "VibeCon", note: "Station + sculpture pressure-test" },
  { step: "03", label: "Suite", note: "New mini-apps reuse the shell" },
  { step: "04", label: "Transfer", note: "Patterns move to other Matte builds" },
] as const;

const DATA_NODES = [
  {
    id: "cam",
    label: "Webcam",
    sub: "getUserMedia",
    col: 0,
    row: 0,
  },
  {
    id: "file",
    label: "Audio / video",
    sub: "File / drag-drop",
    col: 0,
    row: 1,
  },
  {
    id: "mp",
    label: "MediaPipe",
    sub: "Landmarks → gestures",
    col: 1,
    row: 0,
  },
  {
    id: "wa",
    label: "Web Audio",
    sub: "Graph · Analysers",
    col: 1,
    row: 1,
  },
  {
    id: "ui",
    label: "UI shell",
    sub: "Pads · transport · mix",
    col: 2,
    row: 0,
  },
  {
    id: "dsp",
    label: "ONNX / SoundTouch",
    sub: "Stems · pitch",
    col: 2,
    row: 1,
  },
  {
    id: "out",
    label: "Speakers",
    sub: "Realtime monitor",
    col: 3,
    row: 0,
  },
  {
    id: "disk",
    label: "Local export",
    sub: "WAV · JSON · 9:16",
    col: 3,
    row: 1,
  },
] as const;

/** Edges drawn as simple labeled paths between columns */
const DATA_EDGES: { from: string; to: string; label: string }[] = [
  { from: "cam", to: "mp", label: "frames" },
  { from: "mp", to: "ui", label: "gestures" },
  { from: "file", to: "wa", label: "buffer" },
  { from: "wa", to: "ui", label: "meters" },
  { from: "wa", to: "dsp", label: "decode" },
  { from: "dsp", to: "wa", label: "stems" },
  { from: "ui", to: "out", label: "mix" },
  { from: "wa", to: "disk", label: "render" },
];

function NodeBox({
  label,
  sub,
  accent,
  accentSoft,
  mono,
  highlight,
}: {
  label: string;
  sub: string;
  accent: string;
  accentSoft: string;
  mono: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-sm border px-2.5 py-2 space-y-0.5 min-w-0"
      style={{
        borderColor: highlight ? `${accent}88` : "rgba(255,255,255,0.12)",
        background: highlight
          ? accentSoft
          : mono
            ? "rgba(255,255,255,0.75)"
            : "rgba(4,6,14,0.88)",
        boxShadow: highlight ? `0 0 18px ${accentSoft}` : undefined,
      }}
    >
      <div
        className="text-[10px] font-mono tracking-widest uppercase truncate"
        style={{ color: highlight ? accent : undefined }}
      >
        <span className={highlight ? "" : "text-white/75"}>{label}</span>
      </div>
      <div className="text-[9px] text-white/35 truncate">{sub}</div>
    </div>
  );
}

function DataFlowDiagram() {
  const { mono } = useVisualMode();
  const accent = mono ? "#111111" : "#009DFF";
  const accentSoft = mono
    ? "rgba(17,17,17,0.1)"
    : "rgba(0,157,255,0.16)";
  const [hot, setHot] = useState<string | null>("wa");

  const byId = Object.fromEntries(DATA_NODES.map((n) => [n.id, n]));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[10px] font-mono text-white/30 tracking-widest uppercase">
        <span className="flex-1 h-px bg-white/10" />
        Runtime data flow
        <span className="flex-1 h-px bg-white/10" />
      </div>
      <p className="text-[11px] text-white/35 leading-relaxed max-w-2xl">
        Everything stays in the browser tab. Vision and audio are separate
        ingress paths that meet in the UI shell; DSP branches off the audio
        graph; the only egress is speakers or a local file.
      </p>

      <div
        className="rounded-sm border border-white/10 p-4 md:p-5 overflow-x-auto"
        style={{
          background: mono
            ? "rgba(0,0,0,0.03)"
            : "linear-gradient(160deg, rgba(8,14,35,0.92), rgba(4,6,14,0.96))",
        }}
      >
        {/* Column headers */}
        <div className="grid grid-cols-4 gap-2 md:gap-3 mb-2 min-w-[36rem]">
          {["Ingress", "Capture / graph", "Process / control", "Egress"].map(
            (h) => (
              <div
                key={h}
                className="text-[8px] font-mono tracking-widest uppercase text-white/25 px-1"
              >
                {h}
              </div>
            ),
          )}
        </div>

        <div className="grid grid-cols-4 gap-2 md:gap-3 min-w-[36rem]">
          {[0, 1, 2, 3].map((col) => (
            <div key={col} className="flex flex-col gap-2">
              {DATA_NODES.filter((n) => n.col === col).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setHot(n.id)}
                  onMouseEnter={() => setHot(n.id)}
                  className="text-left"
                >
                  <NodeBox
                    label={n.label}
                    sub={n.sub}
                    accent={accent}
                    accentSoft={accentSoft}
                    mono={mono}
                    highlight={hot === n.id}
                  />
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Edge legend for active node */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-x-4 gap-y-1.5">
          {DATA_EDGES.filter((e) => e.from === hot || e.to === hot).map(
            (e) => (
              <div
                key={`${e.from}-${e.to}`}
                className="text-[10px] font-mono text-white/40"
              >
                <span className="text-white/55">{byId[e.from]?.label}</span>
                <span className="mx-1.5" style={{ color: accent }}>
                  →
                </span>
                <span className="text-white/55">{byId[e.to]?.label}</span>
                <span className="text-white/25 ml-1.5">({e.label})</span>
              </div>
            ),
          )}
          {hot &&
          !DATA_EDGES.some((e) => e.from === hot || e.to === hot) ? (
            <span className="text-[10px] text-white/30">No edges</span>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-[9px] font-mono tracking-widest uppercase text-white/25">
          <span
            className="inline-flex items-center gap-1.5"
            style={{ color: accent }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: accent }}
            />
            On-device
          </span>
          <span className="text-white/20">·</span>
          <span>No server round-trip for stems, pitch, or export</span>
        </div>
      </div>
    </div>
  );
}

function HardwareWiring({ context }: { context: Context }) {
  const { mono } = useVisualMode();
  const isStation = context === "station";
  const accent = mono ? "#111111" : isStation ? "#009DFF" : "#EB00F7";
  const accentSoft = mono
    ? "rgba(17,17,17,0.12)"
    : isStation
      ? "rgba(0,157,255,0.18)"
      : "rgba(235,0,247,0.18)";

  const peripherals = isStation
    ? [
        { id: "cam", label: "Camera", note: "Gesture rail" },
        { id: "midi", label: "Controllers", note: "Pads / MIDI in" },
        { id: "mic", label: "Mic / line", note: "Guest input" },
        { id: "spk", label: "Monitors", note: "Host + floor" },
      ]
    : [
        { id: "cam", label: "Camera", note: "Optional" },
        { id: "mouse", label: "Pointer / keys", note: "Always works" },
        { id: "spk", label: "Speakers", note: "Walk-up listen" },
        { id: "kiosk", label: "Kiosk machine", note: "Locked browser" },
      ];

  return (
    <div
      className="relative rounded-sm border border-white/10 overflow-hidden min-h-[14rem] p-4"
      style={{
        background: mono
          ? "rgba(0,0,0,0.03)"
          : "linear-gradient(160deg, rgba(8,14,35,0.9), rgba(4,6,14,0.95))",
      }}
    >
      <div className="text-[8px] font-mono tracking-widest uppercase text-white/25 mb-3">
        Hardware potential · {isStation ? "station wiring" : "sculpture wiring"}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 md:gap-4 items-center">
        {/* Peripherals */}
        <div className="space-y-2">
          {peripherals.slice(0, 2).map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <div
                className="flex-1 rounded-sm border px-2 py-1.5"
                style={{
                  borderColor: `${accent}44`,
                  background: accentSoft,
                }}
              >
                <div className="text-[10px] font-mono tracking-widest uppercase text-white/70">
                  {p.label}
                </div>
                <div className="text-[8px] text-white/35">{p.note}</div>
              </div>
              <div
                className="hidden sm:block w-4 h-px flex-shrink-0"
                style={{ background: `${accent}66` }}
              />
            </div>
          ))}
        </div>

        {/* Client blob */}
        <div className="relative flex flex-col items-center gap-1 px-1">
          <div
            className="rounded-sm border px-3 py-3 text-center min-w-[7.5rem]"
            style={{
              borderColor: `${accent}77`,
              background: mono
                ? "rgba(255,255,255,0.85)"
                : "rgba(4,6,14,0.92)",
              boxShadow: `0 0 28px ${accentSoft}`,
            }}
          >
            <div
              className="text-[9px] font-mono tracking-widest uppercase"
              style={{ color: accent }}
            >
              Same client
            </div>
            <div className="text-[11px] text-white/80 font-medium mt-0.5">
              Fourier
            </div>
            <div className="text-[8px] text-white/30 mt-1 leading-snug">
              MediaPipe · Web Audio
              <br />
              ONNX · SoundTouch
            </div>
          </div>
          <div
            className="text-[7px] font-mono tracking-widest uppercase"
            style={{ color: `${accent}99` }}
          >
            {isStation ? "Host machine" : "Floor kiosk"}
          </div>
        </div>

        {/* More peripherals / people */}
        <div className="space-y-2">
          {peripherals.slice(2).map((p) => (
            <div key={p.id} className="flex items-center gap-2 justify-end">
              <div
                className="hidden sm:block w-4 h-px flex-shrink-0"
                style={{ background: `${accent}66` }}
              />
              <div
                className="flex-1 rounded-sm border px-2 py-1.5"
                style={{
                  borderColor: "rgba(255,255,255,0.12)",
                  background: mono
                    ? "rgba(255,255,255,0.5)"
                    : "rgba(255,255,255,0.04)",
                }}
              >
                <div className="text-[10px] font-mono tracking-widest uppercase text-white/70">
                  {p.label}
                </div>
                <div className="text-[8px] text-white/35">{p.note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* People row */}
      <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-3 justify-between">
        {isStation ? (
          <>
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: accent }}
              />
              <span className="text-[10px] text-white/45">
                Host facilitates · guest produces into the stack
              </span>
            </div>
            <div className="text-[9px] font-mono tracking-widest uppercase text-white/25">
              Controllers in the loop
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: accent }}
              />
              <span className="text-[10px] text-white/45">
                Stranger approaches · no facilitator · honest empty states
              </span>
            </div>
            <div className="text-[9px] font-mono tracking-widest uppercase text-white/25">
              Cam optional
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StackSlice({
  activeLayer,
  setActiveLayer,
}: {
  activeLayer: string;
  setActiveLayer: (id: string) => void;
}) {
  const { mono } = useVisualMode();
  const accent = mono ? "#111111" : "#00ACDF";
  const layer = STACK.find((s) => s.id === activeLayer) ?? STACK[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[10px] font-mono text-white/30 tracking-widest uppercase">
        <span className="flex-1 h-px bg-white/10" />
        Shared client stack
        <span className="flex-1 h-px bg-white/10" />
      </div>
      <p className="text-[11px] text-white/35 leading-relaxed max-w-2xl">
        Both install contexts run this vertical slice on the machine. Nothing
        here is a native shell—MediaPipe, Web Audio, and ONNX / SoundTouch stay
        in the browser; exports stay local.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-3">
        {/* Vertical stack visualization */}
        <div
          className="rounded-sm border border-white/10 p-3 space-y-1"
          style={{
            background: mono
              ? "rgba(0,0,0,0.03)"
              : "linear-gradient(180deg, rgba(8,14,35,0.6), rgba(4,6,14,0.9))",
          }}
        >
          <div className="text-[8px] font-mono tracking-widest uppercase text-white/25 mb-2 px-1">
            Browser tab (top → bottom)
          </div>
          {STACK.map((s, i) => {
            const on = activeLayer === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveLayer(s.id)}
                onMouseEnter={() => setActiveLayer(s.id)}
                className="w-full text-left rounded-sm border px-3 py-2.5 transition-colors relative"
                style={{
                  borderColor: on ? `${accent}77` : "rgba(255,255,255,0.1)",
                  background: on
                    ? mono
                      ? "rgba(17,17,17,0.08)"
                      : "rgba(0,172,223,0.12)"
                    : "rgba(255,255,255,0.02)",
                  marginLeft: `${i * 4}px`,
                  width: `calc(100% - ${i * 4}px)`,
                }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`text-[10px] font-mono tracking-widest uppercase ${
                      on ? "text-white/90" : "text-white/45"
                    }`}
                  >
                    {s.label}
                  </span>
                  <span className="text-[8px] font-mono text-white/25 truncate">
                    {s.tech}
                  </span>
                </div>
                {on ? (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full"
                    style={{ background: accent }}
                  />
                ) : null}
              </button>
            );
          })}
          <div className="pt-2 px-1 text-[8px] font-mono tracking-widest uppercase text-white/20">
            ↓ local disk · no cloud
          </div>
        </div>

        <div className="rounded-sm border border-white/10 bg-white/[0.03] p-4 space-y-2.5 min-h-[10rem] flex flex-col">
          <div className="text-[11px] font-mono tracking-widest uppercase text-white/70">
            {layer.label}
          </div>
          <p className="text-xs text-white/50 leading-relaxed">{layer.role}</p>
          <p className="text-xs text-white/40 leading-relaxed">{layer.detail}</p>
          <p className="text-[10px] font-mono text-white/25 tracking-wide pt-1 mt-auto">
            {layer.files}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ArchitectureSection() {
  return (
    <Section
      title="System architecture"
      lead="Fourier wasn’t only a URL. For VibeCon it lived as a guided station and as a walk-up sculpture—two physical contexts, one browser stack, then a suite that kept growing on the same foundations."
    >
      <SystemArchitecture />
    </Section>
  );
}

export function SystemArchitecture() {
  const [context, setContext] = useState<Context>("station");
  const [activeLayer, setActiveLayer] = useState("shell");
  const { mono } = useVisualMode();
  const cfg = CONTEXTS[context];

  return (
    <div className="space-y-10">
      <Block
        title="Install contexts"
        description="One client build, two social contracts. Toggle to see how hardware wiring changes while the stack stays put."
        why="Design the shell for the room first; ship mini-apps without inventing new chrome."
        source="VibeCon install · client-only stack · docs/portfolio"
      >
        <div className="space-y-4">
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
            <HardwareWiring context={context} />
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
        </div>
      </Block>

      <Block
        title="Tech stack & data flow"
        description="How signals move through the client—and which layer owns each hop."
      >
        <div className="space-y-8">
          <DataFlowDiagram />
          <StackSlice
            activeLayer={activeLayer}
            setActiveLayer={setActiveLayer}
          />
        </div>
      </Block>

      <Block title="Station vs sculpture">
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
      </Block>

      <Block
        title="After the install"
        description="Locking foundations at VibeCon made scaling into Looper, Grid, Arc, Gato, and Harmonizer tractable—and the same glass / mono language transferred to other Matte / Replit experiments."
      >
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
      </Block>
    </div>
  );
}
