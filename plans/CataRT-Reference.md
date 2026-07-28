# CataRT Mini-App — UI/UX & Functionality Reference

Inspired by IRCAM CataRT for Max/MSP. A corpus-based concatenative synthesis explorer built entirely in the browser using Web Audio API and Canvas 2D.

---

## Concept

Upload an audio file → the app slices it into small grains and extracts audio features for each → grains are plotted as dots in a 2D scatter space mapped to any two chosen features → hovering the mouse over a grain plays it once.

---

## Layout

- **Two-panel layout** via `react-resizable-panels`
- **Left panel** (~27% default, min 22%, max 42%): Controls sidebar
- **Right panel** (~73% default, min 50%): Corpus canvas — the main interactive area
- **Resize handle**: 4px draggable strip between panels, highlights on hover (`bg-emerald-600`)
- **Top bar** (36px, `h-9`): App title + subtitle; analysis spinner/progress appears right-aligned during analysis
- **Overall background**: `bg-zinc-950`

---

## Left Panel — Controls

Panel styling: `bg-zinc-900`, `border-r border-zinc-800`, `p-4`, `gap-5` between sections, vertically scrollable.

Each section has a small-caps label (`text-[10px] uppercase tracking-widest text-zinc-500`) + a horizontal rule to the right.

### Section 1: Audio

- Drag-and-drop / click-to-browse file upload zone (`h-24`, dashed border)
- Accepts `audio/*` (mp3, wav, ogg, flac, aac — anything the browser can decode)
- Shows: upload icon + hint text → loading spinner + "Decoding…" → filename + "Click to change"
- On load: reads file as `ArrayBuffer` → `AudioContext.decodeAudioData()` → closes that temporary context → passes `AudioBuffer` to parent → triggers analysis immediately

### Section 2: Corpus Analysis

- **Grain Size** range slider (30–500ms, step 10ms, default 120ms): segment length
- **Overlap** range slider (0–90%, step 5%, default 50%): overlap between consecutive grains
- **Grain count** text: `"{n} grains"` or `"No corpus"` (left-aligned)
- **Reanalyze ↻** button (right-aligned): re-runs extraction with current slider values
- Sliders use `accent-emerald-500`

### Section 3: Axes

Two dropdowns (X Axis, Y Axis), one below the other. Each maps a feature to that canvas axis.

Available features (`FeatureKey`):

| Key | Label |
|---|---|
| `rms` | Energy (RMS) |
| `zcr` | Zero Crossing Rate |
| `spectralCentroid` | Spectral Centroid |
| `spectralFlatness` | Spectral Flatness |
| `spectralFlux` | Spectral Flux |
| `pitch` | Pitch |

Select styling: `bg-zinc-800 border-zinc-700 text-zinc-300 text-xs rounded px-2 py-1`

### Section 4: Interaction Mode

Two equal-width buttons side by side: **Mouse** and **Camera**. Active button: `bg-emerald-600 text-white`. Inactive: `bg-zinc-800 text-zinc-400`.

- **Mouse** (default): hover over canvas triggers grains; custom crosshair drawn on canvas
- **Camera**: activates webcam + TensorFlow.js HandPose; index fingertip drives the cursor
  - Shows spinner inside the Camera button while model loads
  - Shows hint text below when active: "Point index finger at corpus to navigate"

### Footer (below sections, `mt-auto`)

- When a grain is playing: green pulse dot + "Playing" (`text-emerald-400`)
- When idle: `"Hover over corpus to trigger grains"` (`text-[10px] text-zinc-600`)

---

## Right Panel — Corpus Canvas

### Container

`size-full overflow-hidden relative`. Canvas fills it completely. Overlay elements (grain info tooltip, video preview) are `absolute`-positioned children.

### Idle / Analyzing States

- **Idle**: centered icon (scattered circles SVG) + `"Upload an audio file to generate corpus"` — shown as `absolute inset-0` overlay
- **Analyzing**: centered progress bar (`w-48 h-1 bg-zinc-800`, fill `bg-emerald-500`) + percentage text + spinner in top bar

### Canvas Rendering (Canvas 2D, `requestAnimationFrame` loop)

**Setup:**
- `ResizeObserver` on container; sets `canvas.width/height` on every resize
- Single `useEffect` mounts the draw loop; all data read via `useRef`s to avoid stale closures

**Background:**
```
ctx.fillStyle = "#0a0a0a"
ctx.fillRect(0, 0, W, H)
```

