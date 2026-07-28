// Core stem-separation pipeline — no React dependencies.
// Uses Open-Unmix ONNX models (umxl) via onnxruntime-web.
// Parameters must exactly match model training: n_fft=4096, n_hop=1024, sr=44100.

const N_FFT = 4096;
const N_HOP = 1024;
const N_BINS = N_FFT / 2 + 1; // 2049
const SAMPLE_RATE = 44100;
const CHUNK_T = 100; // model fixed sequence length
const MODEL_BASE = "https://huggingface.co/chinedudave06/demucs-onnx/resolve/main";
const CACHE_NAME = "umxl-models-v1";

export type StemName = "vocals" | "drums" | "bass" | "other";
export const STEM_NAMES: StemName[] = ["vocals", "drums", "bass", "other"];
export const STEM_LABELS: Record<StemName, string> = {
  vocals: "Vocals",
  drums: "Drums",
  bass: "Bass",
  other: "Other",
};
export const STEM_COLORS: Record<StemName, string> = {
  vocals: "#EA00B8",
  drums: "#00FDD9",
  bass: "#0059CE",
  other: "#FFB800",
};

export interface SeparationCallbacks {
  onModelDownload: (stem: StemName, progress: number, cached: boolean) => void;
  onStemInference: (stem: StemName, chunksDone: number, chunksTotal: number) => void;
}

// ── Hann window ───────────────────────────────────────────────────────────────

function hann(N: number): Float32Array {
  const w = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
  }
  return w;
}

// ── In-place Cooley-Tukey FFT (power-of-2 only) ───────────────────────────────

function fft(re: Float32Array, im: Float32Array): void {
  const N = re.length;
  // Bit-reversal permutation
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  // Butterfly passes
  for (let len = 2; len <= N; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < N; i += len) {
      let cRe = 1, cIm = 0;
      const half = len >> 1;
      for (let j = 0; j < half; j++) {
        const uRe = re[i + j];
        const uIm = im[i + j];
        const vRe = re[i + j + half] * cRe - im[i + j + half] * cIm;
        const vIm = re[i + j + half] * cIm + im[i + j + half] * cRe;
        re[i + j] = uRe + vRe;
        im[i + j] = uIm + vIm;
        re[i + j + half] = uRe - vRe;
        im[i + j + half] = uIm - vIm;
        const ncRe = cRe * wRe - cIm * wIm;
        cIm = cRe * wIm + cIm * wRe;
        cRe = ncRe;
      }
    }
  }
}

// IFFT via conjugate trick: IFFT(X) = conj(FFT(conj(X))) / N
function ifft(re: Float32Array, im: Float32Array): void {
  const N = re.length;
  for (let i = 0; i < N; i++) im[i] = -im[i];
  fft(re, im);
  for (let i = 0; i < N; i++) {
    re[i] /= N;
    im[i] = -im[i] / N;
  }
}

// ── STFT ──────────────────────────────────────────────────────────────────────

interface StftResult {
  magnitudes: Float32Array[]; // [nFrames][N_BINS]
  phases: Float32Array[];     // [nFrames][N_BINS]
  nFrames: number;
}

function computeStft(signal: Float32Array): StftResult {
  const win = hann(N_FFT);
  const nFrames = Math.max(0, Math.floor((signal.length - N_FFT) / N_HOP) + 1);
  const magnitudes: Float32Array[] = new Array(nFrames);
  const phases: Float32Array[] = new Array(nFrames);
  const re = new Float32Array(N_FFT);
  const im = new Float32Array(N_FFT);

  for (let f = 0; f < nFrames; f++) {
    const offset = f * N_HOP;
    im.fill(0);
    for (let i = 0; i < N_FFT; i++) {
      re[i] = (signal[offset + i] ?? 0) * win[i];
    }
    fft(re, im);
    const mag = new Float32Array(N_BINS);
    const phase = new Float32Array(N_BINS);
    for (let b = 0; b < N_BINS; b++) {
      mag[b] = Math.sqrt(re[b] * re[b] + im[b] * im[b]);
      phase[b] = Math.atan2(im[b], re[b]);
    }
    magnitudes[f] = mag;
    phases[f] = phase;
  }
  return { magnitudes, phases, nFrames };
}

