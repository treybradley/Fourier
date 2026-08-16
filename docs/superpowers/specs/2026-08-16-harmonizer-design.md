# Harmonizer — Design Spec

**Date:** 2026-08-16  
**Status:** Approved for implementation planning  
**App name:** Harmonizer  
**Route:** `/harmonizer` (new home-grid mini-app)

## Summary

Harmonizer is a separate Fourier mini-app for stacking **parallel interval harmonies** on recorded or uploaded takes. Users fill up to **3 tracks**, each with a dry root plus up to **4** pitch-shifted voices from a **±12 semitone** grid. Pitch shift preserves duration (no speed-up/slow-down). Session export mirrors Stem Collage: optional 9:16 video with a baked compositor overlay, or audio-only WAV when video is off.

This is **not** Loop Station (no overdub/BPM grid) and **not** key-aware/diatonic estimation. Users who want non-parallel color sing additional tracks.

## Goals

- Post-take stacking: record or load a root, then enable interval voices.
- Time-preserving pitch shift only (never `playbackRate` / speed change).
- Parallel intervals only (±N semitones from the sung/uploaded root).
- Stem Collage–like layout and session capture UX.
- Track 1 may supply an uploaded video that is both the audio root and the 9:16 visual.

## Non-goals (v1)

- Hand / gesture control
- Live monitor of harmonies while recording
- Key/scale-aware (diatonic) interval selection
- Pitch detection
- In-app video trimming/editing
- Per-voice mix sliders (shared harmony mix per track only)
- Interval presets (Power / triad) — optional follow-up
- Reusing Harmonizer as a Loop Station insert (future)

## Product model

| Concept | Meaning |
|--------|---------|
| **Track** | A performance: mic, audio file, or (track 1 only) video file |
| **Root** | Dry, unshifted audio for that track |
| **Voice** | One parallel pitch-shifted copy of that track’s root |
| **Master timeline** | Duration of Track 1’s root audio |

Tracks 2–3 are additional human takes when the grid cannot invent the desired part. Interval voices do **not** consume track slots.

## Limits

| Cap | Value |
|-----|--------|
| Tracks | 3 |
| Voices per track | 4 (excluding dry root) |
| Semitone range | −12 … +12 (root = 0, always present when track has audio) |
| Video upload | Track 1 only |

## Interval grid

- Parallel only: each cell is a fixed semitone offset from the root.
- Toggle cells on/off; at most 4 active voices per track.
- Hitting the cap disables further cells until one is cleared; show a short hint.
- Root (0) is not a “voice slot”; dry always plays when the track has audio (subject to mute/volume).
- Optional named presets are out of v1; the grid is the primary UI.

## Timeline & sync

1. **Track 1 root audio sets `masterLength`.**  
   Users should upload videos already cut to the loop they want so picture and audio match.
2. **Tracks 2–3 trim if longer, loop if shorter** to match `masterLength` (Loop Station–style snap).
3. All active roots and voices loop on a shared transport locked to `masterLength`.
4. Replacing Track 1’s root updates `masterLength`, clears Track 1’s voice cache, and re-snaps tracks 2–3.

## Ingest

### Track 1

- **Record** (mic) → buffer after stop → stack intervals.
- **Upload audio** → `decodeAudioData`.
- **Upload video** → extract audio into root buffer; keep blob/object URL for compositor picture. Reject video with no audio track and show a clear message. Empty-state copy: upload a clip already cut to the loop.

### Tracks 2–3

- **Record** or **Upload audio** only (no video upload).

## Mixing

- Per track: dry root level via track volume; **one shared harmony mix** slider scales all active voices on that track vs the dry root.
- Mute / volume per track as in other mini-apps.
- No per-interval gain in v1.

## DSP

- Module: e.g. `pitchShiftBuffer(buffer, semitones) → AudioBuffer`.
- Must preserve duration and timing (phase vocoder / PSOLA / WASM pitch library — **not** playback rate).
- Prefer offline / worker generation after the take.
- Cache by `(track identity, root buffer identity, semitone)` so toggling the grid does not recompute unnecessarily.
- On shift failure: leave cell off, toast/error, do not block dry playback.

## Audio graph (conceptual)

