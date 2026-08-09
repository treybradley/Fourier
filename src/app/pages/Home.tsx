import { Link } from "react-router";
import { motion } from "motion/react";

const TOOLS = [
  {
    id: "stem-collage",
    slug: "stem-collage",
    index: "01",
    name: "STEM COLLAGE",
    tagline: "Multi-stem mixer",
    description:
      "Load up to 4 audio stems and mix them live. Optional hand control for volume and pitch; keys 1–4 jump to cues.",
    features: [
      "4-track stem mixer",
      "Optional hand control",
      "Cue points (keys 1–4)",
    ],
    status: "available" as const,
    accentA: "#0059CE",
    accentB: "#FF64E3",
    tagColor: "text-[#a78bfa]/80",
  },
  {
    id: "loop-station",
    slug: "loop-station",
    index: "02",
    name: "LOOP STATION",
    tagline: "Multi-track looper",
    description:
      "Inspired by the Boss RC-505 MK2, record, overdub, and layer audio in real time. Use headphones for the best experience.",
    features: [
      "5 independent tracks",
      "Overdub & layering",
      "Hands-free control",
    ],
    status: "available" as const,
    accentA: "#00EBB8",
    accentB: "#0030C5",
    tagColor: "text-[#6ee7d0]/80",
  },
  {
    id: "gato",
    slug: "gato",
    index: "04",
    name: "GATO CAT (SYNTH)",
    tagline: "Concatenative synthesis explorer",
    description:
      "Upload any audio and scatter its grains across a 2D feature space. Navigate the corpus to trigger grains in real time.",
    features: [
      "Corpus analysis",
      "6 audio features",
      "Hand-tracked",
    ],
    status: "available" as const,
    // Papaya: #AD1888 → #FF6100
    accentA: "#AD1888",
    accentB: "#FF6100",
    tagColor: "text-[#f472b6]/80",
  },
  {
    id: "grid",
    slug: "grid",
    index: "05",
    name: "GRID",
    tagline: "Sampler & Sequencer",
    description:
      "Drag in audio, assign to 9 pads, play live. Step sequencer, mic recording, session record, WAV export.",
    features: ["9 pads", "Step sequencer", "Live mode"],
    status: "available" as const,
    accentA: "#6DE700",
    accentB: "#FFF047",
    tagColor: "text-[#62FF00]/80",
  },
  {
    id: "arc",
    slug: "arc",
    index: "06",
    name: "ARC",
    tagline: "Music planning workspace",
    description:
      "Design the musical journey of a DJ set or mashup. Import tracks, analyze compatibility, and visualize the emotional arc of your project.",
    features: [
      "Track analysis",
      "Bridge scoring",
      "Story visualization",
    ],
    status: "available" as const,
    accentA: "#009DFF",
    accentB: "#EB00F7",
    tagColor: "text-[#009DFF]/80",
  },
  {
    id: "stem-separator",
    slug: "stem-separator",
    index: "03",
    name: "STEM SEPARATOR",
    tagline: "Open source separation",
    description:
      "Drop any track and isolate vocals, drums, bass, and other instruments — fully in the browser.",
    features: [
      "4-stem separation",
      "Runs locally",
      "WAV export",
    ],
    status: "available" as const,
    accentA: "#FFA100",
    accentB: "#97FC61",
    tagColor: "text-[#fbbf24]/80",
  },
];

