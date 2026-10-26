# Fourier — portfolio copy (iframe-first)

Paste on  
https://www.treybradley.xyz/matte-projects-ai-vibecoding-rd

**No architecture / foundations / components PNGs.** Use the living design system iframes below.  
Keep intro + GitHub + **product** iframe; then these DS embeds.

Base: `https://fourier-sound.vercel.app`  
Query: `embed=1` · `theme=color|mono` · `tab=…` (opens at top of that tab)

Tabs: `overview` · `foundations` · `components` (Components & patterns) · `signal` · `architecture`  
(`tab=patterns` aliases to `components`.)

---

## Condensed Fourier structure

1. **Fourier** intro + GitHub + product iframe (`/`)
2. **Living design system** — one Overview iframe *or* split embeds below
3. **Station / sculpture** — Architecture tab iframe
4. **Color / mono** — Foundations tab iframe
5. Optional: components or signal iframe if you want a third beat
6. Closing → Ouracle

---

## Product demo

```html
<iframe
  src="https://fourier-sound.vercel.app/"
  title="Fourier — live demo"
  width="100%"
  height="720"
  style="border:0;border-radius:4px;"
  loading="lazy"
  allow="camera; microphone; autoplay"
></iframe>
```

---

## Design system — Overview

```html
<iframe
  src="https://fourier-sound.vercel.app/design-system?embed=1&theme=color&tab=overview"
  title="Fourier — Design System Overview"
  width="100%"
  height="900"
  style="border:0;border-radius:4px;"
  loading="lazy"
></iframe>
```

---

## Station install & sculpture → Architecture

```html
<iframe
  src="https://fourier-sound.vercel.app/design-system?embed=1&theme=color&tab=architecture"
  title="Fourier — System architecture (station & sculpture)"
  width="100%"
  height="960"
  style="border:0;border-radius:4px;"
  loading="lazy"
></iframe>
```

---

## One suite, two visual modes → Foundations

Toggle color/mono in the embed chrome.

```html
<iframe
  src="https://fourier-sound.vercel.app/design-system?embed=1&theme=color&tab=foundations"
  title="Fourier — Color atmospheres and mono paper"
  width="100%"
  height="720"
  style="border:0;border-radius:4px;"
  loading="lazy"
></iframe>
```

Optional mono default:

```html
<iframe
  src="https://fourier-sound.vercel.app/design-system?embed=1&theme=mono&tab=foundations"
  title="Fourier — Mono paper mode"
  width="100%"
  height="720"
  style="border:0;border-radius:4px;"
  loading="lazy"
></iframe>
```

---

## Optional extras (if you want a third beat)

**Components**

```html
<iframe
  src="https://fourier-sound.vercel.app/design-system?embed=1&theme=color&tab=components"
  title="Fourier — Design System Components"
  width="100%"
  height="800"
  style="border:0;border-radius:4px;"
  loading="lazy"
></iframe>
```

**Signal (waveforms / Arc chroma)**

```html
<iframe
  src="https://fourier-sound.vercel.app/design-system?embed=1&theme=color&tab=signal"
  title="Fourier — Signal surfaces"
  width="100%"
  height="900"
  style="border:0;border-radius:4px;"
  loading="lazy"
></iframe>
```

**Components & patterns** (shell · stage · controls)

```html
<iframe
  src="https://fourier-sound.vercel.app/design-system?embed=1&theme=color&tab=components"
  title="Fourier — Components & patterns"
  width="100%"
  height="960"
  style="border:0;border-radius:4px;"
  loading="lazy"
></iframe>
```

---

## Lean recommendation (3 embeds total)

| Order | What | iframe |
|-------|------|--------|
| 1 | Product | `/` |
| 2 | Station / sculpture | `…/design-system?embed=1&theme=color&tab=architecture` |
| 3 | Color / mono | `…/design-system?embed=1&theme=color&tab=foundations` |

Skip foundations/components PNGs and the full Overview iframe if those three already tell the story. Reader can open tabs inside any DS embed to explore further.

---

## Paste copy (short)

### Fourier
*(keep tightened intro + GitHub + product iframe)*

### Living design system *(optional H3 if you only use the two section iframes below, skip this)*
After VibeCon I kept iterating on a living design system in the app—tokens, production components, patterns, signal surfaces, and install architecture—so the suite could grow without redesigning the shell.

### Station install and interactive sculpture
Fourier ran as a guided hardware station and a walk-up floor sculpture on the same client stack. Explore the interactive architecture:

*(architecture iframe — `tab=architecture`)*

### One suite, two visual modes
A color/mono toggle remaps chrome across the hub of mini-apps—stage tool or engineering schematic:

*(foundations iframe — `tab=foundations`)*

### Closing
Fourier is the VibeCon install that kept going as a product. Below: Ouracle…

---

## Meta

**Live:** https://fourier-sound.vercel.app/  
**Design system:** https://fourier-sound.vercel.app/design-system  
**Figma:** https://www.figma.com/design/lOA7qbbZngiZhPcbqnAmhk  
**GitHub:** https://github.com/treybradley/Fourier  
