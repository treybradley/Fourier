# Harmonizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Harmonizer mini-app where users load/record up to 3 vocal takes, stack up to 4 parallel ±12-semitone voices per track (time-preserving pitch shift), and export WAV or 9:16 video with a baked overlay.

**Architecture:** Dedicated `HarmonizerProvider` owns tracks, master timeline, looping playback, and voice caches. Pure utils handle trim/loop-to-master, voice-cap rules, and `pitchShiftBuffer` (SoundTouch-based, duration preserved). UI mirrors Stem Collage (header + optional media panel + session rec rail). Track 1 video supplies both root audio and compositor picture. Do not extend `AudioEngineContext` or `LooperContext`.

**Tech Stack:** React 18, Vite 6, TypeScript, Web Audio API, `soundtouchjs` (time-preserving pitch shift), existing `useSessionRecorder` / `exportFormat` / `MiniAppHeader` / `WebcamFeed`, Vitest for pure-util unit tests.

**Spec:** `docs/superpowers/specs/2026-08-16-harmonizer-design.md`

## Global Constraints

- 3 tracks max; UI labels Track 1–3 map to `id` 0|1|2
- Max 4 harmony voices per track (excluding dry root)
- Interval grid: parallel only, semitones −12…+12
- Pitch shift must preserve duration (never `playbackRate` / speed change)
- Video upload only on Track 1 (`id === 0`); clip should already be cut to the loop
- Track 1 root audio sets `masterLength`; tracks 2–3 trim/loop to master
- Shared `harmonyMix` slider per track; no hand control; no live harmony monitor while recording
- Reuse `useSessionRecorder` for WAV (camera/video path off) or 9:16 MP4/WebM (on)
- Follow existing mini-app visual language (dark shell, mono chips, Stem Collage layout patterns)

## File structure

| Path | Responsibility |
|------|----------------|
| `src/app/utils/harmonizer/fitBufferToLength.ts` | Trim/loop `AudioBuffer` to master sample length |
| `src/app/utils/harmonizer/voiceCap.ts` | Pure helpers: can enable voice, toggle set |
| `src/app/utils/harmonizer/pitchShiftCache.ts` | Cache key + Map helpers |
| `src/app/utils/harmonizer/pitchShiftBuffer.ts` | Time-preserving pitch shift wrapper |
| `src/app/utils/harmonizer/extractAudioFromVideoFile.ts` | Decode audio from video file; reject if none |
| `src/app/contexts/HarmonizerContext.tsx` | State, ingest, transport, voice enable/disable |
| `src/app/hooks/useHarmonizerCompositor.ts` | 9:16 canvas overlay + `captureStream` |
| `src/app/components/harmonizer/IntervalGrid.tsx` | ±12 grid UI |
| `src/app/components/harmonizer/HarmonizerTrackCard.tsx` | Track card + ingest controls |
| `src/app/components/harmonizer/HarmonizerMediaPanel.tsx` | Webcam or Track-1 video + canvas |
| `src/app/pages/HarmonizerPage.tsx` | Shell + session recorder wiring |
| `src/app/routes.ts` | Add `/harmonizer` |
| `src/app/pages/Home.tsx` | Add Harmonizer tool card |
| `src/app/components/PageLoader.tsx` | `HarmonizerLoader` |
| `src/app/utils/harmonizer/*.test.ts` | Vitest unit tests |
| `vite.config.ts` / `package.json` | Vitest + `soundtouchjs` |

---

### Task 1: Vitest + `fitBufferToLength`

**Files:**
- Create: `src/app/utils/harmonizer/fitBufferToLength.ts`
- Create: `src/app/utils/harmonizer/fitBufferToLength.test.ts`
- Modify: `package.json` (add `vitest`, script `"test": "vitest run"`)
- Modify: `vite.config.ts` (add `test: { environment: "node" }` — AudioBuffer will be mocked in tests)

**Interfaces:**
- Consumes: none
- Produces: `fitBufferToLength(ctx: { sampleRate: number; createBuffer: AudioContext["createBuffer"] }, source: AudioBuffer, targetSamples: number): AudioBuffer`

- [ ] **Step 1: Add vitest dependency and script**

