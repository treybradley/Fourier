# Arc — Sixth Fourier Mini-App (Music Planning Workspace)

## Context

Arc is a browser-native creative planning workspace for DJs, producers, and mashup artists. It helps users design the musical journey of a set or mashup before performing or producing it. The app has two workspaces: **Plan** (track list with bridge analysis) and **Story** (zoomed-out visualization of how music evolves). Gradient: **#EB00F7 → #00DF8B**.

---

## Visual Identity

- **Background**: `#070510`
- **Radial glows**: magenta `rgba(235,0,247,0.22)` at top-left, green `rgba(0,223,139,0.18)` at bottom-right, mid-purple at center
- **Accent A**: `#EB00F7` — active states, import CTA, selected track ring
- **Accent B**: `#00DF8B` — energy highlights, Story curves, compatibility scores
- **Tag color**: `text-[#e879f9]/80`
- **Page pattern**: follows `GridPage.tsx` exactly

---

## Layout — Two Workspaces (toggled from header)

```
┌──────────────────────────────────────────────────────┐
│ ← Fourier | ARC | [PLAN] [STORY] | Project title    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  PLAN: stacked draggable track cards + bridges       │
│  STORY: SVG layered area curves, toggleable layers   │
└──────────────────────────────────────────────────────┘
```

---

## New Files

| File                                        | Purpose                                                                                                                                                    |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/pages/ArcPage.tsx`                 | Page shell — gradient, grain, header, `<ArcApp />`                                                                                                         |
| `src/app/components/arc/ArcApp.tsx`         | Orchestrator: `useReducer` state, import handler, workspace switching                                                                                      |
| `src/app/components/arc/PlanWorkspace.tsx`  | PLAN view: scrollable list of `TrackCard` + `BridgeCard` interleaved                                                                                       |
| `src/app/components/arc/StoryWorkspace.tsx` | STORY view: SVG layered visualization with layer toggles                                                                                                   |
| `src/app/components/arc/TrackCard.tsx`      | Collapsed + expanded track card; HTML5 drag-to-reorder                                                                                                     |
| `src/app/components/arc/BridgeCard.tsx`     | Auto-computed compatibility scores + editable notes fields                                                                                                 |
| `src/app/components/arc/ImportZone.tsx`     | Drag-drop / file picker overlay; shows analysis progress per file                                                                                          |
| `src/app/hooks/useArcAnalyzer.ts`           | Audio analysis: BPM (reuse `bpm-detective`), key/Camelot (chromagram + Krumhansl-Schmuckler), energy, brightness, spectral balance, vocal density estimate |

---

## Existing Files to Modify

| File                                | Change                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------ |
| `src/app/pages/Home.tsx`            | Add Arc to TOOLS array (index "06", slug "arc")                          |
| `src/app/routes.ts`                 | Add `{ path: "arc", Component: ArcPage }` wrapped with `wrap(ArcLoader)` |
| `src/app/components/PageLoader.tsx` | Add `ArcLoader` export (#EB00F7 / #00DF8B)                               |

---

## State (`ArcApp.tsx` — `useReducer`)

```typescript
type Track = {
  id: string;
  title: string;
  artist: string;
  duration: number; // seconds
  bpm: number | null;
  key: string | null; // e.g. "Cm", "F#"
  camelot: string | null; // e.g. "5A", "10B"
  energy: number; // 0–1 RMS
  brightness: number; // 0–1 high-freq ratio
  spectralBalance: number; // 0–1 spectral centroid
  vocalDensity: number; // 0–1 midrange estimate
  notes: string;
  cueReminders: string;
  analyzing: boolean;
};

type Bridge = {
  id: string; // `${fromId}__${toId}`
  transitionNotes: string;
  loopIdeas: string;
  fxIdeas: string;
  cueReminders: string;
  mashupIdeas: string;
};

type ArcState = {
  projectTitle: string;
  projectType: "djset" | "mashup";
  tracks: Track[];
  bridges: Record<string, Bridge>; // keyed by bridge id
  activeTab: "plan" | "story";
  expandedTrackId: string | null;
  storyLayers: Record<
    | "energy"
    | "tempo"
    | "harmonic"
    | "brightness"
    | "spectralBalance"
    | "vocalDensity",
    boolean
  >;
};
```

Actions: `ADD_TRACKS`, `REORDER_TRACKS`, `UPDATE_TRACK`, `REMOVE_TRACK`, `UPDATE_BRIDGE`, `SET_TAB`, `SET_EXPANDED`, `TOGGLE_STORY_LAYER`, `SET_PROJECT_TITLE`, `SET_PROJECT_TYPE`.

---

## Audio Analysis (`useArcAnalyzer.ts`)

Uses `AudioContext` for decoding. Analysis runs async per file:

- **Duration**: `audioBuffer.duration`
- **BPM**: `bpm-detective` (already installed — `import { guess } from "bpm-detective"`)
- **Key / Camelot**: 12-bin chromagram via DFT → Krumhansl-Schmuckler key profiles correlation → pick winning key → map to Camelot wheel
- **Energy**: RMS of full mix (`sqrt(mean(samples^2))`) normalized to 0–1
- **Brightness**: ratio of energy above 4kHz to total energy (FFT-based)
- **Spectral balance**: normalized spectral centroid (low=bass-heavy, high=bright)
- **Vocal density**: energy ratio in 500Hz–3kHz band

Hook signature:

```ts
function useArcAnalyzer(): {
  analyzeFile: (file: File) => Promise<Partial<Track>>;
};
```

---

## Bridge Compatibility Scores (computed, not stored)

Derived live from track pair data — no storage needed:

```ts
function bridgeCompat(
  a: Track,
  b: Track,
): {
  bpm: number; // 1 - clamp(|a.bpm - b.bpm| / 20, 0, 1)
  harmonic: number; // Camelot wheel distance mapped 0–6 → 1.0–0.0
  energy: number; // 1 - |a.energy - b.energy|
  overall: number; // weighted average (bpm 0.35, harmonic 0.4, energy 0.25)
};
```

Camelot distance: parse numeric + letter, check same-key (distance 0), adjacent numeric (distance 1), relative major/minor same number (distance 1). Max meaningful distance = 6.

---

## Plan Workspace

- Scrollable column, `max-w-2xl mx-auto`
- Import zone at top when no tracks; sticky `+` button when tracks exist
- `TrackCard` (collapsed): flex row — drag handle, index, title/artist, duration, BPM badge, key badge, Camelot badge
- `TrackCard` (expanded): adds notes textarea, cue reminders textarea below the row
- `BridgeCard`: sits between every adjacent pair; shows 4 compat bars + editable accordion fields

**Drag-to-reorder**: HTML5 `draggable`. `onDragStart` stores dragged index, `onDragOver` shows insertion line, `onDrop` dispatches `REORDER_TRACKS`.

---

## Story Workspace

- SVG full-width, ~300px tall, inside a scrollable container
- X-axis: track positions (evenly spaced); X labels = track titles
- Y-axis: 0–1 normalized per layer
- Each layer: monotone cubic spline → `<path>` with low-opacity fill + colored stroke
- Layer toggle chips row above SVG
- Hover: vertical crosshair + tooltip with track name + values
- Click a data point: switches to PLAN tab + expands that track

Layer colors:

- energy → `#00DF8B`
- tempo → `#EB00F7`
- harmonic → `#60a5fa`
- brightness → `#fbbf24`
- spectralBalance → `#f472b6`
- vocalDensity → `#a78bfa`

