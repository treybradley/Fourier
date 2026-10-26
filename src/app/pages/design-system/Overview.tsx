import { Block, CalloutGrid, Section, SpecTable } from "./shared";
import { SystemArchitecture } from "./SystemArchitecture";

export function OverviewSection() {
  return (
    <Section
      title="Design System Overview"
      lead="Fourier is a browser music suite that began as Matte Projects R&D for Replit’s VibeCon 2026. This page documents the shared tokens, chrome, and patterns a developer can implement—and how that UI was meant to live in a live install."
    >
      <CalloutGrid
        items={[
          {
            title: "Two visual modes",
            body: "Color reads as a dark stage tool; mono reads as a light engineering schematic. One product, remapped chrome—not a separate light theme.",
          },
          {
            title: "Honest empty states",
            body: "Prefer missing / empty over fake stems, BPM, or analysis. Waveforms stay blank until a buffer exists.",
          },
          {
            title: "Prototype → suite",
            body: "Lock foundations early (glass, headers, accents, color↔mono) so new mini-apps reuse the shell instead of inventing chrome.",
          },
          {
            title: "Dev-ready handoff",
            body: "Foundations, Components, Patterns, and Signal show production React—file paths included—not redrawn mocks.",
          },
        ]}
      />

      <SystemArchitecture />

      <Block
        title="Platform notes"
        description="Browser-only production UI. No native shell—the design system is the product surface."
      >
        <SpecTable
          rows={[
            {
              role: "Primary experience",
              detail:
                "Hub + mini-apps (Collage, Looper, Grid, Separator, Arc, Gato, Harmonizer)",
              note: "All client-side",
            },
            {
              role: "Color / theme",
              detail: "html[data-visual] + CSS vars + utility remaps",
              note: "useVisualMode",
            },
            {
              role: "Buttons / cards",
              detail: "Token-styled React; Glass Container + hub cards",
              note: "rounded-sm language",
            },
            {
              role: "Drawers / overlays",
              detail: "Radix dialog / sheet / tooltip where used",
              note: "Production only",
            },
            {
              role: "Signal surfaces",
              detail: "Canvas / SVG waveforms, pads, interval grid",
              note: "Live audio chrome",
            },
            {
              role: "Sessions / export",
              detail: "On-device audio + optional 9:16 compositor",
              note: "Local files",
            },
          ]}
        />
      </Block>

      <Block
        title="Responsive"
        description="Desktop-first for Studio-style tools and this reference. Mobile is browse / light control; camera + dense mixers assume larger surfaces."
      >
        <p className="text-xs text-white/40 leading-relaxed max-w-xl">
          Capture-adjacent tools (hand tracking, pads, multi-stem mixers) are
          designed for station installs and laptop demos. Phone web is a
          companion browse surface, not a full substitute for the sculpture.
        </p>
      </Block>

      <Block
        title="Accessibility"
        description="Intent: tonal scales for contrast, mono ink helpers, Radix focus where used. No formal WCAG audit yet."
      >
        <p className="text-xs text-white/40 leading-relaxed max-w-xl">
          Next pass: focus order across mini-app headers, waveform alternatives,
          and mono contrast pairs on accent chips.
        </p>
      </Block>

      <Block title="How to use">
        <ul className="list-disc pl-5 space-y-1.5 text-xs text-white/45 leading-relaxed max-w-xl">
          <li>Browse sections with the tabs above.</li>
          <li>
            Toggle <span className="font-mono text-white/60">color / mono</span>{" "}
            in the header to verify token remaps.
          </li>
          <li>
            Foundations carry rationale; Components / Patterns / Signal show
            production React implementations a developer can ship from.
          </li>
          <li>
            Embed with{" "}
            <span className="font-mono text-white/60">
              ?embed=1&amp;theme=color&amp;tab=overview
            </span>{" "}
            for portfolio iframes (architecture sits on Overview).
          </li>
        </ul>
      </Block>
    </Section>
  );
}