export function Home() {
  return (
    <div
      className="min-h-screen w-full overflow-hidden"
      style={{ background: "#04060E" }}
    >
      {/* Cerulean gradient atmosphere */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 65% 55% at 10% 90%, rgba(0,100,186,0.32) 0%, transparent 70%)",
            "radial-gradient(ellipse 50% 55% at 90% 10%, rgba(0,172,223,0.26) 0%, transparent 68%)",
            "radial-gradient(ellipse 45% 40% at 50% 50%, rgba(0,134,203,0.10) 0%, transparent 70%)",
          ].join(", "),
        }}
      />
      {/* Grain noise */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          opacity: 0.12,
          mixBlendMode: "screen",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.30' numOctaves='9' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "160px 160px",
        }}
      />

      <div className="relative min-h-screen flex flex-col px-6 md:px-12 py-10 max-w-6xl mx-auto">
        {/* Header */}
        <motion.header
          className="flex items-start justify-between mb-9"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <div className="text-white/90 text-lg font-medium tracking-[0.2em] uppercase">
              Fourier
            </div>
            <div className="text-white/30 text-[10px] tracking-widest uppercase mt-0.5">
              Web-based music tools
            </div>
          </div>
          <div className="text-white/20 text-[10px] font-mono tracking-widest mt-1">
            v0.1
          </div>
        </motion.header>

        {/* Hero */}
        <motion.div
          className="mb-9"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <h1 className="text-4xl md:text-4xl font-medium text-white/90 tracking-tight leading-none mb-4">
            Create music
            <br />
            <span className="text-white/35">
              in the browser.
            </span>
          </h1>
          <p className="text-white/40 text-sm max-w-md leading-relaxed">
            An evolving suite of open, experimental music tools.
            No plugins, no installs. by{" "}
            <a
              href="https://instagram.com/tresbradley"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white/90 transition-colors"
            >
              @tresbradley
            </a>
          </p>
        </motion.div>

        {/* Tool cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
          {TOOLS.map((tool, i) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.2 + i * 0.1,
              }}
            >
              <ToolCard tool={tool} />
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <motion.footer
          className="mt-9 pt-6 border-t border-white/5 flex items-center justify-between"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <span className="text-white/20 text-[10px] tracking-widest uppercase font-mono">
            Fourier — Web Audio Suite
          </span>
        </motion.footer>
      </div>
    </div>
  );
}

type Tool = (typeof TOOLS)[number];

function ToolCard({ tool }: { tool: Tool }) {
  const isAvailable = tool.status === "available";

  const inner = (
    <div
      className={[
        "relative h-full rounded-sm border p-6 flex flex-col gap-5",
        "transition-[border-color] duration-300",
        isAvailable
          ? "[border-color:var(--ab-dim)] hover:[border-color:var(--ab-bright)]"
          : "[border-color:rgba(255,255,255,0.08)]",
      ].join(" ")}
      style={
        {
          "--ab-dim": `${tool.accentA}4D`,
          "--ab-bright": `${tool.accentA}99`,
          background: "rgba(8,14,35,0.40)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          cursor: isAvailable ? "pointer" : "default",
          opacity: isAvailable ? 1 : 0.6,
        } as React.CSSProperties
      }
    >
      {/* Top edge highlight */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-sm"
        style={{
          background: isAvailable
            ? `linear-gradient(90deg, transparent, ${tool.accentA}70, ${tool.accentB}70, transparent)`
            : "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
        }}
      />

      {/* Name + tagline */}
      <div>
        <h2 className="text-white/90 text-xl font-medium tracking-widest uppercase leading-none mb-1.5">
          {tool.name}
        </h2>
        <p
          className={`text-[11px] font-mono tracking-wider uppercase ${tool.tagColor}`}
        >
          {tool.tagline}
        </p>
      </div>

      {/* Description */}
      <p className="text-white/40 text-xs leading-relaxed flex-1">
        {tool.description}
      </p>

      {/* Feature pills */}
      <div className="flex flex-wrap gap-1.5">
        {tool.features.map((f) => (
          <span
            key={f}
            className="text-[9px] font-mono tracking-wider uppercase text-white/30 border border-white/8 rounded-sm px-2 py-0.5"
          >
            {f}
          </span>
        ))}
      </div>

      {/* CTA */}
      <button
        className={[
          "w-full py-2.5 rounded-sm border text-xs font-mono tracking-widest uppercase",
          "transition-[border-color,background-color] duration-200",
          "disabled:text-white/25 disabled:border-white/10",
          isAvailable
            ? "text-white/70 hover:text-white/95 [border-color:var(--ab-dim)] hover:[border-color:var(--ab-bright)] [background-color:var(--ab-bg)] hover:[background-color:var(--ab-bg-hover)]"
            : "",
        ].join(" ")}
        style={
          isAvailable
            ? ({
                "--ab-dim": `${tool.accentA}50`,
                "--ab-bright": `${tool.accentA}90`,
                "--ab-bg": `${tool.accentA}12`,
                "--ab-bg-hover": `${tool.accentA}22`,
              } as React.CSSProperties)
            : {}
        }
        disabled={!isAvailable}
        tabIndex={isAvailable ? 0 : -1}
      >
        {isAvailable ? "Enter →" : "Coming soon"}
      </button>
    </div>
  );

  return isAvailable && tool.slug ? (
    <Link
      to={`/${tool.slug}`}
      className="block h-full no-underline"
    >
      {inner}
    </Link>
  ) : (
    <div className="h-full">{inner}</div>
  );
}