Tracks still `analyzing` shown as dashed/grayed segments.

---

## Homepage Entry

```typescript
{
  id: "arc",
  slug: "arc",
  index: "06",
  name: "ARC",
  tagline: "Set/mashup planning and analysis workspace",
  description: "Design the musical journey of a DJ set or mashup. Import tracks, analyze compatibility, and visualize the emotional arc of your project.",
  features: ["Track analysis", "Compatibility scoring", "Story visualization"],
  status: "available" as const,
  accentA: "#EB00F7",
  accentB: "#00DF8B",
  tagColor: "text-[#e879f9]/80",
}
```

---

## Shared Utilities to Reuse

- `src/app/utils/audioUtils.ts`: `isValidAudioFile`, `isFileSizeValid`
- `bpm-detective`: already installed, `import { guess } from "bpm-detective"`
- `PageLoader` generic component and existing loader pattern from `PageLoader.tsx`

---

## Verification

1. "ARC" card at index 06 on homepage with magenta→green gradient
2. `/arc` loads — gradient atmosphere visible, brief loading screen
3. Drag an MP3 onto the import zone → analysis begins, progress shown, track card appears
4. Add 3+ tracks → bridges appear between each pair with compat scores
5. Drag-reorder tracks → order updates, bridges recompute
6. Expand a track card → notes and cue reminder fields appear
7. Edit bridge fields → values persist in state
8. Switch to STORY → layered SVG curves render for all tracks
9. Toggle layers on/off → curves show/hide
10. Click a point in STORY → jumps to PLAN with that track expanded

---

# Grid — Fifth Fourier Mini-App (Browser Sampler)

## Context

Grid is a Roland SP-404MKII-inspired sampling app for Fourier. Users import audio via drag-drop, file picker, or microphone, assign samples to 16 pads, play live via keyboard/mouse, and build loops with a 16-step sequencer — single screen, no modals. Gradient: **Flash** `#F70080` → `#D5CE17`.

---

## Visual Identity

- **Background**: `#0A0509`
- **Radial glows**: pink `rgba(247,0,128,0.26)` at 8% 88%, yellow `rgba(213,206,23,0.20)` at 92% 12%, mid-pink `rgba(200,0,80,0.06)` at center
- **Accent A**: `#F70080` — pad borders, active states, sequencer playhead
- **Accent B**: `#D5CE17` — selected pad ring, secondary highlights
- **Tag color**: `text-[#fb7185]/80`
- **Page pattern**: follow `GatoPage.tsx` exactly (outer div + 3 radial gradients + grain + `relative h-full flex flex-col p-4 gap-4`)

---

## Layout — Two Modes (toggled from header)

Transport (Play/Stop/BPM) and mode toggle live in the header row. The sequencer continues running when you switch modes — pads flash in LIVE mode while the sequence plays.

**LIVE mode** (default):

```
┌──────────────────────────────────────────────────────┐
│ ← Fourier | GRID | [LIVE] [SEQ] | [▶] [■] [BPM]   │
├───────────────────────────┬──────────────────────────┤
│                           │                          │
│     4×4 Pad Grid          │   Sample Inspector       │  flex-1 min-h-0
│     (primary)             │   Waveform + controls    │
│                           │                          │
└───────────────────────────┴──────────────────────────┘
```

**SEQ mode**:

```
┌──────────────────────────────────────────────────────┐
│ ← Fourier | GRID | [LIVE] [SEQ] | [▶] [■] [BPM]   │
│                                                      │
│  Sequencer: 16 rows × 16 steps (full height)        │  flex-1 min-h-0
│  Pad label | ● ○ ○ ● ○ ○ ○ ● ○ ○ ○ ● ○ ○ ○ ●     │
│  ...                                                 │
└──────────────────────────────────────────────────────┘
```

Switching modes mid-playback is seamless — `currentStep` and `isPlaying` state are shared.

---

## New Files

| File                                          | Purpose                                                                                                |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `src/app/pages/GridPage.tsx`                  | Page shell — Flash gradient, grain, header, motion wrapper                                             |
| `src/app/components/grid/GridApp.tsx`         | Orchestrator: `useReducer` state + keyboard listeners + LIVE/SEQ layout switch                         |
| `src/app/components/grid/GridEngine.ts`       | Web Audio engine + YouTube IFrame API management: lazy AudioContext, pad playback, lookahead scheduler |
| `src/app/components/grid/PadGrid.tsx`         | 4×4 grid of `PadCard` components (LIVE mode)                                                           |
| `src/app/components/grid/PadCard.tsx`         | Individual pad: mini waveform/YouTube icon, name, shortcut badge, active flash                         |
| `src/app/components/grid/SampleInspector.tsx` | Right panel (LIVE mode): audio controls or YouTube URL/cue input depending on pad type                 |
| `src/app/components/grid/Sequencer.tsx`       | Full-height sequencer (SEQ mode): 16 rows × 16 steps, playhead                                         |
| `src/app/components/grid/Transport.tsx`       | Play, Stop, BPM input, LIVE/SEQ mode toggle (rendered in header)                                       |
| `src/app/components/grid/useGridRecorder.ts`  | Hook: MediaRecorder → AudioBuffer for mic recording                                                    |

---

## Existing Files to Modify

| File                                | Change                                               |
| ----------------------------------- | ---------------------------------------------------- |
| `src/app/pages/Home.tsx`            | Add Grid to TOOLS array (index "05", Flash gradient) |
| `src/app/routes.ts`                 | Add lazy GridPage route + `GridLoader` import        |
| `src/app/components/PageLoader.tsx` | Add `GridLoader` export (Flash colors, index "05")   |