// ── ISTFT (overlap-add with Hann window) ──────────────────────────────────────

function computeIstft(
  magnitudes: Float32Array[],
  phases: Float32Array[],
  origLength: number
): Float32Array {
  const win = hann(N_FFT);
  const nFrames = magnitudes.length;
  const out = new Float32Array(origLength);
  const winSum = new Float32Array(origLength);
  const re = new Float32Array(N_FFT);
  const im = new Float32Array(N_FFT);

  for (let f = 0; f < nFrames; f++) {
    const offset = f * N_HOP;
    // Reconstruct complex spectrum: X[b] = mag[b] * e^(j*phase[b])
    for (let b = 0; b < N_BINS; b++) {
      re[b] = magnitudes[f][b] * Math.cos(phases[f][b]);
      im[b] = magnitudes[f][b] * Math.sin(phases[f][b]);
    }
    // Hermitian symmetry for real signal: X[N-k] = conj(X[k])
    for (let b = 1; b < N_BINS - 1; b++) {
      re[N_FFT - b] = re[b];
      im[N_FFT - b] = -im[b];
    }
    ifft(re, im);
    // Overlap-add
    for (let i = 0; i < N_FFT; i++) {
      if (offset + i < origLength) {
        out[offset + i] += re[i] * win[i];
        winSum[offset + i] += win[i] * win[i];
      }
    }
  }

  // Normalize by window power
  for (let i = 0; i < origLength; i++) {
    if (winSum[i] > 1e-8) out[i] /= winSum[i];
  }
  return out;
}

// ── Resampling ────────────────────────────────────────────────────────────────

async function resampleTo44100(buffer: AudioBuffer): Promise<AudioBuffer> {
  if (buffer.sampleRate === SAMPLE_RATE) return buffer;
  const ratio = buffer.sampleRate / SAMPLE_RATE;
  const newLength = Math.round(buffer.length / ratio);
  const offline = new OfflineAudioContext(buffer.numberOfChannels, newLength, SAMPLE_RATE);
  const src = offline.createBufferSource();
  src.buffer = buffer;
  src.connect(offline.destination);
  src.start(0);
  return offline.startRendering();
}

// ── Model download with Cache API ─────────────────────────────────────────────

