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

Fourier began as Matte Projects R&D for Replit’s VibeCon 2026—meant to run on a computer station tied to real hardware for guided demos with a guest music producer, and as a standalone interactive hardware sculpture. It’s also the prototype I carried further by locking foundations and components early enough to keep iterating.

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

**Header:** Station install and sculpture, then a suite that could grow

Fourier wasn’t only a URL. For VibeCon it was designed to live on a computer station connected to real hardware—so a guest music producer could run guided demos and presentations—and as a standalone interactive sculpture guests could walk up to on the floor. The software architecture follows that path: a playable install surface, a multi-tool hub on the same machine, and foundations/components as the layer that made adding instruments practical. Runtime stays client-side (MediaPipe, Web Audio / ONNX / SoundTouch, UI shell, local export). That same cohesive system also transferred to other Matte / VibeCon builds, keeping consistency without reinventing the shell each time.

**Image:** `05-architecture.png`  
**Caption:** Guided station + interactive sculpture contexts, then suite expansion on a shared browser stack.

**Closing line:** Fourier is the VibeCon install that kept going as a product. Keep scrolling for Ouracle, Code as a Medium, and Prompt Sculptor—other Matte / Replit experiments from the same period.

---

## Meta

**Role:** Creative Technology · Product Design · Design Engineering  
**Live:** https://fourier-sound.vercel.app/  
**Portfolio:** https://www.treybradley.xyz/matte-projects-ai-vibecoding-rd  
**Figma:** https://www.figma.com/design/lOA7qbbZngiZhPcbqnAmhk  
**GitHub:** https://github.com/treybradley/Fourier