---

## YouTube Pad Support

Pads support two source types. YouTube pads use the **YouTube IFrame Player API** (`YT.Player`) — no server, no audio extraction, no CORS issues. The video plays in a hidden `<div>`, and the API controls play/seek/stop. Limitations vs audio pads: no Web Audio processing (no trim, rate/pitch, gain, reverse), no WAV export.

```typescript
type PadSource =
  | { type: "audio" } // local file or recorded buffer
  | { type: "youtube"; videoId: string; cueTime: number }; // seconds from start
```

**Loading YouTube IFrame API**: inject `<script src="https://www.youtube.com/iframe_api">` once on mount. `window.onYouTubeIframeAPIReady` resolves a Promise used by `GridEngine`.

**YouTube playback**: `player.seekTo(cueTime, true); player.playVideo()` on trigger. `player.pauseVideo()` on step end (if step duration < video remainder) — or just let it play naturally for one-shot feel. Each YouTube pad gets one hidden `YT.Player` instance (16 max, created lazily).

**Inspector for YouTube pads**: URL/link input (parse `videoId` from standard YouTube URL formats), cue time input (number field in seconds, or a future scrubber). Features that require AudioBuffer are hidden/disabled.

**Sequencer**: YouTube pads participate normally — the step toggle works, playhead triggers `player.seekTo + playVideo`.

**WAV export**: YouTube pads are skipped with a note in the export.

---

## State (in `GridApp.tsx` — `useReducer`)

```typescript
type Pad = {
  id: number; // 0–15
  source: PadSource;
  // Audio-pad fields:
  buffer: AudioBuffer | null;
  reverseBuffer: AudioBuffer | null; // pre-computed when reverse toggled on
  fileName: string | null;
  trimStart: number; // 0.0–1.0
  trimEnd: number; // 0.0–1.0
  rate: number; // 0.25–4.0, default 1.0
  gain: number; // 0.0–1.0, default 1.0
  reverse: boolean;
};

type GridMode = "live" | "seq";

type GridState = {
  pads: Pad[]; // 16 items
  selectedPadId: number | null;
  pattern: boolean[][]; // [padId][step], 16×16
  bpm: number; // default 120
  isPlaying: boolean;
  currentStep: number; // 0–15, -1 when stopped
  mode: GridMode; // "live" | "seq"
};
```

Actions: `LOAD_SAMPLE`, `LOAD_YOUTUBE`, `SELECT_PAD`, `TOGGLE_STEP`, `SET_BPM`, `PLAY`, `STOP`, `STEP_ADVANCE`, `UPDATE_PAD_PARAM`, `TOGGLE_REVERSE`, `CLEAR_PAD`, `SET_MODE`.

---

## Audio Engine (`GridEngine.ts`)

```typescript
class GridEngine {
  private _ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeSources: Map<number, AudioBufferSourceNode[]> =
    new Map();

  get ctx(): AudioContext; // lazy init, checks "closed" state (pattern from existing apps)

  playPad(padId: number, pad: Pad): void;
  // New AudioBufferSourceNode per call (cannot reuse after stop)
  // Uses pad.reverseBuffer if pad.reverse, else pad.buffer
  // offset = trimStart * duration; duration = (trimEnd - trimStart) * duration
  // source.playbackRate.value = pad.rate
  // Polyphonic: multiple simultaneous sources per pad

  stopAll(): void;
  dispose(): void; // AudioContext.close() on unmount
}
```

**Reverse buffer**: Pre-compute via `OfflineAudioContext` when `reverse` toggled on. Non-destructive.

**Lookahead scheduler** (avoids `setInterval` drift):

```typescript
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_SEC = 0.1;

startScheduler(pads, pattern, bpm, onStep: (step: number) => void): void
stopScheduler(): void
// onStep fires to update currentStep in React state (drives playhead)
```

---

## Keyboard Map

```typescript
const KEY_TO_PAD: Record<string, number> = {
  "1": 0,
  "2": 1,
  "3": 2,
  "4": 3,
  q: 4,
  w: 5,
  e: 6,
  r: 7,
  a: 8,
  s: 9,
  d: 10,
  f: 11,
  z: 12,
  x: 13,
  c: 14,
  v: 15,
};
```

`keydown` → `engine.playPad()` + `SELECT_PAD`. Guard against key-repeat. `useEffect` in `GridApp.tsx`.

---

## Pad Card Design

- Border: dim accent empty, bright accent loaded, ring glow on active/playing
- Mini waveform canvas: drawn once on buffer assign (reuse canvas pattern from `StemSeparatorResults.tsx`)
- Keyboard shortcut badge in bottom-right corner
- Active flash: CSS `@keyframes` animation on trigger (no JS timer)
- Drag target: `dragover`/`drop` on each pad

---

## Sample Inspector (right panel)

- **Waveform canvas** (~120px tall) with trim markers as vertical lines
- **Trim Start** / **Trim End** sliders (range inputs, `--thumb-color: #F70080`, fill-style `--track-bg`)
- **Rate** slider (0.25–4.0, displayed as `0.5×` etc.)
- **Gain** slider (0.0–1.0)
- **Reverse** toggle button
- **Clear** button
- **Record** button → `useGridRecorder` → assigns buffer to selected pad

All params via `UPDATE_PAD_PARAM`. No modals.

---

## Sequencer Layout

```
      1  2  3  4 ... 16
Pad 1 ●  ○  ○  ●  ...
Pad 2 ○  ○  ○  ●  ...
...
```

- Row label: pad number + truncated filename or "––"
- Step buttons: `12×12px` circles — `bg-white/10` off, `#F70080` on
- Playhead: highlighted column at `currentStep`
- Empty pad rows dimmed but clickable (preprogram before loading samples)

---

## Export

**WAV**: `OfflineAudioContext` renders loop (16 steps × beat duration), encode using `audioBufferToWav()` already in `src/app/hooks/useStemSeparator.ts`. Download via blob URL.

**Project JSON**: Serialize `GridState`, each `pad.buffer` base64-encoded as WAV. `reverseBuffer` omitted (recomputed). Save as `.fourier-grid.json`. Load via file picker.

---

## Shared Utilities to Reuse

