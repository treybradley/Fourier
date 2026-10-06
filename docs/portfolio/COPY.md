# Fourier — portfolio sections (paste below the live demo)

Use **exactly these four sections**. Each image appears **once**. The live app above already shows interaction—do not re-walk the click flow.

**Images in this folder**

| File | Section |
|------|---------|
| `01-stem-collage.png` | 1 — core UX |
| `02-suite-modes.png` | 2 — suite + color/mono |
| `03-design-foundations.png` | 3 — foundations |
| `04-design-components.png` | 3 — components |
| `05-architecture.png` | 4 — VibeCon → product architecture |

---

## Intro line (optional, under the iframe)

Fourier began as Matte Projects R&D for Replit’s VibeCon 2026 workshop. Among several Make/Replit prototypes from that contract, it’s the one I fully carried into a productized design-engineering showcase—by locking foundations and components early enough to keep iterating.

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

## 3. Foundations and components that let the suite grow

**Header:** A system built so I could iterate without redesigning the shell

After VibeCon, the constraint wasn’t “one more demo”—it was adding instruments without starting from scratch each time. I pulled foundations from the live UI (type roles, spacing, glass, accents, color↔mono) and a component set that every mini-app could reuse: GlassContainer, headers, hub cards, HUD chips, transport/pads, and tool-specific surfaces like the interval grid and corpus scatter. That system is what made scaling from a workshop mixer into a full suite tractable.

**Image:** `03-design-foundations.png`  
**Caption:** Foundations — tokens for color/mono, type, spacing, accents, and glass.

**Image:** `04-design-components.png`  
**Caption:** Components — shared chrome and patterns reused across mini-apps.

---

## 4. Architecture from VibeCon to product

**Header:** Workshop surface → suite → design system as the scale layer

The architecture follows the same path as the project: a single VibeCon playable surface, then a browser suite under one hub, with foundations and components acting as the layer that made expansion possible. Runtime stays client-side—MediaPipe interaction, Web Audio / ONNX / SoundTouch engines, UI shell, and local export. Sibling Matte experiments from the same period (Ouracle, Code as a Medium, Prompt Sculptor) stayed closer to one-off prototypes; Fourier is the one that used a shared system to keep going.

**Image:** `05-architecture.png`  
**Caption:** VibeCon → suite expansion → design system scale layer, beside the browser runtime stack.

**Closing line:** Fourier is the VibeCon prototype that became the lasting product. Keep scrolling for Ouracle, Code as a Medium, and Prompt Sculptor—the sibling Matte / Replit experiments from the same period.

---

## Meta

**Role:** Creative Technology · Product Design · Design Engineering  
**Live:** https://fourier-sound.vercel.app/  
**Portfolio:** https://www.treybradley.xyz/matte-projects-ai-vibecoding-rd  
**Figma:** https://www.figma.com/design/lOA7qbbZngiZhPcbqnAmhk  
**GitHub:** https://github.com/treybradley/Fourier