```bash
pnpm add -D vitest
```

In `package.json` scripts add: `"test": "vitest run"`.

In `vite.config.ts` add:

```ts
export default defineConfig({
  // ...existing
  test: {
    environment: "node",
  },
})
```

If TypeScript complains about `test`, add a triple-slash or ensure `vitest/config` types: change import to `import { defineConfig } from "vitest/config"` and re-export vite plugins as today, **or** keep vite import and add `/// <reference types="vitest/config" />` at top of `vite.config.ts`.

- [ ] **Step 2: Write the failing test**

Create `src/app/utils/harmonizer/fitBufferToLength.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { fitBufferToLength } from "./fitBufferToLength";

function makeFakeCtx() {
  return {
    sampleRate: 48000,
    createBuffer(channels: number, length: number, sampleRate: number) {
      const data = [new Float32Array(length)];
      return {
        numberOfChannels: channels,
        length,
        sampleRate,
        duration: length / sampleRate,
        getChannelData: (c: number) => data[c] ?? data[0],
        copyFromChannel() {},
        copyToChannel() {},
      } as unknown as AudioBuffer;
    },
  };
}

function fillBuffer(buf: AudioBuffer, fill: (i: number) => number) {
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = fill(i);
}

describe("fitBufferToLength", () => {
  it("trims when source is longer than target", () => {
    const ctx = makeFakeCtx();
    const src = ctx.createBuffer(1, 100, 48000);
    fillBuffer(src, (i) => i);
    const out = fitBufferToLength(ctx, src, 40);
    expect(out.length).toBe(40);
    expect(out.getChannelData(0)[39]).toBe(39);
  });

  it("loops when source is shorter than target", () => {
    const ctx = makeFakeCtx();
    const src = ctx.createBuffer(1, 10, 48000);
    fillBuffer(src, (i) => i + 1);
    const out = fitBufferToLength(ctx, src, 25);
    expect(out.length).toBe(25);
    const d = out.getChannelData(0);
    expect(d[0]).toBe(1);
    expect(d[10]).toBe(1);
    expect(d[24]).toBe(5);
  });

  it("returns equivalent length when equal", () => {
    const ctx = makeFakeCtx();
    const src = ctx.createBuffer(1, 16, 48000);
    fillBuffer(src, () => 0.5);
    const out = fitBufferToLength(ctx, src, 16);
    expect(out.length).toBe(16);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm test src/app/utils/harmonizer/fitBufferToLength.test.ts
```

Expected: FAIL (module not found or `fitBufferToLength` not exported).

- [ ] **Step 4: Implement `fitBufferToLength`**

```ts
// src/app/utils/harmonizer/fitBufferToLength.ts
type BufferFactory = {
  sampleRate: number;
  createBuffer: (
    numberOfChannels: number,
    length: number,
    sampleRate: number,
  ) => AudioBuffer;
};

/** Trim if longer, loop if shorter, so output length === targetSamples. Mono mixdown of ch0. */
export function fitBufferToLength(
  ctx: BufferFactory,
  source: AudioBuffer,
  targetSamples: number,
): AudioBuffer {
  const length = Math.max(1, Math.floor(targetSamples));
  const out = ctx.createBuffer(1, length, source.sampleRate || ctx.sampleRate);
  const outData = out.getChannelData(0);
  const srcData = source.getChannelData(0);
  const srcLen = source.length;
  if (srcLen <= 0) return out;
  for (let i = 0; i < length; i++) {
    outData[i] = srcData[i % srcLen];
  }
  return out;
}
```

Note: for `srcLen >= length`, `i % srcLen` equals `i` for `i < length`, so trim is correct.

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm test src/app/utils/harmonizer/fitBufferToLength.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml vite.config.ts \
  src/app/utils/harmonizer/fitBufferToLength.ts \
  src/app/utils/harmonizer/fitBufferToLength.test.ts
git commit -m "$(cat <<'EOF'
feat(harmonizer): add vitest and fitBufferToLength util