- `src/app/utils/audioUtils.ts`: `decodeAudioFile`, `isValidAudioFile`, `isFileSizeValid`, `formatTime`
- `src/app/hooks/useStemSeparator.ts`: `audioBufferToWav` — reuse directly for WAV export
- Canvas waveform pattern from `src/app/components/separator/StemSeparatorResults.tsx`
- Range input CSS vars (`--thumb-color`, `--track-bg`) from `src/styles/theme.css`
- `PageLoader` generic component from `src/app/components/PageLoader.tsx`
- Lazy AudioContext + `AudioBufferSourceNode` lifecycle patterns from existing engines

---

## Homepage Entry

```typescript
{
  id: "grid",
  slug: "grid",
  index: "05",
  name: "GRID",
  tagline: "Browser-native sampler",
  description: "Drag in audio, assign to pads, play live. A 16-pad sampler with step sequencer — entirely in the browser.",
  features: ["16 pads", "Step sequencer", "Mic recording"],
  status: "available" as const,
  accentA: "#F70080",
  accentB: "#D5CE17",
  tagColor: "text-[#fb7185]/80",
}
```

---

## Verification

1. Grid card at index 05 on homepage with Flash gradient (pink→yellow)
2. `/grid` loads — Flash atmosphere visible, brief loading screen
3. Drag an MP3 onto a pad → waveform in pad card and inspector
4. Press `Q` → that pad plays audio one-shot
5. Press `1` + `Q` + `A` + `Z` simultaneously → polyphonic
6. Paste a YouTube URL into a pad inspector → pad shows YouTube icon; pressing pad key plays from cue time
7. Switch to SEQ mode → full-width sequencer visible
8. Toggle steps for several pads, press Play → sequence loops at BPM
9. Switch back to LIVE mode while playing → pads flash in sync with sequence; keyboard triggers still work
10. Change BPM mid-playback → tempo updates live
11. Trim start/end (audio pad) → next playback uses trimmed region
12. Reverse toggle → plays backwards
13. Record button → mic audio assigned to selected pad
14. Export WAV → downloads rendered loop (YouTube pads skipped with note)
15. Export JSON → downloads, re-import restores all pads and pattern

---

# Gato — Fourth Signal Mini-App (Concatenative Synthesis)

## Context

The user built a working browser-based CataRT-style concatenative synthesis explorer (documented in `plans/CataRT-Reference.md`) and wants it integrated as a fourth mini-app in Signal, named **Gato** (Spanish for "cat" → from **con**cate**nat**ive). The app slices an audio file into grains, extracts 6 per-grain audio features, plots them as a 2D scatter cloud, and plays grains on hover/click — all in the browser, no server.

---

## Gradient & Visual Identity

**Gradient:** _Cosmic_ — `#5B00D4` (deep violet) → `#00E8D4` (electric teal). Unused by the other three apps, evokes the star-field / particle scatter aesthetic of a corpus plot, and pairs naturally with the cyan-tinted active-grain glow (replacing the original emerald green).

**Homepage card** (new entry in `TOOLS` array, `src/app/pages/Home.tsx`):

```ts
{
  id: "gato", slug: "gato", index: "04", name: "GATO",
  tagline: "Concatenative synthesis explorer",
  description: "Upload any audio and scatter its grains across a 2D feature space. Navigate the corpus with your mouse or index finger to trigger grains in real time.",
  features: ["Corpus analysis", "6 audio features", "Hand-tracked"],
  status: "available" as const,
  accentA: "#5B00D4", accentB: "#00E8D4", tagColor: "text-[#a78bfa]/80",
}
```

**Page background** (`src/app/pages/GatoPage.tsx`):

- Base: `#050410`
- Radial glows: violet `rgba(91,0,212,0.24)` at bottom-left, teal `rgba(0,232,212,0.18)` at top-right, mid-purple fill at center

**Accent color replacements** (everywhere the original used `emerald-*`):

- Active grain glow / crosshair: `#00E8D4`
- Slider `accent-color`: `#5B00D4`
- Interaction mode active button: `bg-[#5B00D4]`

---

## Layout Adaptation

**Top bar**: Signal's standard back-link + centered title pattern. Spinner right-aligned during corpus analysis.

**Two-panel layout** (fills remaining height, `react-resizable-panels`):

- **Left panel** (default 27%, min 22%, max 42%): `bg-black/20 backdrop-blur-sm border-r border-white/8`
- **Resize handle**: 4px — `bg-white/5 hover:bg-[#5B00D4]/50 transition-colors`
- **Right panel**: Corpus canvas, full height

Left panel styling (zinc → Signal dark):

- Section labels: `text-[10px] uppercase tracking-widest font-mono text-white/25`
- Upload zone: `border-white/15 hover:border-[#00E8D4]/40 bg-white/[0.02]`
- Sliders: `accent-color: #5B00D4`
- Dropdowns: `bg-white/[0.06] border border-white/10 text-white/70 text-xs rounded-sm`
- Mode toggle: inactive = `bg-white/[0.06] text-white/40`, active = `bg-[#5B00D4] text-white`
- Footer hint: `text-white/20 text-[9px] font-mono`

**Canvas**: dark fill (`#050410`), original HSL pitch-hue grain dots, active grain glow `#00E8D4`, crosshair `rgba(0,232,212,0.8)`.

---

## New Files