**Grid:** 10×10 lines, `strokeStyle = "#1a1a1f"`, `lineWidth = 0.5`

Grid line positions: `(i/10) * W * 0.85 + W * 0.075` (leaves 7.5% margin on each side)

**Grain dots:**
```
hue       = grain.normPitch * 240          // blue (low pitch) → yellow/red (high pitch)
lightness = 30 + grain.normRms * 40        // darker = quieter, brighter = louder
radius    = 2 + grain.normRms * 3          // 2–5px

ctx.fillStyle = `hsl(${hue}, 70%, ${lightness}%)`
```

**Active/triggered grain** (the one currently under cursor):
```
ctx.fillStyle = "#ffffff"
ctx.shadowBlur = 12
ctx.shadowColor = "#34d399"
```

**Grain screen position formula:**
```
normX = grain[normKey(xAxis)]      // 0–1
normY = grain[normKey(yAxis)]      // 0–1
screenX = normX * W * 0.85 + W * 0.075
screenY = (1 - normY) * H * 0.85 + H * 0.075   // Y is flipped (1=top)
```

**Cursor crosshair** (drawn when `cursorPos` is set):
```
strokeStyle = "#34d399", lineWidth = 1, globalAlpha = 0.8
horizontal line: (cx-10, cy) → (cx+10, cy)
vertical line:   (cx, cy-10) → (cx, cy+10)
circle:          arc(cx, cy, 16, 0, 2π)
```

System cursor: hidden via `cursor-none` on the canvas element.

### Grain Info Tooltip

Absolute-positioned `div` overlaid on canvas (not on the canvas element itself). Follows cursor. Clamped to canvas bounds:

```
infoX = min(mouseX + 12, containerWidth - 160)
infoY = min(mouseY + 12, containerHeight - 100)
```

Styling: `bg-zinc-900/90 border border-zinc-700 rounded px-2.5 py-2 text-[10px] text-zinc-300 backdrop-blur-sm`, `minWidth: 148px`

Shows (label left, value right, `tabular-nums`):
- `grain` → `#id`
- `energy` → `rms.toFixed(4)`
- `centroid` → `spectralCentroid.toFixed(0) Hz`
- `pitch` → `pitch.toFixed(0) Hz` or `—` if pitch is 0
- `zcr` → `zcr.toFixed(3)`

Disappears when cursor leaves canvas.

### Mouse Interaction

**`mousemove`:** Finds nearest grain within 30px screen radius; calls `onGrainHover(nearest | null)`.

**Nearest grain search:**
```typescript
let best: Grain | null = null, bestDist = 30; // 30px screen radius threshold
for (const g of grains) {
  const { x, y } = grainToCanvas(g, xAxis, yAxis, W, H, transform);
  const d = Math.sqrt((x - mx)² + (y - my)²);
  if (d < bestDist) { bestDist = d; best = g; }
}
```

**`mousedown`:** Plays nearest grain once regardless of deduplication (click always fires).

**`mouseleave`:** Clears cursor position, hovered grain, calls `onGrainHover(null)`.

---

## Audio Engine

### `GranularEngine` class

```typescript
class GranularEngine {
  private _ctx: AudioContext | null = null;
  private _masterGain: GainNode | null = null;
  private buffer: AudioBuffer | null = null;

  // Lazy AudioContext — created on first playOnce() call, not on construction.
  // Critical: satisfies browser autoplay policy (requires user gesture before AudioContext)
  private get ctx(): AudioContext { ... }
  private get masterGain(): GainNode { ... }

  setBuffer(buffer: AudioBuffer): void
  playOnce(grain: Grain): void
  dispose(): void
}
```

**Master gain:** `GainNode` at `0.8`, connected to `ctx.destination`.

**`playOnce(grain)`:**
1. Guard: return if no buffer
2. Resume context if suspended: `this.ctx.resume()`
3. Create `AudioBufferSourceNode`, set `.buffer`
4. Create `GainNode` with envelope:
   - `setValueAtTime(0, now)` — starts silent
   - `linearRampToValueAtTime(1, now + 0.008)` — 8ms attack
   - `linearRampToValueAtTime(0, now + max(duration - 0.02, 0.008))` — 20ms release
5. `source.connect(gainNode)` → `gainNode.connect(masterGain)`
6. `source.start(now, offsetSec, grain.duration)` where `offsetSec = grain.offset / sampleRate`
7. `source.stop(now + grain.duration + 0.05)` — auto-cleanup

### One-Shot Deduplication (in `GranularApp`)

