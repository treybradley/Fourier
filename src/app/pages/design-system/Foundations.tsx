import { useVisualMode } from "../../hooks/useVisualMode";
import { Block, Section, Swatch } from "./shared";

const TOOL_ACCENTS = [
  { label: "Stem Collage", a: "#0059CE", b: "#FF64E3" },
  { label: "Loop Station", a: "#00EBB8", b: "#0030C5" },
  { label: "Grid", a: "#6DE700", b: "#FFF047" },
  { label: "Stem Separator", a: "#FFA100", b: "#97FC61" },
  { label: "Arc", a: "#009DFF", b: "#EB00F7" },
  { label: "Gato", a: "#AD1888", b: "#FF6100" },
  { label: "Harmonizer", a: "#FF4D6D", b: "#F59E0B" },
];

const SEMANTIC = [
  { label: "Background", hex: "#0a0a0f", cssVar: "--background", monoHex: "#ffffff" },
  { label: "Page bg", hex: "#04060e", cssVar: "--page-bg", monoHex: "#ffffff" },
  { label: "Foreground", hex: "rgba(255,255,255,0.85)", cssVar: "--foreground", monoHex: "#111111" },
  { label: "Card", hex: "rgba(255,255,255,0.04)", cssVar: "--card", monoHex: "rgba(0,0,0,0.04)" },
  { label: "Muted", hex: "rgba(255,255,255,0.35)", cssVar: "--muted-foreground", monoHex: "rgba(0,0,0,0.45)" },
  { label: "Border", hex: "rgba(255,255,255,0.08)", cssVar: "--border", monoHex: "rgba(0,0,0,0.15)" },
  { label: "Ring", hex: "rgba(139,92,246,0.5)", cssVar: "--ring", monoHex: "rgba(0,0,0,0.35)" },
  { label: "Radius", hex: "#1a1a22", cssVar: "--radius · 0.625rem", monoHex: "#e8e8e8" },
];

const TYPE_SAMPLES = [
  {
    label: "Brand / hub title",
    className: "text-lg font-medium tracking-[0.2em] uppercase text-white/90",
    sample: "Fourier",
  },
  {
    label: "Display hero",
    className: "text-3xl font-medium tracking-tight text-white/90",
    sample: "Create music",
  },
  {
    label: "Section / tool name",
    className: "text-xl font-medium tracking-widest uppercase text-white/90",
    sample: "Stem Collage",
  },
  {
    label: "Body",
    className: "text-sm text-white/40 leading-relaxed",
    sample: "An evolving suite of open, experimental music tools.",
  },
  {
    label: "Meta / mono",
    className: "text-[10px] font-mono tracking-widest uppercase text-white/30",
    sample: "Web-based music tools · v0.1",
  },
  {
    label: "Feature chip",
    className:
      "inline-block text-[9px] font-mono tracking-wider uppercase rounded-sm px-2 py-0.5 border border-white/8 text-white/30",
    sample: "4-track stem mixer",
  },
];

const SPACING = [4, 8, 12, 16, 24, 36, 48];