| File                                           | Contents                                                                                                                                                                                                                          |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/pages/GatoPage.tsx`                   | Page shell with Cosmic gradient + grain noise. Wraps `GatoApp`. Standard Signal header.                                                                                                                                           |
| `src/app/components/gato/GatoApp.tsx`          | Main component: all state (`appState`, `grains`, `activeGrainId`, `cursorPos`, `xAxis`, `yAxis`, `interactionMode`, slider values), `GranularEngine` ref, composes `GatoControls` + `CorpusCanvas`.                               |
| `src/app/components/gato/GranularEngine.ts`    | Pure TS class. Lazy `AudioContext` getter, `setBuffer`, `playOnce` (8ms attack / 20ms release), `dispose`. Ported directly from reference.                                                                                        |
| `src/app/components/gato/featureExtraction.ts` | Pure TS. `extractGrains(buffer, grainSizeMs, overlapFactor, onProgress)` → `Promise<Grain[]>`. 256-pt DFT, 6 features, min-max normalization, chunked async (yield every 50 grains). Exports `Grain`, `FeatureKey`, `getNormKey`. |
| `src/app/components/gato/CorpusCanvas.tsx`     | Canvas component. Props: `grains`, `xAxis`, `yAxis`, `activeGrainId`, `cursorPos`, `onGrainHover`, `onGrainClick`. All draw state via `useRef`. ResizeObserver. Tooltip overlay div.                                              |
| `src/app/components/gato/GatoControls.tsx`     | Left panel: file upload, grain size / overlap sliders, axes dropdowns, interaction mode toggle, footer status. Signal-styled.                                                                                                     |
| `src/app/components/gato/CameraTracker.ts`     | Plain TS. Lazy `import('@tensorflow/tfjs')` + `import('@tensorflow-models/hand-pose-detection')`. `init(onPosition, canvasW, canvasH)` and `stop()`. Index fingertip → mirrored canvas coordinates.                               |

---

## Existing Files to Modify

| File                     | Change                                                          |
| ------------------------ | --------------------------------------------------------------- |
| `src/app/pages/Home.tsx` | Add `TOOLS[3]` entry (index "04", slug "gato", Cosmic gradient) |
| `src/app/routes.ts`      | Add `{ path: "gato", Component: GatoPage }`                     |

---

## Dependencies to Install

```bash
pnpm add react-resizable-panels
pnpm add @tensorflow/tfjs @tensorflow-models/hand-pose-detection
```

TF.js is lazy-loaded — does not affect initial bundle size.

---

## Verification

1. "GATO" card at index 04 on homepage with violet→teal gradient
2. `/gato` loads with Cosmic atmosphere, two-panel layout visible
3. Upload MP3 → "Analyzing…" spinner, progress bar, grains scatter on canvas
4. Mouse hover triggers grain (one-shot, no repeat on same grain)
5. Click grain → plays immediately
6. Swap X/Y axes → scatter redraws
7. Change grain size / overlap → Reanalyze → corpus updates
8. Camera mode → webcam activates, index fingertip drives cursor
9. Tooltip follows cursor with correct feature values
10. Back to homepage → audio stops (dispose on unmount)

---

# Stem Separator — Third Signal Mini-App

## Context

The user built a working browser-based stem separator in a separate project and documented it thoroughly in `stem-separation-in-browser.md`. This plan adapts that implementation into a third Signal mini-app following the existing page/context/route pattern. The tool separates any uploaded audio file into four stems (Vocals, Drums, Bass, Other) entirely in the browser using Open-Unmix ONNX models via `onnxruntime-web`.

---

## UX Flow

1. User uploads an MP3 or WAV (reuses `isValidAudioFile` + `isFileSizeValid` from `src/app/utils/audioUtils.ts`)
2. App downloads the 4 ONNX models (~108 MB each) from HuggingFace — cached in Cache API after first use, progress shown per model
3. Separation pipeline runs sequentially: Vocals → Drums → Bass → Other (~2–4 min for a 3-min song)
4. Results panel shows 4 waveforms with individual play/pause, mute, and WAV download
5. Optional stretch: "Send to Stem Collage" button that passes the 4 AudioBuffers to the Stem Collage page via sessionStorage or React context at router level

---

## Technical Architecture

### ONNX Pipeline (from `stem-separation-in-browser.md`)

**Dependency:** `npm install onnxruntime-web@1.27.0`

**Model source:** `https://huggingface.co/chinedudave06/demucs-onnx/resolve/main/umxl_{vocals,drums,bass,other}.onnx`

**Exact parameters — must not deviate:**

- `n_fft = 4096`, `n_hop = 1024`, `n_bins = 2049`, `sr = 44100`
- Tensor shape: `[1, 2, 2049, 100]` (batch, channels, bins, frames)
- Window: Hann
- Last chunk zero-padded to exactly 100 frames
- Memory layout: `channel * NB_BINS * CHUNK_T + bin * CHUNK_T + frame`

**8-step pipeline:**

1. Resample to 44100 Hz via `OfflineAudioContext` (reuses pattern from `AudioEngineContext.tsx`)
2. STFT both channels → magnitude + phase arrays
3. Chunk into 100-frame segments, zero-pad last
4. Load model → run inference per chunk (yield to event loop every ~10 chunks) → release session
5. Repeat for each of 4 stems
6. ISTFT: separated magnitude + original phase → overlap-add → AudioBuffer

**STFT/ISTFT:** Hand-rolled (no external DSP library). Hann window, overlap-add reconstruction. Implemented directly in `useStemSeparator.ts`.

**OOM prevention:** Load → infer → `session.release()` → next model. Never load more than one model at a time.

---

## New Files

### `src/app/pages/StemSeparatorPage.tsx`

Page component wrapping `<StemSeparatorProvider>`. Layout:

- Left column: upload zone (pre-separation) or source waveform (post-upload)
- Right column: 4 stem result cards (hidden until separation complete)
- Full-width progress panel during separation

### `src/app/contexts/StemSeparatorContext.tsx`

Manages all state:

```ts
type StemSeparatorState = {
  sourceFile: File | null;
  sourceBuffer: AudioBuffer | null;
  stage:
    "idle" | "downloading" | "separating" | "done" | "error";
  modelProgress: Record<StemName, number>; // 0–1 download progress
  stemProgress: Record<StemName, number>; // 0–1 inference progress
  results: Record<StemName, AudioBuffer | null>;
  error: string | null;
};
```

Exposes: `loadFile(file)`, `startSeparation()`, `play(stem)`, `pause(stem)`, `downloadStem(stem)`

### `src/app/hooks/useStemSeparator.ts`

Core separation logic — the STFT/ISTFT/ONNX pipeline. Called by context. Returns progress callbacks. No React dependencies — pure async functions that can be tested in isolation.

### `src/app/components/separator/StemSeparatorUpload.tsx`

Drag-drop upload with file validation. Reuses `isValidAudioFile` / `isFileSizeValid` from `audioUtils.ts`. Same visual style as `FileUploader.tsx`.

### `src/app/components/separator/StemSeparatorProgress.tsx`

Shows two progress phases:

- **Model download**: 4 rows with per-model progress bar (skips if cached)
- **Separation**: 4 rows with per-stem inference progress + active stem indicator

### `src/app/components/separator/StemSeparatorResults.tsx`

4 stem cards (Vocals / Drums / Bass / Other), each with:

- Stem name + color accent
- Waveform using existing `Waveform.tsx` component
- Play/pause via Web Audio `AudioBufferSourceNode`
- Mute toggle
- WAV download (manual PCM header construction — no external lib)

---

## Existing Files to Modify

| File                     | Change                                                               |
| ------------------------ | -------------------------------------------------------------------- |
| `src/app/routes.ts`      | Add `{ path: "stem-separator", Component: StemSeparatorPage }`       |
| `src/app/pages/Home.tsx` | Add third entry to `TOOLS` array (index "03", slug "stem-separator") |

### Home.tsx TOOLS entry

