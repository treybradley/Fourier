import { fitBufferToLength } from "./fitBufferToLength";

export interface PitchShiftEngine {
  shift(input: AudioBuffer, semitones: number): Promise<AudioBuffer>;
}

function createMonoBuffer(sampleRate: number, length: number): AudioBuffer {
  const len = Math.max(1, Math.floor(length));
  const Offline =
    globalThis.OfflineAudioContext ??
    (globalThis as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
      .webkitOfflineAudioContext;
  if (!Offline) {
    // Node / vitest fallback used by injected engines + 0-semitone path
    const data = [new Float32Array(len)];
    return {
      numberOfChannels: 1,
      length: len,
      sampleRate,
      duration: len / sampleRate,
      getChannelData: (c: number) => data[c] ?? data[0],
      copyFromChannel() {},
      copyToChannel() {},
    } as unknown as AudioBuffer;
  }
  const ctx = new Offline(1, len, sampleRate);
  return ctx.createBuffer(1, len, sampleRate);
}

function copyExactLength(input: AudioBuffer): AudioBuffer {
  const out = createMonoBuffer(input.sampleRate, input.length);
  out.getChannelData(0).set(input.getChannelData(0).subarray(0, input.length));
  return out;
}

function forceLength(input: AudioBuffer, maybe: AudioBuffer): AudioBuffer {
  if (maybe.length === input.length) return maybe;
  return fitBufferToLength(
    {
      sampleRate: input.sampleRate,
      createBuffer: (ch, length, sr) => createMonoBuffer(sr, length),
    },
    maybe,
    input.length,
  );
}

async function defaultSoundTouchEngine(
  input: AudioBuffer,
  semitones: number,
): Promise<AudioBuffer> {
  const { SoundTouch, SimpleFilter, WebAudioBufferSource } = await import(
    "soundtouchjs"
  );

  // SoundTouch expects interleaved stereo frames from WebAudioBufferSource
  const mono = createMonoBuffer(input.sampleRate, input.length);
  mono.getChannelData(0).set(input.getChannelData(0).subarray(0, input.length));

  const st = new SoundTouch();
  st.tempo = 1;
  st.pitchSemitones = semitones;

  const source = new WebAudioBufferSource(mono);
  const filter = new SimpleFilter(source, st);

  const collected: number[] = [];
  const chunk = new Float32Array(8192);
  let idle = 0;
  const maxIters = Math.ceil(input.length / 512) + 64;

  for (let iter = 0; iter < maxIters; iter++) {
    const n = filter.extract(chunk, 2048);
    if (n === 0) {
      idle += 1;
      if (idle > 8 || filter.sourcePosition >= input.length) break;
      continue;
    }
    idle = 0;
    for (let i = 0; i < n; i++) {
      collected.push(chunk[i * 2] ?? 0);
    }
    if (collected.length >= input.length * 2 && filter.sourcePosition >= input.length) {
      break;
    }
  }

  const rawLen = Math.max(1, collected.length);
  const raw = createMonoBuffer(input.sampleRate, rawLen);
  const outData = raw.getChannelData(0);
  for (let i = 0; i < rawLen; i++) outData[i] = collected[i] ?? 0;
  return raw;
}

/**
 * Pitch-shift an AudioBuffer while preserving duration (same sample length).
 * Never uses playbackRate.
 */
export async function pitchShiftBuffer(
  input: AudioBuffer,
  semitones: number,
  opts?: { engine?: PitchShiftEngine },
): Promise<AudioBuffer> {
  if (!Number.isFinite(semitones) || semitones === 0) {
    return copyExactLength(input);
  }

  const engine = opts?.engine ?? {
    shift: defaultSoundTouchEngine,
  };

  const shifted = await engine.shift(input, semitones);
  return forceLength(input, shifted);
}