export function FoundationsSection() {
  const { mono } = useVisualMode();

  return (
    <Section
      title="Design System Foundations"
      lead="Color↔mono remaps, tool accents, type roles, spacing, radius, and glass/grain atmosphere—the constraints that let the suite grow without redesigning chrome."
    >
      <Block
        id="modes"
        title="Color atmospheres and mono paper"
        description="Color mode is a deep stage with cerulean atmosphere and grain. Mono collapses accents to ink on paper so the same tools read as an engineering schematic—useful for demos, docs, and room lighting."
        why="One toggle remaps the suite without a second product."
        source="src/styles/visual-mode.css · src/app/utils/visualMode.ts · useVisualMode"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-sm border border-white/10 overflow-hidden">
            <div
              className="h-24 relative"
              style={{
                background: mono
                  ? "#f3f3f3"
                  : [
                      "radial-gradient(ellipse 65% 55% at 10% 90%, rgba(0,100,186,0.32) 0%, transparent 70%)",
                      "radial-gradient(ellipse 50% 55% at 90% 10%, rgba(0,172,223,0.26) 0%, transparent 68%)",
                      "#04060E",
                    ].join(", "),
              }}
            />
            <div className="p-3 space-y-1 border-t border-white/10">
              <div className="text-[11px] font-mono tracking-widest uppercase text-white/70">
                {mono ? "Mono paper" : "Color stage"}
              </div>
              <p className="text-[11px] text-white/35 leading-relaxed">
                {mono
                  ? "White canvas, black ink, multiply grain. Accents flatten to #111."
                  : "Cerulean washes + screen grain over #04060E. Accents stay tool-colored."}
              </p>
            </div>
          </div>
          <div className="rounded-sm border border-white/10 p-4 space-y-3">
            <div className="text-[11px] font-mono tracking-widest uppercase text-white/70">
              Approach
            </div>
            <ul className="space-y-2 text-xs text-white/40 leading-relaxed">
              <li>
                <span className="text-white/60">Tone.</span> Scientific coolness on
                a dark stage; mono flips to schematic paper.
              </li>
              <li>
                <span className="text-white/60">Usage.</span> Structure via
                white/black alpha; tool accents ≤ sparse edge highlights and CTAs.
              </li>
              <li>
                <span className="text-white/60">Exempt.</span> Camera / compositor
                trees use{" "}
                <span className="font-mono text-white/50">data-visual-exempt</span>{" "}
                so recorded overlays stay on the color path.
              </li>
            </ul>
          </div>
        </div>
      </Block>

      <Block
        title="Tool accents"
        description="Each mini-app owns a two-stop ramp for hub cards, edge highlights, and CTAs. In mono both stops collapse toward ink."
        why="Identity per tool without inventing a new chrome kit."
        source="Home TOOLS accents · uiAccent() / accent()"
      >
        <div className="flex flex-wrap gap-4">
          {TOOL_ACCENTS.map((tool) => (
            <div key={tool.label} className="space-y-2 min-w-[7rem]">
              <div className="flex h-10 rounded-sm overflow-hidden border border-white/10">
                <div
                  className="flex-1"
                  style={{ background: mono ? "#111111" : tool.a }}
                />
                <div
                  className="flex-1"
                  style={{ background: mono ? "#555555" : tool.b }}
                />
              </div>
              <div className="text-[11px] text-white/70">{tool.label}</div>
              <div className="text-[9px] font-mono text-white/30">
                {mono ? "#111 → #555" : `${tool.a} → ${tool.b}`}
              </div>
            </div>
          ))}
        </div>
      </Block>

      <Block
        title="Semantic theme tokens"
        description="CSS variables consumed by shadcn-adjacent UI and page chrome. Toggle color/mono to verify remaps."
        source="src/styles/theme.css · src/styles/visual-mode.css"
      >
        <div className="flex flex-wrap gap-4">
          {SEMANTIC.map((token) => (
            <Swatch
              key={token.cssVar}
              label={token.label}
              hex={mono ? token.monoHex : token.hex}
              cssVar={token.cssVar}
            />
          ))}
        </div>
      </Block>

      <Block
        title="Typography"
        description="Roboto Mono for meta / chips / transport; medium sans for brand and tool titles. Hierarchy from hub → mini-app header → body."
        source="src/styles/fonts.css · Home / MiniAppHeader.tsx"
      >
        <div className="space-y-5 rounded-sm border border-white/10 p-5">
          {TYPE_SAMPLES.map((row) => (
            <div key={row.label} className="space-y-1.5">
              <div className="text-[9px] font-mono tracking-widest uppercase text-white/30">
                {row.label}
              </div>
              <div className={row.className}>{row.sample}</div>
            </div>
          ))}
        </div>
      </Block>

      <Block
        title="Spacing"
        description="4px base rhythm. Hub and mini-apps favor 16–36 for section gaps; chips and transport use 4–8."
      >
        <div className="flex flex-wrap items-end gap-3">
          {SPACING.map((px) => (
            <div key={px} className="flex flex-col items-center gap-2">
              <div
                className="rounded-sm bg-white/20"
                style={{ width: px, height: px }}
              />
              <span className="text-[9px] font-mono text-white/35">{px}</span>
            </div>
          ))}
        </div>
      </Block>

      <Block
        title="Radius"
        description="Nearly everything is rounded-sm — chips, cards, glass panels, transport. Soft enough for glass, sharp enough for a tool."
        why="One radius language across hub cards and mini-app chrome."
      >
        <div className="flex flex-wrap gap-4">
          {[
            { label: "sm · default", r: "0.125rem" },
            { label: "md", r: "calc(var(--radius) - 2px)" },
            { label: "lg · token", r: "var(--radius)" },
          ].map((item) => (
            <div key={item.label} className="space-y-2">
              <div
                className="w-20 h-14 border border-white/20 bg-white/[0.04]"
                style={{ borderRadius: item.r }}
              />
              <div className="text-[10px] font-mono text-white/40">{item.label}</div>
            </div>
          ))}
        </div>
      </Block>

      <Block
        title="Glass & grain"
        description="Glass Container uses ink-alpha borders, blur, and inset highlights. Page grain is a fixed SVG turbulence layer (screen in color, multiply in mono)."
        source="GlassContainer.tsx · .app-grain / .app-atmosphere"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {["Rest", "Selected", "Dense"].map((label, i) => (
            <div
              key={label}
              className="rounded-sm backdrop-blur-md border p-4 space-y-2"
              style={{
                borderColor:
                  i === 1
                    ? mono
                      ? "rgba(17,17,17,0.3)"
                      : "rgba(255,255,255,0.3)"
                    : mono
                      ? "rgba(17,17,17,0.1)"
                      : "rgba(255,255,255,0.1)",
                backgroundColor:
                  i === 1
                    ? mono
                      ? "rgba(17,17,17,0.1)"
                      : "rgba(255,255,255,0.1)"
                    : mono
                      ? "rgba(17,17,17,0.05)"
                      : "rgba(255,255,255,0.05)",
                boxShadow:
                  i === 1
                    ? mono
                      ? "0 8px 32px rgba(17,17,17,0.1), inset 0 1px 0 rgba(17,17,17,0.1)"
                      : "0 8px 32px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.1)"
                    : undefined,
              }}
            >
              <div className="text-[11px] font-mono tracking-widest uppercase text-white/70">
                {label}
              </div>
              <p className="text-[11px] text-white/35 leading-relaxed">
                {i === 0 && "Default glass panel — stem cards, rails."}
                {i === 1 && "Selected elevation — active stem / pad focus."}
                {i === 2 && "Hub card density — blur 18px + accent edge."}
              </p>
            </div>
          ))}
        </div>
      </Block>
    </Section>
  );
}