```ts
{
  id: "stem-separator",
  slug: "stem-separator",
  index: "03",
  name: "STEM SEPARATOR",
  tagline: "AI-powered source separation",
  description: "Drop any track and isolate vocals, drums, bass, and other instruments — fully in the browser. Powered by Open-Unmix ONNX models, no uploads to any server.",
  features: ["4-stem separation", "Runs locally", "WAV export"],
  status: "available",
  // Taffeta gradient: #00FDD9 → #EA00B8 (teal to magenta — distinct from Surge + Lunar Sky)
  accentA: "#00FDD9",
  accentB: "#EA00B8",
  tagColor: "text-[#6efff0]/80",
}
```

### Page background gradient (Taffeta)

Same radial glow pattern as other pages:

- `#00FDD9` glow at bottom-left, `#EA00B8` glow at top-right, base `#060510`

---

## Stem Color Palette (matches border convention from LoopTrack)

- Vocals: `#EA00B8` (magenta — Taffeta end)
- Drums: `#00FDD9` (teal — Taffeta start)
- Bass: `#0059CE` (Lunar Sky blue)
- Other: `#00EBB8` (Surge teal)

---

## WAV Export

Simple inline PCM encoder (no library). Write 44-byte RIFF/WAV header + interleaved 16-bit PCM samples from the AudioBuffer's channel data. ~30 lines of code.

---

## Verification

1. `npm install onnxruntime-web@1.27.0` succeeds
2. New card appears on Home page at index "03" with Taffeta accent
3. Navigate to `/stem-separator` — upload zone renders
4. Drop a short MP3 — model download begins with per-model progress bars
5. Second visit: models load from Cache API immediately (no re-download)
6. Separation completes → 4 result cards appear with waveforms
7. Play each stem individually — audio is isolated correctly
8. Download Vocals as WAV — file opens in audio player

---

# Foot Pedal + Hand Gesture Audio Effects (Loop Station)

## Context

The eyebrow-raise gesture for start/stop recording is too laggy and hard to time precisely. The user wants a USB foot pedal to handle recording control instead, freeing up camera gestures for live audio effects.

---

## Part 1 — USB Foot Pedal Support

### How foot pedals present to the browser

Most consumer USB foot pedals fall into one of three categories:

- **Keyboard-emulating** — press pedal, it sends Space/Enter/F key. The existing Space bar handler in `LooperContext.tsx` already catches these with no extra work.
- **Gamepad/HID** — registers as a USB gamepad (most common for single/triple-pedal units). Accessible via the **Gamepad API** (`navigator.getGamepads()`).
- **MIDI** — presents as a MIDI device.

**Chosen approach: Gamepad API** as the primary new addition, keeping the existing keyboard Space handler. Covers the widest range of inexpensive USB pedals, no permission prompt required.

### New hook: `src/app/hooks/useFootPedal.ts`

```ts
export function useFootPedal(onPress: () => void) {
  // RAF loop polling navigator.getGamepads()
  // Rising-edge detection: fires once when any button transitions false → true
  // Returns: { connected: boolean }
}
```

### Changes to `LooperPage.tsx`

- Add `useFootPedal(recordStop)`
- Remove eyebrow-as-recording-trigger: stop passing `recordStop` to `useFaceTracking` (currently line 26). Face tracking stays active (still needed for shared video stream for hand tracking).
- Add a small "● Pedal connected / ○ No pedal" chip to the camera panel

---

## Part 2 — Hand Gesture Audio Effects

### Effects to add (pure Web Audio API — no external files)

**1. Low-pass filter** (`BiquadFilterNode`, type `'lowpass'`)

- Cutoff: 200 Hz → 18 kHz (effectively transparent at max)
- Gesture: **right hand wrist Y position** — wrist high = bright, wrist low = muffled
- Exponential curve for musical feel

**2. Delay** (`DelayNode` + feedback `GainNode`)

- Wet mix: 0 → 0.6, feedback ~0.4, time ~0.3 s
- Gesture: **right hand pinch distance** — closed = dry, open wide = wet

### Audio graph change in `LooperContext.tsx`

Current: `trackGain → masterGain → destination`

New: `trackGain → masterGain → filterNode → delayWetMix → destination`
(delay feedback loop tapped after filterNode)

New context methods: `setFilterCutoff(hz)`, `setDelayWet(0–1)`

### New hook: `src/app/hooks/useLooperEffects.ts`

```ts
export function useLooperEffects({ rightHand, looper }) {
  // rightHand.wrist.y → setFilterCutoff (exponential, smoothed α=0.15)
  // rightHand.pinchDistance → setDelayWet (linear 0–120px → 0–0.6, smoothed)
}
```

Used in `LooperPage.tsx` alongside existing hooks.

### UI additions in `LooperFaceCamera.tsx`

Two small chips near the existing eyebrow indicator:

- `FILTER 12.4 kHz` — live update as wrist moves
- `DELAY 42%` — live update as pinch opens

---

## Files to Modify

| File                                             | Change                                                                            |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| `src/app/hooks/useFootPedal.ts`                  | **New** — Gamepad API polling, rising-edge detection                              |
| `src/app/hooks/useLooperEffects.ts`              | **New** — wrist → filter, pinch → delay                                           |
| `src/app/contexts/LooperContext.tsx`             | Add filterNode + delayNode; expose `setFilterCutoff`, `setDelayWet`               |
| `src/app/pages/LooperPage.tsx`                   | Wire `useFootPedal`, `useLooperEffects`; remove eyebrow-to-record; add pedal chip |
| `src/app/components/looper/LooperFaceCamera.tsx` | Add pedal indicator + effect readout chips                                        |

---

## Verification

1. Connect USB foot pedal → "Pedal connected" chip appears in camera panel
2. Press pedal → recording starts/stops (same as Space bar)
3. Space bar still works as keyboard fallback
4. Enable camera, play a loop, raise/lower right wrist → filter cutoff changes audibly
5. Open/close right hand pinch distance → delay wet fades in/out
6. Eyebrow raises no longer trigger recording

---

# Gesture Zone + Waveform Pitch Scaling

## Context

Three related refinements to the stem collage gesture and waveform UX:

1. **Pitch zone too wide** — current zone spans 35% of display width; user wants it slimmer
2. **Volume zone** — mirror the pitch zone on the left side; Y controls volume (up=loud, down=quiet) when left hand pinches inside it, replacing the current pinch-distance-based volume
3. **Waveform pitch scaling** — at higher pitch the waveform currently scrolls faster; user wants constant visual scroll speed with the waveform appearing "skinnier" (compressed) at high pitch and "wider" at low pitch