```
Track N:  root BufferSource ──► trackGain ──┐
          voice₁…₄ BufferSources ──► harmonyGain ──┘
                                              ▼
                                         masterGain → destination
                                              └→ session recorder
```

All buffer sources loop to `masterLength` on a shared clock.

## UI / layout

Mirror Stem Collage:

```
┌ MiniAppHeader: Harmonizer · … ─────────────────────┐
│ [media 9:16] │ [rec] [cam] │ Track cards            │
│ (optional)   │             │ Selected → IntervalGrid │
│              │             │ + shared harmony mix    │
└────────────────────────────────────────────────────┘
```

- **Media panel:** Track 1 uploaded video when present; otherwise optional webcam (capture only, no hand control).
- **Rail:** Session record + camera toggle (same patterns as Stem Collage).
- **Track cards:** waveform, volume/mute, ingest actions; Track 1 includes Upload video.
- **Interval grid:** shown for the selected track with audio.

### Visual / export priority

1. Track 1 has uploaded video → compositor uses that clip as the picture; session with video on → 9:16 MP4 over that footage.
2. No clip, camera on → live webcam + baked UI (Stem Collage path).
3. No clip, camera off → audio-only WAV of the mixed dry + harmony voices.

Overlay should include Harmonizer branding, active interval chips, and waveform/track cues so shares read as a choir stack.

Reuse: `useSessionRecorder`, `MiniAppHeader`, `WebcamFeed` patterns, `exportFormat` (9:16 / IG-safe).

## Architecture

| Piece | Role |
|--------|------|
| `HarmonizerPage` | Shell layout, session record wiring |
| `HarmonizerProvider` | Tracks, master clock, ingest, voice cache, master bus |
| `HarmonizerTrackCard` | Per-track UI + ingest |
| `IntervalGrid` | ±12 toggle UI + voice cap |
| `HarmonizerMediaPanel` | Webcam or Track-1 `<video>` + canvas |
| `useHarmonizerCompositor` | 9:16 baked overlay + `captureStream` |
| `pitchShiftBuffer` | Time-preserving shift + cache helpers |

**Do not** overload `AudioEngineContext` (Stem Collage rate-pitch) or `LooperContext` (overdub looper). Shared primitives only (`useSessionRecorder`, export helpers).

Home: add Harmonizer tool card; routes: lazy `/harmonizer`.

### Track state (sketch)

```ts
type TrackSource = "empty" | "mic" | "audio-file" | "video-file"; // video-file only when id === 0 (UI Track 1)

interface HarmonyVoice {
  semitones: number; // ≠ 0
  buffer: AudioBuffer;
}

interface HarmonizerTrack {
  id: 0 | 1 | 2; // UI labels Track 1–3
  rootBuffer: AudioBuffer | null;
  source: TrackSource;
  videoUrl?: string; // object URL; only valid when id === 0
  voices: HarmonyVoice[]; // max 4
  volume: number;
  harmonyMix: number; // shared wet for all voices
  isMuted: boolean;
}
```

## Data flow

1. User fills Track 1 → set `masterLength` → loop dry root.
2. Toggle grid cells → async pitch-shift → cache → attach up to 4 voices; harmony mix applies.
3. Fill Tracks 2–3 → trim/loop to master → same grid behavior.
4. Session record from master bus ± compositor stream when video path is active.

## Error handling

| Case | Behavior |
|------|----------|
| Pitch-shift slow/fail | Cell stays off; short error; dry keeps playing |
| Video with no audio | Reject upload; clear message |
| Replace Track 1 root | Clear Track 1 voice cache; update master; re-snap 2–3 |
| Voice cap | Grey out further cells; hint to clear a voice |
| Decode / mic failure | Surface error; leave track empty |

## Testing

**Unit**

- Trim / loop buffer to master length
- Voice cap enforcement
- Pitch-shift cache key behavior

**Manual**

- Mic root → enable 3rd/5th → hear stack, duration unchanged
- Audio upload on tracks 2–3 with length mismatch → snap to master
- Track 1 video → audio + picture in export
- Camera on/off → MP4 vs WAV
- Replace Track 1 → voices/master update correctly

## Future (out of scope)

- Interval presets
- Per-voice levels / formant controls
- Key-aware intervals
- Live harmony monitoring while recording
- Harmonizer engine as Loop Station mic insert
- ±24 semitone range / global voice soft cap UI
