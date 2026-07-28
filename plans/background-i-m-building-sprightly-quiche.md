# Gesture Controller: Smoothing + Pitch Redesign + BPM Detection

## Context
Three problems to fix:
1. **Too sensitive** — volume and pitch update every frame (~60fps), causing constant jitter from small hand movements.
2. **Pitch conflicts with volume** — pitch was on left-hand pinch+height, but pinching is also volume, so any height while pinching affected pitch unintentionally. A gesture completely independent of pinch distance and finger count is needed.
3. **No BPM feedback** — when pitch is changed, there is no way to know the resulting BPM relative to the original, which is critical for DJing/mixing.

---

## Fix 1 — Smooth continuous values

**Approach:** Exponential moving average on volume and pitch, plus a dead zone threshold.

- Reuse existing `smoothValue(current, target, alpha)` from `src/app/utils/audioUtils.ts`
- Use `alpha = 0.12` (heavy smoothing — values lag ~8 frames, eliminating jitter)
- Store smoothed values in `useRef` (no re-renders)
- Dead zone: only call `setVolume` / `setPitch` when smoothed value differs from last-sent value by `> 0.03`

**File:** `src/app/hooks/useGestureController.ts` only.

---

## Fix 2 — Pitch = right hand horizontal position (wrist X)

**Why this gesture:**
The right hand's existing gestures — quick pinch (stem cycle) and 1–4 fingers extended (cue points) — both involve finger-distance and finger-count on the Z/Y axes. The **horizontal wrist position (X axis)** is orthogonal to both: pinching doesn't require moving the hand sideways, and extending fingers doesn't either. Sliding the right hand left/right is a completely unambiguous continuous gesture.

**Mapping:**
- Right wrist X = 0.1 (far left of frame) → pitch 0.5 (50%)
- Right wrist X = 0.9 (far right of frame) → pitch 2.0 (200%)
- Formula: `mapRange(wrist.x, 0.1, 0.9, 0.5, 2.0)` — `mapRange` already exists in `audioUtils.ts`

**Updated full gesture map:**

| Hand | Gesture | Action |
|------|---------|--------|
| Right | Quick pinch (debounce 800ms) | Cycle selected stem |
| Right | **Horizontal wrist position** | **Pitch** (left = slower, right = faster) |
| Right | 1–4 fingers extended (non-pinch) | Jump to cue point 1–4 |
| Left | Pinch spread distance | Volume (wide = loud) |
| Left | Open (≥3 fingers) ↔ closed | Pause ↔ Play |

**Changes required:**
1. `src/app/hooks/useHandTracking.ts` — add `wrist: HandLandmark` to `ProcessedHand` (landmark[0], already available in the array)
2. `src/app/hooks/useGestureController.ts` — remove pitch from left hand; add pitch from `rightHand.wrist.x`, smoothed
3. `src/app/components/WebcamFeed.tsx` — update pre-start gesture table and live readout chip

---

## Fix 3 — BPM detection on file load

**Approach:** Install `bpm-detective` (small pure-JS library, works directly on `AudioBuffer` data with no WASM). Run detection once when a file is decoded in `loadFile`.

**Implementation:**
1. `pnpm add bpm-detective`
2. Add `detectedBpm: number | null` to `StemState` in `AudioEngineContext.tsx`
3. In `loadFile`, after `decodeAudioData`, call `getBpm(audioBuffer)` and store in stem state
4. In `StemVisualizer.tsx`, show BPM readout near the pitch slider:
   - When `detectedBpm` is known: display `"[original] → [current] BPM"` where current = `Math.round(detectedBpm * pitch)`
   - Format: small monospace text below the pitch slider, e.g. `120 → 144 bpm`

**Files:**
- `src/app/contexts/AudioEngineContext.tsx` — add `detectedBpm` field + detection call in `loadFile`; reset to `null` in `clearFile`
- `src/app/components/StemVisualizer.tsx` — add BPM readout near pitch slider

---

## Summary of files to modify

| File | Change |
|------|--------|
| `src/app/hooks/useHandTracking.ts` | Add `wrist` to `ProcessedHand` |
| `src/app/hooks/useGestureController.ts` | Smooth volume; pitch = right wrist X via `mapRange` |
| `src/app/components/WebcamFeed.tsx` | Update gesture table + live readout |
| `src/app/contexts/AudioEngineContext.tsx` | Add `detectedBpm`, run detection on load |
| `src/app/components/StemVisualizer.tsx` | Show original → current BPM near pitch slider |

---

## Verification

1. Spread left hand wide → volume increases smoothly, no jitter when hand is steady
2. Pinch left hand (any height) → volume drops, pitch does NOT change
3. Slide right hand to the right → pitch increases; slide left → pitch drops
4. Quick right-hand pinch still cycles stems
5. Right fingers 1–4 still jump to cue points
6. Load a stem → BPM detected and shown (e.g. "124 bpm")
7. Move pitch slider to 1.5 → readout shows e.g. "124 → 186 bpm"