---

## Change 1 — Slim pitch zone

**`src/app/hooks/useHandTracking.ts`**

Adjust `PITCH_ZONE` xMin to reduce display width from ~35% → ~20%:

```ts
// Before
export const PITCH_ZONE = {
  xMin: 0.05,
  xMax: 0.4,
  yMin: 0.15,
  yMax: 0.75,
};
// After (landmark x space; display is mirrored so displayWidth = (xMax-xMin)*w)
export const PITCH_ZONE = {
  xMin: 0.18,
  xMax: 0.4,
  yMin: 0.15,
  yMax: 0.75,
};
```

---

## Change 2 — Volume zone on left side

### How the left side maps

The display is mirrored (`scaleX(-1)` on video). Left side of the mirrored display = high raw landmark x values:

- `displayX_norm = 1 - lm.x`
- Left display region (0%–35%): `lm.x > 0.65`

```ts
export const VOLUME_ZONE = {
  xMin: 0.62,
  xMax: 0.84,
  yMin: 0.15,
  yMax: 0.75,
};
```

Display position: x from `(1-0.84)*w = 16%` to `(1-0.62)*w = 38%` — mirrors pitch zone width.

### ProcessedHand additions (`useHandTracking.ts`)

Add `isPinchInVolumeZone: boolean` and `volumeZoneNormalizedY: number` to `ProcessedHand`, computed in `processHand()` from the thumb/index midpoint, same pattern as pitch zone.

### Drawing (`useHandTracking.ts` → `drawOverlay`)

Inside the `showPitchZone` block, also draw the volume zone:

- Same dashed-rect style as pitch zone
- Color: rose (`rgba(251,113,133,...)`) to match the existing volume chip color
- Label: "VOL" with "↕"
- Tick line at current Y when left hand pinches inside zone
- Active state (brighter) when `left?.isPinching && left?.isPinchInVolumeZone`

### Gesture logic (`useGestureController.ts`)

Replace the current pinch-distance volume block with zone-Y volume:

```ts
// Before: pinchDistance / 50 → volume
// After:
if (leftHand.isPinching && leftHand.isPinchInVolumeZone) {
  const rawVolume = 2.0 - leftHand.volumeZoneNormalizedY * 2.0; // top=2, bottom=0
  // smooth + send to audio engine
}
```

Open/close play/pause logic is **unchanged**.

---

## Change 3 — Waveform pitch scaling

### Current behavior

`scrollOffset = 50 - (progress * 300)` where `progress = currentTime / duration`.

At pitch=2.0, `currentTime` advances at 2× wall-clock speed → waveform scrolls 2× faster visually.

### New behavior

- Waveform path x-coordinates are scaled by `1/pitch` (skinnier at high pitch, wider at low pitch)
- Scroll speed becomes constant: `scrollOffset = 50 - (progress * 300 / pitch)`

**Proof of constant speed:** At pitch=2.0, audio completes in `duration/2` wall-clock seconds. Waveform is `300/2 = 150` units wide. Scroll traverses 150 units in `duration/2` seconds → same px/sec as pitch=1.0 (300 units in `duration` seconds). ✓

### Implementation (`src/app/components/Waveform.tsx`)

1. Add `pitch?: number` prop (default `1.0`)
2. Scale the waveform path: wherever the SVG path x is computed as `(i / N) * 300`, replace with `(i / N) * (300 / pitch)`
3. Update scroll: `50 - (progress * 300 / pitch)`

### Passing pitch down (`src/app/components/StemVisualizer.tsx`)

Pass `stem.pitch` to `<Waveform pitch={stem.pitch} />`.

---

## Files to Modify

| File                                    | Change                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/app/hooks/useHandTracking.ts`      | Slim PITCH_ZONE; add VOLUME_ZONE + isPinchInVolumeZone + volumeZoneNormalizedY; draw volume zone |
| `src/app/hooks/useGestureController.ts` | Replace pinch-distance volume with zone-Y volume                                                 |
| `src/app/components/Waveform.tsx`       | Add pitch prop; scale path x and scrollOffset by 1/pitch                                         |
| `src/app/components/StemVisualizer.tsx` | Pass stem.pitch to Waveform                                                                      |

---

## Verification

1. Open stem collage, enable camera — pitch zone (right) should be noticeably narrower
2. Volume zone (left, rose color) should be visible at matching height
3. Left-hand pinch inside volume zone + move up/down → volume chip changes, audio volume changes
4. Left-hand open → pause still works (unchanged)
5. Upload stem, play it at pitch=1.0 → waveform scrolls normally
6. Set pitch to 2.0 → waveform appears skinnier/compressed but scrolls at same visual speed
7. Set pitch to 0.5 → waveform appears wider/stretched, same scroll speed

---

# BPM-Aware Pitch Display

## Context

BPM detection via `bpm-detective` already runs on every stem upload and stores `detectedBpm` in `StemState`. `StemVisualizer` already shows `detectedBpm × pitch` in its header. However, two places still show pitch as a raw percentage:

1. **`AudioControls.tsx`** pitch label — shows `Math.round(pitch * 100)%`
2. **`WebcamFeed.tsx`** gesture chip — shows "PITCH X%"

The goal: when `detectedBpm` is known, replace the percentage with the resulting BPM (`detectedBpm × pitchRatio`). Fall back to percentage when no BPM is detected.

## Changes

### 1. `AudioControls.tsx`

- Add `detectedBpm?: number` prop
- Change pitch label: when `detectedBpm` present → `{Math.round(detectedBpm * pitch)} BPM`, else `{Math.round(pitch * 100)}%`

### 2. `StemVisualizer.tsx`

- Pass `stem.detectedBpm` down to `<AudioControls detectedBpm={stem.detectedBpm} />`
- (The outer BPM display in StemVisualizer header is already correct — no change needed there)

### 3. `WebcamFeed.tsx`

- Add `selectedStemBpm?: number | null` prop
- Compute `pitchRatio = 2.0 - rightHand.pitchZoneNormalizedY * 1.5` (already used for `pitchPct`)
- Pitch chip: when `selectedStemBpm` present → `{Math.round(selectedStemBpm * pitchRatio)} BPM`, else `PITCH {pitchPct}%`

### 4. `StemCollagePage.tsx`

- Pass `selectedStemBpm={audioEngine.stems[selectedStem]?.detectedBpm ?? null}` to `<WebcamFeed>`

## Files to Modify

| File                                    | Change                                                          |
| --------------------------------------- | --------------------------------------------------------------- |
| `src/app/components/AudioControls.tsx`  | Add `detectedBpm?` prop; swap pitch label to BPM when available |
| `src/app/components/StemVisualizer.tsx` | Pass `detectedBpm` to `AudioControls`                           |
| `src/app/components/WebcamFeed.tsx`     | Add `selectedStemBpm?` prop; swap chip to BPM when available    |
| `src/app/pages/StemCollagePage.tsx`     | Pass `selectedStemBpm` to `WebcamFeed`                          |

## Verification

1. Upload a stem — BPM should appear in the StemVisualizer header (already works)
2. Pitch slider label should now show e.g. "128 BPM" instead of "100%"
3. Move slider — label updates to e.g. "142 BPM"
4. Enable camera, pinch in pitch zone — gesture chip shows "142 BPM" not "PITCH 111%"
5. Upload a stem with no detectable BPM — both labels fall back to percentage display

---

# StemCollagePage Layout Width Fix

## Context

User set `lg:w-[80%]` on the camera feed container and `lg:w-[20%]` on the stem list, but the widths had no effect. Root cause: both containers also have `flex-1` which compiles to `flex: 1 1 0%`. The `flex-basis: 0%` + `flex-grow: 1` combination means the flex algorithm distributes space based on growth, completely ignoring the `width` property.

## Fix

Add `lg:flex-none` to both containers. `flex-none` = `flex: 0 0 auto`, which tells the flex algorithm to respect the element's `width` instead of growing.

**`src/app/pages/StemCollagePage.tsx`** — two divs in the `lg:flex-row` content area:

```
// Camera feed container
flex-1 min-h-0  →  flex-1 lg:flex-none lg:w-[80%] min-h-0

