# Fourier — portfolio sections (paste below the live demo)

Use **exactly these four sections**. Each image appears **once**. The live app above already shows interaction—do not re-walk the click flow.

**Images in this folder**

| File | Section |
|------|---------|
| `01-stem-collage.png` | 1 — core UX |
| `02-suite-modes.png` | 2 — suite + color/mono |
| `03-design-foundations.png` | 3 — foundations |
| `04-design-components.png` | 3 — components |
| `05-architecture.png` | 4 — bridge |

---

## Intro line (optional, under the iframe)

Fourier began as Matte Projects R&D for Replit’s VibeCon 2026 workshop. Among several Make/Replit prototypes from that contract, it’s the one I fully carried into a productized design-engineering showcase.

---

## 1. Make the workshop immediately playable

**Header:** Hand-tracked mixing without installs

Workshop guests needed something they could open in a browser and play within minutes—no plugins, no accounts. Stem Collage is the primary job: load stems, mix live, and optionally drive volume and pitch with MediaPipe hand tracking. The glass chrome and atmosphere keep the surface readable on a projector while still feeling like a music tool, not a slide deck.

**Image:** `01-stem-collage.png`  
**Caption:** Stem Collage — the gesture mixer built for VibeCon playability.

---

## 2. One suite, two visual modes

**Header:** Color atmospheres and mono paper, same tools

Beyond the demo moment, Fourier is a hub of mini-apps: looper, grid sampler, stem separator, set planner, concatenative explorer, and harmonizer. A color/mono toggle remaps chrome across the suite so the same product can read as a dark stage tool or a light engineering schematic—useful for demos, docs, and different room lighting. Annotations on the board spell out what each surface does without repeating the live walkthrough.

**Image:** `02-suite-modes.png`  
**Caption:** Home hub in color and mono, with one-line jobs for each mini-app.

---

## 3. Design system from the live product

**Header:** Tokens and patterns from the real interface

As the prototype became a maintained product, I documented the system from production—not the unused shadcn folder. Foundations cover the dark canvas, glass alphas, Roboto Mono type roles, spacing scale, radius, grain/atmosphere, per-tool accent pairs, and the color↔mono remap. Components focus on GlassContainer, hub cards, headers, HUD chips, transport/pads, and the unique algorithmic surfaces (corpus scatter, interval grid).

**Image:** `03-design-foundations.png`  
**Caption:** Color, mono, type styles, spacing, accents, and glass tokens from the live app.

**Image:** `04-design-components.png`  
**Caption:** UI patterns plus the annotated color/mono suite map.

---

## 4. Bridge to the rest of the Matte / VibeCon work

**Header:** From workshop prototype to product thread

Fourier sits next to other Matte experiments on this page—Ouracle Playground, Code as a Medium, Prompt Sculptor—but it is the only one I fully built out as a fullstack design-engineering product. The architecture diagram shows what’s live today (Web Audio, MediaPipe hands, ONNX stems, export) and dashed next steps. Scroll down for the adjacent R&D that stayed closer to one-off installations and Make prototypes.

**Image:** `05-architecture.png`  
**Caption:** Today’s browser stack vs dashed next (shared projects, unused CV hooks, deeper hosting).

**Closing line:** Fourier is the VibeCon prototype that became the lasting product. Keep scrolling for Ouracle, Code as a Medium, and Prompt Sculptor—the sibling Matte / Replit experiments from the same period.

---

## Meta

**Role:** Creative Technology · Product Design · Design Engineering  
**Live:** https://fourier-sound.vercel.app/  
**Portfolio:** https://www.treybradley.xyz/matte-projects-ai-vibecoding-rd  
**Figma:** https://www.figma.com/design/lOA7qbbZngiZhPcbqnAmhk  
**GitHub:** https://github.com/treybradley/Fourier