EOF
)"
```

---

### Task 2: Voice cap + pitch-shift cache helpers

**Files:**
- Create: `src/app/utils/harmonizer/voiceCap.ts`
- Create: `src/app/utils/harmonizer/voiceCap.test.ts`
- Create: `src/app/utils/harmonizer/pitchShiftCache.ts`
- Create: `src/app/utils/harmonizer/pitchShiftCache.test.ts`

**Interfaces:**
- Consumes: none
- Produces:
  - `MAX_VOICES_PER_TRACK = 4`
  - `SEMITONE_MIN = -12`, `SEMITONE_MAX = 12`
  - `canEnableVoice(activeSemitones: number[], semitones: number): boolean`
  - `toggleVoiceSemitone(active: number[], semitones: number): number[]`
  - `makePitchCacheKey(trackId: number, rootToken: string, semitones: number): string`
  - `PitchShiftCache` class with `get` / `set` / `clearTrack` / `clearAll`

- [ ] **Step 1: Write failing tests**

`voiceCap.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  MAX_VOICES_PER_TRACK,
  canEnableVoice,
  toggleVoiceSemitone,
} from "./voiceCap";

describe("voiceCap", () => {
  it("allows enabling when under cap", () => {
    expect(canEnableVoice([3, 7], 12)).toBe(true);
  });

  it("blocks enabling a new interval at cap", () => {
    const active = [3, 5, 7, 12];
    expect(active.length).toBe(MAX_VOICES_PER_TRACK);
    expect(canEnableVoice(active, -5)).toBe(false);
  });

  it("allows disabling an active interval at cap", () => {
    const next = toggleVoiceSemitone([3, 5, 7, 12], 5);
    expect(next).toEqual([3, 7, 12]);
  });

  it("ignores root (0) toggles", () => {
    expect(toggleVoiceSemitone([3], 0)).toEqual([3]);
  });

  it("does not add past cap", () => {
    expect(toggleVoiceSemitone([3, 5, 7, 12], -7)).toEqual([3, 5, 7, 12]);
  });
});
```

`pitchShiftCache.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { PitchShiftCache, makePitchCacheKey } from "./pitchShiftCache";