// Stem list container
flex-1 min-h-0 ...  →  flex-1 lg:flex-none lg:w-[20%] min-h-0 ...
```

Mobile behavior (`flex-col`) is unchanged — `flex-1` still applies below `lg`.

---

# Pitch Control — Pitch Zone

## Context

Right wrist X-position was controlling pitch continuously, causing accidental changes on any incidental hand movement. The new approach: designate a visible **pitch zone** on the camera feed. Pitch only responds when the user pinches _inside_ that zone, and Y-position (up = higher pitch, down = lower) controls value. Outside the zone, pitch is frozen. This makes intent unambiguous and matches the natural mental model (pitch as vertical height).

---

## Design

- A semi-transparent **pitch zone rectangle** is drawn on the webcam canvas overlay (e.g. right-center of frame, roughly 30% wide × 60% tall)
- When right hand is **pinching** AND the **index tip** (or thumb-index midpoint) is inside the zone → pitch control is live
- Y position within the zone maps to pitch: top of zone = max pitch (2.0), bottom = min pitch (0.5)
- When pinch exits the zone, or hand opens, pitch locks at current value
- The zone should have a visual active state (brighter border / fill) when a pinch is detected inside it

### Zone dimensions (normalized, relative to video frame)

```
x: 0.55 → 0.95  (right side of frame)
y: 0.15 → 0.75  (center vertically, avoids chin/forehead)
```

These are tunable constants. Will be drawn mirrored on the display canvas (so right side of video = left side of mirrored display).

### Pitch mapping

```
pitchY = (pinchPos.y - zone.yMin) / (zone.yMax - zone.yMin)  // 0 = top, 1 = bottom
pitch  = lerp(2.0, 0.5, pitchY)                               // inverted: top = high
```

Smoothing (alpha 0.12) and change threshold (0.03) remain the same.

---

## Implementation Plan

### 1. Define pitch zone constants

Add to `useGestureController.ts` (or a shared constants file):

```ts
const PITCH_ZONE = { x1: 0.55, x2: 0.95, y1: 0.15, y2: 0.75 };
```

### 2. Update pitch logic in `useGestureController.ts`

Replace the current wrist-X pitch block (lines 55–64) with:

- Check `isPinching` (right hand)
- Compute pinch position: midpoint of `thumbTip` and `indexTip` (or just `indexTip`)
- Check if position is inside `PITCH_ZONE`
- If inside zone: map `pos.y` → pitch via the inverted lerp above, apply smoothing
- If outside zone or not pinching: no pitch update (value holds)

Remove the `!isPinching` guard that was protecting wrist-X — pinch is now the _activation_ for pitch.

**Note:** right-hand pinch is also used for stem cycling (800ms debounce). Stem cycling should only fire when the pinch is **outside** the pitch zone. This separates the two cleanly: pinch in zone = pitch drag, pinch outside zone = stem cycle.

### 3. Draw pitch zone in `WebcamFeed.tsx` (or hand tracking overlay)

The webcam overlay canvas (`overlayCanvasRef` from `useHandTracking`) is the right place since it already draws per-frame. Add zone drawing to `drawOverlay()` in `useHandTracking.ts`:

```
- Draw zone border (thin, white/10 opacity normally)
- When pinch is inside zone: highlight border (amber, higher opacity) + subtle fill
- Draw a small horizontal tick mark at current pitch Y position inside the zone
- Optional: label "PITCH ↕" at top of zone
```

Since the canvas is mirrored via `scaleX(-1)` on the video but coordinates are pre-flipped in `toPixel()`, draw the zone using the same `toPixel()`-style coordinate system (mirror x: `displayX = (1 - normalizedX) * canvasWidth`).

### 4. Update gesture reference table

In `WebcamFeed.tsx` (pre-start gesture guide), update:

- Old: `R - Slide left/right → Pitch`
- New: `R - Pinch in zone ↕ → Pitch`

---

## Files to Modify

| File                                            | Change                                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/app/hooks/useGestureController.ts`         | Replace wrist-X pitch with pinch-in-zone Y pitch; stem cycle only fires outside zone |
| `src/app/hooks/useHandTracking.ts`              | Add pitch zone drawing to `drawOverlay()`                                            |
| `src/app/components/stemcollage/WebcamFeed.tsx` | Update gesture reference text                                                        |

---

## Verification

1. Open stem player, load a stem, enable camera
2. Confirm pitch zone rectangle is visible on camera feed (right side, center height)
3. Move right hand outside zone, open/close — confirm pitch does NOT change
4. Pinch inside zone, move hand up/down — confirm pitch changes smoothly
5. Pinch inside zone, hold, slide out while still pinching — pitch should lock when outside zone
6. Short pinch outside zone — confirm stem cycling still works
7. Check live PITCH % readout chip updates correctly