```typescript
const activeGrainIdRef = useRef<number | null>(null);

const handleGrainHover = useCallback((grain: Grain | null) => {
  if (grain) {
    if (grain.id === activeGrainIdRef.current) return; // already playing this grain — skip
    activeGrainIdRef.current = grain.id;
    setActiveGrainId(grain.id);        // React state → re-render with white glow
    engineRef.current?.playOnce(grain); // fire exactly once
    setIsRunning(true);
  } else {
    activeGrainIdRef.current = null;
    setActiveGrainId(null);
    setIsRunning(false);
  }
}, []);
```

**Why `useRef` not `useState`:** The canvas `mousemove` handler is registered once on mount. If it closed over `useState`-derived values, those would be stale. The ref is always current with no re-subscription needed.

**Click handler** (no deduplication — always fires):
```typescript
const handleGrainClick = useCallback((grain: Grain) => {
  engineRef.current?.playOnce(grain);
  setActiveGrainId(grain.id);
  setTimeout(() => setActiveGrainId(null), 500); // brief visual flash
}, []);
```

### `GranularEngine` lifecycle in React

```typescript
// In GranularApp:
const engineRef = useRef<GranularEngine | null>(null);

useEffect(() => {
  const engine = new GranularEngine();
  engineRef.current = engine;
  return () => { engine.dispose(); };
}, []);
```

**Critical pattern:** `useRef(null)` — do NOT pass `new GranularEngine()` directly to `useRef()`. That would construct and immediately abandon an engine (and its AudioContext) before the `useEffect` creates the real one.

---

## Feature Extraction

Runs entirely in JavaScript — no server, no WASM, no Web Workers.

### Segmentation

```
grainSamples = floor(grainSizeMs × sampleRate / 1000)
hopSamples   = floor(grainSamples × (1 - overlapFactor))
totalGrains  = floor((bufferLength - grainSamples) / hopSamples)
```

### Per-Grain Features

Uses a 256-pt DFT (not `AnalyserNode` — vanilla JS inner loop for portability).

| Feature | Formula |
|---|---|
| **RMS** | `sqrt(mean(x²))` |
| **ZCR** | sign-change count / N |
| **Spectral Centroid** | `Σ(freq_k × mag_k) / Σ(mag_k)` where `freq_k = k × sr / N` |
| **Spectral Flatness** | `exp(mean(log(mag))) / mean(mag)` — geometric/arithmetic mean ratio |
| **Spectral Flux** | `Σ max(0, mag_k − prevMag_k) / N` — positive frame difference |
| **Pitch** | Autocorrelation over lags for 50–1000Hz range; `sr / bestLag` |

Pitch returns 0 if undetected (silent grains).

### Normalization

After all grains extracted, each feature is min-max normalized to [0, 1] across the corpus:

```typescript
normValue = (rawValue - min) / (max - min || 1)
```

Stored as `normRms`, `normZcr`, `normCentroid`, `normFlatness`, `normFlux`, `normPitch`.

### Chunked Async (non-blocking UI)

```typescript
for (let idx = 0; idx < total; idx++) {
  if (idx % 50 === 0) {
    onProgress(idx / total);
    await new Promise(r => setTimeout(r, 0)); // yield to browser
  }
  // ... extract grain
}
```

### `Grain` interface

```typescript
interface Grain {
  id: number;
  offset: number;           // sample index in AudioBuffer (channel 0)
  duration: number;         // seconds
  rms: number;
  zcr: number;
  spectralCentroid: number; // Hz
  spectralFlatness: number; // 0–1 (1 = white noise)
  spectralFlux: number;
  pitch: number;            // Hz, 0 if undetected
  normRms: number;          // 0–1
  normZcr: number;
  normCentroid: number;
  normFlatness: number;
  normFlux: number;
  normPitch: number;
}

type FeatureKey = "rms" | "zcr" | "spectralCentroid" | "spectralFlatness" | "spectralFlux" | "pitch";
type AppState = "idle" | "analyzing" | "ready";
```

Helper: `getNormKey(key: FeatureKey): keyof Grain` → `"normRms"`, `"normZcr"`, etc.

---

## Camera / Hand-Tracking Mode

### Initialization

```typescript
// Lazy dynamic import — large bundles not in initial load
const [tf, handPoseDetection] = await Promise.all([
  import("@tensorflow/tfjs"),
  import("@tensorflow-models/hand-pose-detection"),
]);
await tf.ready();
const detector = await handPoseDetection.createDetector(
  handPoseDetection.SupportedModels.MediaPipeHands,
  { runtime: "tfjs", modelType: "lite", maxHands: 1 }
);
```