describe("pitchShiftCache", () => {
  it("round-trips by key", () => {
    const cache = new PitchShiftCache();
    const key = makePitchCacheKey(0, "root-a", 7);
    const fake = { length: 1 } as AudioBuffer;
    cache.set(key, fake);
    expect(cache.get(key)).toBe(fake);
  });

  it("clearTrack removes only that track's entries", () => {
    const cache = new PitchShiftCache();
    cache.set(makePitchCacheKey(0, "a", 3), { length: 1 } as AudioBuffer);
    cache.set(makePitchCacheKey(1, "b", 3), { length: 2 } as AudioBuffer);
    cache.clearTrack(0);
    expect(cache.get(makePitchCacheKey(0, "a", 3))).toBeUndefined();
    expect(cache.get(makePitchCacheKey(1, "b", 3))).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm test src/app/utils/harmonizer/voiceCap.test.ts src/app/utils/harmonizer/pitchShiftCache.test.ts
```

- [ ] **Step 3: Implement**

```ts
// voiceCap.ts
export const MAX_VOICES_PER_TRACK = 4;
export const SEMITONE_MIN = -12;
export const SEMITONE_MAX = 12;

export function canEnableVoice(activeSemitones: number[], semitones: number): boolean {
  if (semitones === 0) return false;
  if (activeSemitones.includes(semitones)) return true;
  return activeSemitones.length < MAX_VOICES_PER_TRACK;
}

export function toggleVoiceSemitone(active: number[], semitones: number): number[] {
  if (semitones === 0) return active.slice();
  if (active.includes(semitones)) return active.filter((s) => s !== semitones);
  if (active.length >= MAX_VOICES_PER_TRACK) return active.slice();
  return [...active, semitones].sort((a, b) => a - b);
}
```

```ts
// pitchShiftCache.ts
export function makePitchCacheKey(
  trackId: number,
  rootToken: string,
  semitones: number,
): string {
  return `${trackId}:${rootToken}:${semitones}`;
}

export class PitchShiftCache {
  private map = new Map<string, AudioBuffer>();

  get(key: string) {
    return this.map.get(key);
  }

  set(key: string, buffer: AudioBuffer) {
    this.map.set(key, buffer);
  }

  clearTrack(trackId: number) {
    const prefix = `${trackId}:`;
    for (const key of [...this.map.keys()]) {
      if (key.startsWith(prefix)) this.map.delete(key);
    }
  }

  clearAll() {
    this.map.clear();
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm test src/app/utils/harmonizer/voiceCap.test.ts src/app/utils/harmonizer/pitchShiftCache.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/app/utils/harmonizer/voiceCap.ts src/app/utils/harmonizer/voiceCap.test.ts \
  src/app/utils/harmonizer/pitchShiftCache.ts src/app/utils/harmonizer/pitchShiftCache.test.ts
git commit -m "$(cat <<'EOF'
feat(harmonizer): add voice cap and pitch-shift cache helpers

EOF
)"
```

---

### Task 3: `pitchShiftBuffer` (time-preserving)

**Files:**
- Create: `src/app/utils/harmonizer/pitchShiftBuffer.ts`
- Create: `src/app/utils/harmonizer/pitchShiftBuffer.test.ts` (duration contract with a stubbable engine)
- Modify: `package.json` — add `soundtouchjs`

**Interfaces:**
- Consumes: none from prior tasks required at runtime
- Produces: `pitchShiftBuffer(input: AudioBuffer, semitones: number, opts?: { engine?: PitchShiftEngine }): Promise<AudioBuffer>`
- `PitchShiftEngine` interface so tests do not load WASM/native SoundTouch:

```ts
export interface PitchShiftEngine {
  shift(input: AudioBuffer, semitones: number): Promise<AudioBuffer>;
}
```

Default engine wraps `soundtouchjs` and **must** return a buffer whose `length === input.length` (resample/pad/trim to match if the library drifts by a few samples).

- [ ] **Step 1: Install SoundTouch**

```bash
pnpm add soundtouchjs
```

Check package exports; if types are missing, add a minimal `src/types/soundtouchjs.d.ts`:

```ts
declare module "soundtouchjs" {
  export class SoundTouch {
    pitchSemitones: number;
    tempo: number;
    rate: number;
  }
  export class SimpleFilter {
    constructor(source: unknown, soundTouch: SoundTouch);
    extract(target: Float32Array, numFrames: number): number;
  }
  export class WebAudioBufferSource {
    constructor(buffer: AudioBuffer);
  }
}
```

- [ ] **Step 2: Write failing duration-contract test**

```ts
import { describe, expect, it } from "vitest";
import { pitchShiftBuffer, type PitchShiftEngine } from "./pitchShiftBuffer";

function fakeBuffer(length: number): AudioBuffer {
  const data = new Float32Array(length);
  return {
    numberOfChannels: 1,
    length,
    sampleRate: 48000,
    duration: length / 48000,
    getChannelData: () => data,
  } as unknown as AudioBuffer;
}

describe("pitchShiftBuffer", () => {
  it("returns same length as input (time preserved)", async () => {
    const input = fakeBuffer(1000);
    const engine: PitchShiftEngine = {
      async shift(buf, semitones) {
        // Simulate a library that returns slightly wrong length
        return fakeBuffer(buf.length + (semitones === 0 ? 0 : 3));
      },
    };
    const out = await pitchShiftBuffer(input, 4, { engine });
    expect(out.length).toBe(input.length);
  });

  it("returns input clone path for 0 semitones without engine work", async () => {
    const input = fakeBuffer(64);
    const out = await pitchShiftBuffer(input, 0, {
      engine: {
        async shift() {
          throw new Error("should not run");
        },
      },
    });
    expect(out.length).toBe(64);
  });
});
```

- [ ] **Step 3: Run test — expect FAIL**

```bash
pnpm test src/app/utils/harmonizer/pitchShiftBuffer.test.ts
```

- [ ] **Step 4: Implement wrapper**

Implement `pitchShiftBuffer` that:
1. If `semitones === 0`, copy channel data into a new buffer of same length.
2. Else call `opts.engine ?? defaultSoundTouchEngine`.
3. Force output length to `input.length` via copy/loop/trim of ch0 (reuse `fitBufferToLength` pattern with a minimal factory from `input.sampleRate`).

Default SoundTouch engine (sketch — adjust to actual `soundtouchjs` API after reading its README in `node_modules`):

- Set `tempo = 1`, `rate = 1`, `pitchSemitones = semitones`.
- Pull samples via `SimpleFilter.extract` until enough frames, then fit to `input.length`.
- Process offline on main thread for v1 (worker later if needed).

**Hard rule:** never set playback rate on a `AudioBufferSourceNode` to fake pitch.

- [ ] **Step 5: Run unit tests PASS**

```bash
pnpm test src/app/utils/harmonizer/pitchShiftBuffer.test.ts
```

- [ ] **Step 6: Manual smoke (optional in this task)** — in a scratch snippet or temporary page later, shift a mic buffer +4 and confirm duration matches in DevTools.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml src/app/utils/harmonizer/pitchShiftBuffer.ts \
  src/app/utils/harmonizer/pitchShiftBuffer.test.ts src/types/soundtouchjs.d.ts
git commit -m "$(cat <<'EOF'
feat(harmonizer): add time-preserving pitchShiftBuffer

EOF
)"
```

---

### Task 4: Video audio extract helper

**Files:**
- Create: `src/app/utils/harmonizer/extractAudioFromVideoFile.ts`

**Interfaces:**
- Consumes: `AudioContext`
- Produces: `extractAudioFromVideoFile(file: File, ctx: AudioContext): Promise<AudioBuffer>` — throws `Error("No audio track found in video")` when decode yields silence-only failure or decode fails; prefer `ctx.decodeAudioData` on the file’s `arrayBuffer()` (Chromium decodes audio from many mp4/webm containers).

- [ ] **Step 1: Implement**

```ts
export async function extractAudioFromVideoFile(
  file: File,
  ctx: AudioContext,
): Promise<AudioBuffer> {
  if (!file.type.startsWith("video/") && !/\.(mp4|webm|mov)$/i.test(file.name)) {
    throw new Error("Not a video file");
  }
  const arrayBuffer = await file.arrayBuffer();
  let buffer: AudioBuffer;
  try {
    buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
  } catch {
    throw new Error("No audio track found in video");
  }
  // Reject near-empty buffers
  const ch = buffer.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < ch.length; i += 64) peak = Math.max(peak, Math.abs(ch[i]));
  if (peak < 1e-5) throw new Error("No audio track found in video");
  return buffer;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/utils/harmonizer/extractAudioFromVideoFile.ts
git commit -m "$(cat <<'EOF'
feat(harmonizer): extract root audio from uploaded video

EOF
)"
```

---

### Task 5: `HarmonizerProvider` — core engine

**Files:**
- Create: `src/app/contexts/HarmonizerContext.tsx`

**Interfaces:**
- Consumes: `fitBufferToLength`, `toggleVoiceSemitone` / `canEnableVoice`, `PitchShiftCache`, `makePitchCacheKey`, `pitchShiftBuffer`, `extractAudioFromVideoFile`, `decodeAudioFile` from `audioUtils`
- Produces context value (exact shape):

```ts
export type TrackSource = "empty" | "mic" | "audio-file" | "video-file";

export interface HarmonyVoice {
  semitones: number;
  buffer: AudioBuffer;
}

export interface HarmonizerTrack {
  id: 0 | 1 | 2;
  rootBuffer: AudioBuffer | null;
  source: TrackSource;
  videoUrl?: string;
  voices: HarmonyVoice[];
  volume: number;
  harmonyMix: number; // 0–1
  isMuted: boolean;
}

export interface HarmonizerContextValue {
  tracks: HarmonizerTrack[];
  selectedTrack: number;
  masterLength: number | null;
  isPlaying: boolean;
  error: string | null;
  recordingTrack: number | null;
  shiftingSemitone: { trackId: number; semitones: number } | null;

  setSelectedTrack: (index: number) => void;
  setTrackVolume: (trackId: number, volume: number) => void;
  setHarmonyMix: (trackId: number, mix: number) => void;
  toggleMute: (trackId: number) => void;
  clearTrack: (trackId: number) => void;

  startMicRecord: (trackId: number) => Promise<void>;
  stopMicRecord: () => Promise<void>;
  loadAudioFile: (trackId: number, file: File) => Promise<void>;
  loadVideoFile: (file: File) => Promise<void>; // track 0 only

  toggleVoice: (trackId: number, semitones: number) => Promise<void>;
  play: () => void;
  stop: () => void;

  getAudioContext: () => AudioContext | null;
  getMasterNode: () => GainNode | null;
  getLoopPhase: () => number; // 0–1 for compositor
}
```

**Behavior requirements:**
- Creating/replacing Track 0 root sets `masterLength = root.duration` (and sample length).
- Tracks 1–2 roots are passed through `fitBufferToLength` to master samples before store/play.
- Replacing Track 0 clears pitch cache for track 0, clears Track 0 voices, re-fits tracks 1–2, clears their voice caches and voices (simplest correct v1).
- `toggleVoice`: ignore 0; if disabling, remove voice; if enabling, check cap, set `shiftingSemitone`, await `pitchShiftBuffer`, cache, append voice, clear shifting flag; on error set `error` and do not add voice.
- Playback: shared `AudioContext` master gain; per track `trackGain` and `harmonyGain` (`harmonyGain.gain = harmonyMix`); loop `AudioBufferSourceNode`s with `loop = true` scheduled from a shared start time; stop/rebuild on graph changes.
- Mic record: `getUserMedia` → ScriptProcessor or AudioWorklet chunk capture (may copy Looper’s worklet pattern lightly) → on stop, set root with source `"mic"`.
- `loadVideoFile`: only `trackId 0`; revoke previous `videoUrl`; `URL.createObjectURL`; extract audio; source `"video-file"`.
- Expose `getAudioContext` / `getMasterNode` for `useSessionRecorder`.

- [ ] **Step 1: Implement `HarmonizerProvider` + `useHarmonizer`** following the interface above. Keep file focused; private refs for slots/sources.

- [ ] **Step 2: Smoke in a temporary route or Story — preferred: wire Task 6 page skeleton next; if testing now, `console` assert masterLength after load.**

- [ ] **Step 3: Commit**

```bash
git add src/app/contexts/HarmonizerContext.tsx
git commit -m "$(cat <<'EOF'
feat(harmonizer): add HarmonizerProvider audio engine

EOF
)"
```

---

### Task 6: Route, loader, Home card, page shell

**Files:**
- Create: `src/app/pages/HarmonizerPage.tsx`
- Modify: `src/app/routes.ts`
- Modify: `src/app/pages/Home.tsx`
- Modify: `src/app/components/PageLoader.tsx`

**Interfaces:**
- Consumes: `HarmonizerProvider`
- Produces: navigable `/harmonizer` page with header + empty layout placeholders

- [ ] **Step 1: Add `HarmonizerLoader` in `PageLoader.tsx`**

Use index `"07"`, name `"Harmonizer"`, tagline `"Parallel interval stacks"`, accents e.g. `#FF4D6D` / `#7C3AED` (avoid purple-on-white landing cliché on the *page* — loader can use deep red/violet on `#0A060C`).

- [ ] **Step 2: Wire route**

```ts
const HarmonizerPage = lazy(() =>
  import("./pages/HarmonizerPage").then((m) => ({ default: m.HarmonizerPage })),
);
// children:
{ path: "harmonizer", Component: wrap(HarmonizerPage, HarmonizerLoader) },
```

Import `HarmonizerLoader` from PageLoader.

- [ ] **Step 3: Home tool card**

Append to `TOOLS` in `Home.tsx`:

```ts
{
  id: "harmonizer",
  slug: "harmonizer",
  index: "07",
  name: "HARMONIZER",
  tagline: "Parallel interval stacks",
  description:
    "Record or upload a vocal take, stack parallel harmonies on a ±12 semitone grid, layer up to 3 tracks, and export audio or 9:16 video.",
  features: ["3 tracks", "±12 interval grid", "Video or WAV export"],
  status: "available" as const,
  accentA: "#FF4D6D",
  accentB: "#F59E0B",
  tagColor: "text-[#fb7185]/80",
},
```

- [ ] **Step 4: Minimal `HarmonizerPage`**

```tsx
export function HarmonizerPage() {
  return (
    <HarmonizerProvider>
      <HarmonizerInner />
    </HarmonizerProvider>
  );
}

function HarmonizerInner() {
  return (
    <div className="h-screen w-full overflow-hidden relative" style={{ background: "#0A060C" }}>
      <div className="relative h-full flex flex-col p-4 gap-4">
        <MiniAppHeader
          title="Harmonizer"
          subtitle="parallel interval stacks"
          titleClassName="bg-gradient-to-r from-white/90 to-white/60 bg-clip-text text-transparent"
        />
        <div className="flex-1 min-h-0 text-white/40 font-mono text-xs">
          {/* Track list + grid land in Task 7 */}
          Harmonizer shell
        </div>
      </div>
    </div>
  );
}
```

Match Stem Collage padding/atmosphere patterns (grain + radials) without copying Stem Collage purple branding.

- [ ] **Step 5: Verify**

```bash
pnpm dev
```

Open `/harmonizer` and Home card link. Expected: loader then shell.

- [ ] **Step 6: Commit**

```bash
git add src/app/pages/HarmonizerPage.tsx src/app/routes.ts \
  src/app/pages/Home.tsx src/app/components/PageLoader.tsx
git commit -m "$(cat <<'EOF'
feat(harmonizer): add route, home card, and page shell

EOF
)"
```

---

### Task 7: Track cards + Interval grid UI

**Files:**
- Create: `src/app/components/harmonizer/IntervalGrid.tsx`
- Create: `src/app/components/harmonizer/HarmonizerTrackCard.tsx`
- Modify: `src/app/pages/HarmonizerPage.tsx`

**Interfaces:**
- Consumes: `useHarmonizer`, `SEMITONE_MIN`/`MAX`, `MAX_VOICES_PER_TRACK`, `canEnableVoice`
- Produces: interactive UI to ingest and toggle voices

- [ ] **Step 1: `IntervalGrid`**

Props:

```ts
{
  activeSemitones: number[];
  disabled?: boolean;
  shiftingSemitone: number | null;
  onToggle: (semitones: number) => void;
}
```

Render buttons for −12…+12 excluding 0 in the toggle row; show a centered **ROOT** label. Active cells highlighted. If `!canEnableVoice(active, s)` and `s` not active, disable with `title="Mute a voice first (max 4)"`. Show spinner/opacity on `shiftingSemitone`.

- [ ] **Step 2: `HarmonizerTrackCard`**

Props: `trackId: 0 | 1 | 2`, `selected`, `onSelect`.

Show: Track N label, waveform peaks from `rootBuffer` (simple canvas or div bars — can copy looper peak approach lightly), volume slider, mute, harmony mix slider (only if root exists), Record / Stop, Upload audio; if `trackId === 0`, Upload video with helper text “Upload a clip already cut to your loop.”

Wire file inputs with `accept` audio vs `accept="video/*,.mp4,.webm,.mov"`.

- [ ] **Step 3: Compose on page**

Selected track’s `IntervalGrid` + `setHarmonyMix` under the cards. Play/Stop transport button.

- [ ] **Step 4: Manual test**

1. Upload short wav to Track 1 → Play → hear loop.  
2. Enable +7 → wait → hear fifth.  
3. Enable 4 intervals → 5th disabled.  
4. Record Track 2 shorter take → snaps/loops to master.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/harmonizer/IntervalGrid.tsx \
  src/app/components/harmonizer/HarmonizerTrackCard.tsx \
  src/app/pages/HarmonizerPage.tsx
git commit -m "$(cat <<'EOF'
feat(harmonizer): add track cards and interval grid UI

EOF
)"
```

---

### Task 8: Compositor + media panel + session export

**Files:**
- Create: `src/app/hooks/useHarmonizerCompositor.ts`
- Create: `src/app/components/harmonizer/HarmonizerMediaPanel.tsx`
- Modify: `src/app/pages/HarmonizerPage.tsx`

**Interfaces:**
- Consumes: `useSessionRecorder`, `EXPORT_WIDTH`/`HEIGHT`/`IG_SAFE` from `exportFormat`, track state, optional webcam `videoRef`, Track 1 `videoUrl`
- Produces: canvas stream for session recorder; media panel UI

**Visual priority (spec):**
1. Track 1 `videoUrl` → draw that `<video>` (cover, loop, sync playhead to `getLoopPhase` approximately via `video.currentTime = phase * duration`).
2. Else if camera on → webcam frames.
3. Else no video stream → WAV-only capture.

Overlay: `"Fourier · Harmonizer"`, active interval chips for playing tracks, simple waveform rail.

Camera toggle: when `videoUrl` present, media panel shows the clip (camera optional/hidden to avoid confusion — prefer **hide webcam toggle while Track 1 has video**).

Session rail: copy Stem Collage record button pattern (`toggleRecord`, download blob, `fileBaseName: "harmonizer-session"`).

`getVideoStream`: return `getCanvasStream()` when (track0 videoUrl || cameraLive), else `null`.

- [ ] **Step 1: Implement `useHarmonizerCompositor`** (raf loop like `useLooperCompositor` / `useStemCompositor`).

- [ ] **Step 2: Implement `HarmonizerMediaPanel`** wrapping video/canvas display (reuse `WebcamFeed` when camera path; for clip, custom 9:16 container showing compositor canvas).

- [ ] **Step 3: Wire session recorder on `HarmonizerPage`.

- [ ] **Step 4: Manual test**

- Camera off, audio playing → Record → WAV downloads.  
- Track 1 video upload → media panel shows clip + overlay → Record → video file.  
- Camera on, no clip → webcam composite → video file.

- [ ] **Step 5: Commit**

```bash
git add src/app/hooks/useHarmonizerCompositor.ts \
  src/app/components/harmonizer/HarmonizerMediaPanel.tsx \
  src/app/pages/HarmonizerPage.tsx
git commit -m "$(cat <<'EOF'
feat(harmonizer): add compositor and session export

EOF
)"
```

---

### Task 9: Error UX + replace-root polish + final checklist

**Files:**
- Modify: `src/app/contexts/HarmonizerContext.tsx` (ensure replace Track 1 clears caches/voices on 2–3 as specified)
- Modify: `src/app/pages/HarmonizerPage.tsx` / track card — surface `error` via sonner `toast.error` or inline banner
- Modify: empty states copy

- [ ] **Step 1: On `error` change, `toast.error(error)` then clear (or keep banner until dismiss).**

- [ ] **Step 2: Verify replace Track 1 with new file clears old voices and re-snaps other tracks.**

- [ ] **Step 3: Run all unit tests**

```bash
pnpm test
```

Expected: all harmonizer util tests PASS.

- [ ] **Step 4: Manual acceptance (from spec)**

- [ ] Mic root → enable 3rd (+4) / 5th (+7) → stack hears, duration unchanged  
- [ ] Track 2/3 length mismatch → trim/loop to master  
- [ ] Track 1 video → audio + picture in export  
- [ ] Camera on/off → MP4/WebM vs WAV  
- [ ] Replace Track 1 → voices/master update  
- [ ] Voice cap at 4  
- [ ] Video with no audio → clear error  

- [ ] **Step 5: Commit**

```bash
git add -u src/app/contexts/HarmonizerContext.tsx src/app/pages/HarmonizerPage.tsx \
  src/app/components/harmonizer/
git commit -m "$(cat <<'EOF'
fix(harmonizer): polish errors and Track 1 replace behavior

EOF
)"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Separate mini-app / route / Home | 6 |
| 3 tracks, 4 voices, ±12 parallel | 2, 5, 7 |
| Post-take stacking | 5, 7 |
| Time-preserving pitch shift | 3 |
| Track 1 video audio + picture | 4, 5, 8 |
| Master from Track 1; 2–3 trim/loop | 1, 5 |
| Shared harmony mix | 5, 7 |
| No hand control | 6–8 (not added) |
| Session WAV / 9:16 video | 8 |
| Stem Collage–like layout | 6–8 |
| Errors / voice cap / replace root | 2, 5, 9 |
| Unit tests trim/cap/cache | 1, 2, 3 |

## Placeholder / consistency notes

- Track UI “Track 1” = `id === 0` everywhere.
- `harmonyMix` is 0–1 shared wet for all voices on that track.
- Default pitch engine is SoundTouch behind `PitchShiftEngine`; duration forced to input length.
- No presets, no diatonic mode, no Loop Station insert in this plan.