async function fetchModel(
  stem: StemName,
  onProgress: (progress: number, cached: boolean) => void,
  signal?: AbortSignal
): Promise<ArrayBuffer> {
  const url = `${MODEL_BASE}/umxl_${stem}.onnx`;
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(url);
  if (cached) {
    onProgress(1, true);
    return cached.arrayBuffer();
  }

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Model download failed: ${response.status}`);

  const contentLength = parseInt(response.headers.get("content-length") ?? "0");
  const estimated = contentLength || 108 * 1024 * 1024;
  const reader = response.body!.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    chunks.push(value);
    received += value.length;
    onProgress(Math.min(received / estimated, 0.99), false);
  }

  const total = chunks.reduce((s, c) => s + c.length, 0);
  const data = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { data.set(c, off); off += c.length; }

  await cache.put(url, new Response(data.buffer, { headers: { "content-type": "application/octet-stream" } }));
  onProgress(1, false);
  return data.buffer;
}

// ── Tensor packing / unpacking ────────────────────────────────────────────────

// Shape: [1, 2, N_BINS, CHUNK_T] — C-order
// Index: ch * N_BINS * CHUNK_T + bin * CHUNK_T + frame
function packChunk(mag0: Float32Array[], mag1: Float32Array[], chunkStart: number): Float32Array {
  const data = new Float32Array(2 * N_BINS * CHUNK_T);
  for (let ch = 0; ch < 2; ch++) {
    const mags = ch === 0 ? mag0 : mag1;
    for (let b = 0; b < N_BINS; b++) {
      for (let f = 0; f < CHUNK_T; f++) {
        const fi = chunkStart + f;
        data[ch * N_BINS * CHUNK_T + b * CHUNK_T + f] = fi < mags.length ? mags[fi][b] : 0;
      }
    }
  }
  return data;
}

function unpackChannel(outputData: Float32Array, ch: number, nFrames: number): Float32Array[] {
  const frames: Float32Array[] = new Array(nFrames);
  for (let f = 0; f < nFrames; f++) {
    frames[f] = new Float32Array(N_BINS);
    for (let b = 0; b < N_BINS; b++) {
      frames[f][b] = outputData[ch * N_BINS * CHUNK_T + b * CHUNK_T + f];
    }
  }
  return frames;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function separateStems(
  source: AudioBuffer,
  audioCtx: AudioContext,
  callbacks: SeparationCallbacks,
  signal?: AbortSignal
): Promise<Record<StemName, AudioBuffer>> {
  // Dynamic import so app builds even before onnxruntime-web is installed
  const ort = await import("onnxruntime-web");
  ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/";

  const resampled = await resampleTo44100(source);
  const ch0 = resampled.getChannelData(0);
  const ch1 = resampled.numberOfChannels > 1 ? resampled.getChannelData(1) : ch0;
  const stft0 = computeStft(ch0);
  const stft1 = computeStft(ch1);
  const nFrames = Math.min(stft0.nFrames, stft1.nFrames);
  const nChunks = Math.ceil(nFrames / CHUNK_T);
  const origLen = resampled.length;

  const results: Partial<Record<StemName, AudioBuffer>> = {};

  for (const stem of STEM_NAMES) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const modelData = await fetchModel(
      stem,
      (p, cached) => callbacks.onModelDownload(stem, p, cached),
      signal
    );

    const session = await ort.InferenceSession.create(modelData, {
      executionProviders: ["wasm"],
    });

    const sepMags0: Float32Array[] = new Array(nFrames);
    const sepMags1: Float32Array[] = new Array(nFrames);

    for (let c = 0; c < nChunks; c++) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const chunkStart = c * CHUNK_T;
      const inputData = packChunk(stft0.magnitudes, stft1.magnitudes, chunkStart);
      const tensor = new ort.Tensor("float32", inputData, [1, 2, N_BINS, CHUNK_T]);
      const feeds: Record<string, typeof tensor> = {};
      feeds[session.inputNames[0]] = tensor;
      const output = await session.run(feeds);
      const outData = output[session.outputNames[0]].data as Float32Array;

      const framesInChunk = Math.min(CHUNK_T, nFrames - chunkStart);
      const frames0 = unpackChannel(outData, 0, framesInChunk);
      const frames1 = unpackChannel(outData, 1, framesInChunk);
      for (let f = 0; f < framesInChunk; f++) {
        sepMags0[chunkStart + f] = frames0[f];
        sepMags1[chunkStart + f] = frames1[f];
      }

      callbacks.onStemInference(stem, c + 1, nChunks);
      if (c % 10 === 9) await new Promise(r => setTimeout(r, 0));
    }

    await session.release();

    const sig0 = computeIstft(sepMags0, stft0.phases, origLen);
    const sig1 = computeIstft(sepMags1, stft1.phases, origLen);
    const outBuf = audioCtx.createBuffer(2, origLen, SAMPLE_RATE);
    outBuf.copyToChannel(sig0, 0);
    outBuf.copyToChannel(sig1, 1);
    results[stem] = outBuf;
  }

  return results as Record<StemName, AudioBuffer>;
}

// ── WAV export ────────────────────────────────────────────────────────────────

export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const nCh = buffer.numberOfChannels;
  const nSamples = buffer.length;
  const sr = buffer.sampleRate;
  const bps = 2;
  const dataSize = nSamples * nCh * bps;
  const ab = new ArrayBuffer(44 + dataSize);
  const view = new DataView(ab);

  const str = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  str(0, "RIFF"); view.setUint32(4, 36 + dataSize, true);
  str(8, "WAVE"); str(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, nCh, true); view.setUint32(24, sr, true);
  view.setUint32(28, sr * nCh * bps, true); view.setUint16(32, nCh * bps, true);
  view.setUint16(34, 16, true); str(36, "data"); view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < nCh; c++) channels.push(buffer.getChannelData(c));
  let off = 44;
  for (let i = 0; i < nSamples; i++) {
    for (let c = 0; c < nCh; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([ab], { type: "audio/wav" });
}