### Detection Loop

```typescript
// rAF loop
const hands = await detector.estimateHands(videoElement);
if (hands.length > 0) {
  const tip = hands[0].keypoints.find(k => k.name === "index_finger_tip");
  if (tip) {
    const x = (1 - tip.x / videoWidth) * canvasW;  // mirrored for natural feel
    const y = (tip.y / videoHeight) * canvasH;
    onPosition(x, y);
  }
}
```

The `onPosition` callback in `GranularApp` runs the same one-shot deduplication as mouse mode:

```typescript
tracker.init((x, y) => {
  setCursorPos({ x, y });
  const nearest = findNearestGrainByNorm(grains, xAxis, yAxis, x / canvasW, y / canvasH);
  if (nearest && nearest.id !== activeGrainIdRef.current) {
    activeGrainIdRef.current = nearest.id;
    engineRef.current?.playOnce(nearest);
  }
}, canvasW, canvasH);
```

For camera mode, nearest grain is found by normalized coordinates (no screen-px radius threshold), using `findNearestGrainByNorm` (Euclidean distance in normalized feature space).

### Webcam Preview

Hidden `<video ref={videoRef} muted playsInline />` feeds the model. A small visible preview is shown bottom-right of canvas when camera mode is active:

```
className="absolute bottom-3 right-3 w-24 rounded opacity-60 border border-zinc-700"
```

### Cleanup

```typescript
tracker.stop() // cancelAnimationFrame + stream.getTracks().forEach(t => t.stop()) + video.srcObject = null
```

---

## File Upload (`FileUpload.tsx`)

```typescript
async function processFile(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = new AudioContext();
  const buffer = await ctx.decodeAudioData(arrayBuffer);
  ctx.close(); // close temporary decode context immediately
  onAudioLoaded(buffer, file.name);
}
```

Three visual states: empty drop zone → decoding spinner → filename display.

---

## App State Machine

```
"idle"      → user uploads file  → "analyzing"
"analyzing" → extraction done    → "ready"
"ready"     → user uploads again → "analyzing"
```

During `"analyzing"`: progress bar shown on canvas, spinner in top bar. The `CorpusCanvas` is mounted throughout all states (it handles its own empty-grains state gracefully).

---

## Key Architectural Decisions

### 1. Lazy `AudioContext`
`GranularEngine` uses a private getter for `AudioContext` and `GainNode` — both created on first call to `playOnce()`, not in the constructor. This satisfies the browser autoplay policy requirement that `AudioContext` must be created within a user gesture.

### 2. `useRef` for animation-loop state
All data read inside `requestAnimationFrame` loops (grains array, axis selections, cursor position, active grain ID) is stored in refs synced via `useEffect`. This avoids stale closures without re-registering event listeners on every render.

### 3. One-shot deduplication via ref (not state)
`activeGrainIdRef` is a ref, not state. The `mousemove` handler closure can always read its current value without being re-registered. Using state would require adding it to the event listener's effect dependency array, causing teardown/re-setup on every grain hover.

### 4. No engine params in engine
All audio parameters (volume, envelope shape) are hardcoded inside `GranularEngine`. This avoids the stale closure problem that arises when passing `EngineParams` to functions registered in mount-only `useEffect`s.

### 5. Chunked analysis via `setTimeout`
Feature extraction yields every 50 grains to keep the UI responsive during long files. No Web Workers needed — the chunked approach is sufficient for typical corpus sizes.

---

## Dependencies

| Package | Used For |
|---|---|
| Web Audio API (native) | `AudioContext`, `AudioBufferSourceNode`, `GainNode` |
| Canvas 2D API (native) | Scatter plot rendering, rAF loop |
| `react-resizable-panels` | Two-panel resizable layout |
| `@tensorflow/tfjs` | Hand tracking (lazy loaded) |
| `@tensorflow-models/hand-pose-detection` | MediaPipe Hands model (lazy loaded) |

No Tone.js, no p5.js, no external audio library.

---

## Things Intentionally Excluded

- No continuous grain cloud / trigger rate (removed — led to machine-gun repeat firing)
- No volume / attack / release sliders (removed — stale closure issue made them unreachable)
- No matching algorithm selector (only applies to multi-grain cloud mode, which was removed)
- No zoom or pan on corpus canvas
- No corpus export
- No second audio channel support (mono: `buffer.getChannelData(0)` only)
