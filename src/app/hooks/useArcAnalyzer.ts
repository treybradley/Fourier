import { useCallback } from "react";
import type { ArcTrack } from "../components/arc/types";

// Cooley-Tukey in-place FFT (N must be power of 2)
function fft(re: Float32Array, im: Float32Array): void {
  const N = re.length;
  let j = 0;
  for (let i = 1; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let len = 2; len <= N; len <<= 1) {
    const ang = (2 * Math.PI) / len;
    const wRe = Math.cos(ang), wIm = -Math.sin(ang);
    for (let i = 0; i < N; i += len) {
      let uRe = 1, uIm = 0;
      for (let k = 0; k < len >> 1; k++) {
        const idx = i + k + (len >> 1);
        const vRe = re[idx] * uRe - im[idx] * uIm;
        const vIm = re[idx] * uIm + im[idx] * uRe;
        re[idx] = re[i + k] - vRe;
        im[idx] = im[i + k] - vIm;
        re[i + k] += vRe;
        im[i + k] += vIm;
        const newRe = uRe * wRe - uIm * wIm;
        uIm = uRe * wIm + uIm * wRe;
        uRe = newRe;
      }
    }
  }
}

function windowedMagnitudes(samples: Float32Array, N: number, start: number): Float32Array {
  const re = new Float32Array(N);
  const im = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N);
    re[i] = (samples[start + i] ?? 0) * hann;
  }
  fft(re, im);
  const mags = new Float32Array(N >> 1);
  for (let i = 0; i < N >> 1; i++) {
    mags[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
  }
  return mags;
}

// Harmonic Product Spectrum: suppress overtones so the fundamental wins.
function applyHPS(mags: Float32Array): Float32Array {
  const N = mags.length;
  const hps = new Float32Array(N);
  for (let k = 0; k < N; k++) {
    let p = mags[k];
    if (k * 2 < N) p *= mags[k * 2];
    if (k * 3 < N) p *= mags[k * 3];
    hps[k] = p;
  }
  return hps;
}

// ---------- BPM ----------

// Multi-band spectral flux onset strength → autocorrelation BPM.
// More accurate than amplitude-envelope autocorrelation because it responds
// to transients in each frequency band independently (catches hi-hats,
// kick, and snare separately rather than just overall loudness).
function detectBPMAccurate(samples: Float32Array, sampleRate: number): number {
  const HOP = 256;
  const FFT_N = 2048;
  const numFrames = Math.floor((samples.length - FFT_N) / HOP);
  if (numFrames < 10) return 120;

  const binHz = sampleRate / FFT_N;
  // Four bands: sub/kick, low-mid, mid, hi
  const bands: [number, number][] = [
    [30, 200],
    [200, 800],
    [800, 4000],
    [4000, 16000],
  ];

  let prevMags = new Float32Array(FFT_N >> 1);
  const onset = new Float32Array(numFrames);

  for (let f = 0; f < numFrames; f++) {
    const mags = windowedMagnitudes(samples, FFT_N, f * HOP);
    let sf = 0;
    for (const [lo, hi] of bands) {
      const kLo = Math.max(1, Math.round(lo / binHz));
      const kHi = Math.min((FFT_N >> 1) - 1, Math.round(hi / binHz));
      for (let k = kLo; k <= kHi; k++) {
        sf += Math.max(0, mags[k] - prevMags[k]); // half-wave rectified flux
      }
    }
    onset[f] = sf;
    prevMags = mags;
  }

  // Autocorrelation on onset strength across lag range 50–210 BPM
  const fps = sampleRate / HOP;
  const lagMin = Math.max(1, Math.round(fps * 60 / 210));
  const lagMax = Math.round(fps * 60 / 50);

  let bestLag = Math.round(fps * 60 / 120);
  let bestScore = -Infinity;

  for (let lag = lagMin; lag <= lagMax; lag++) {
    let corr = 0;
    const n = numFrames - lag;
    for (let i = 0; i < n; i++) corr += onset[i] * onset[i + lag];
    // Mild prior: prefer 80–160 BPM
    const bpmHere = (fps * 60) / lag;
    const prior = bpmHere >= 80 && bpmHere <= 160 ? 1.06 : 1.0;
    if (corr * prior > bestScore) {
      bestScore = corr * prior;
      bestLag = lag;
    }
  }

  let bpm = (fps * 60) / bestLag;

  // Octave correction: land in 70–175 BPM
  while (bpm < 70) bpm *= 2;
  while (bpm > 175) bpm /= 2;

  return Math.round(bpm);
}

// ---------- Key ----------

const KS_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KS_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

const NOTE_NAMES_MAJOR = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const NOTE_NAMES_MINOR = ["Cm", "C#m", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "Bbm", "Bm"];
const CAMELOT_MAJOR   = ["8B","3B","10B","5B","12B","7B","2B","9B","4B","11B","6B","1B"];
const CAMELOT_MINOR   = ["5A","12A","7A","2A","9A","4A","11A","6A","1A","8A","3A","10A"];

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - mx) * (y[i] - my);
    dx2 += (x[i] - mx) ** 2;
    dy2 += (y[i] - my) ** 2;
  }
  return dx2 === 0 || dy2 === 0 ? 0 : num / Math.sqrt(dx2 * dy2);
}

function detectKey(chroma: number[]): { key: string; camelot: string } {
  let bestCorr = -Infinity, bestKey = "C", bestCamelot = "8B";
  for (let root = 0; root < 12; root++) {
    const rot = chroma.map((_, i) => chroma[(i - root + 12) % 12]);
    const maj = pearsonCorrelation(rot, KS_MAJOR);
    const min = pearsonCorrelation(rot, KS_MINOR);
    if (maj > bestCorr) { bestCorr = maj; bestKey = NOTE_NAMES_MAJOR[root]; bestCamelot = CAMELOT_MAJOR[root]; }
    if (min > bestCorr) { bestCorr = min; bestKey = NOTE_NAMES_MINOR[root]; bestCamelot = CAMELOT_MINOR[root]; }
  }
  return { key: bestKey, camelot: bestCamelot };
}

// Fill one 12-bin chroma vector from a window (HPS, C2–C7). Returns RMS weight.
function accumulateWindowChroma(
  samples: Float32Array,
  sampleRate: number,
  N: number,
  start: number,
  out: number[],
): number {
  let rmsSum = 0;
  for (let i = 0; i < N; i++) rmsSum += samples[start + i] ** 2;
  const weight = Math.sqrt(rmsSum / N) + 1e-8;

  const mags = windowedMagnitudes(samples, N, start);
  const hps = applyHPS(mags);
  const binHz = sampleRate / N;

  for (let k = 2; k < hps.length; k++) {
    const freq = k * binHz;
    if (freq < 65 || freq > 2100) continue; // C2–C7
    const midiNote = 69 + 12 * Math.log2(freq / 440);
    const pitchClass = ((Math.round(midiNote) % 12) + 12) % 12;
    out[pitchClass] += hps[k] * weight;
  }
  return weight;
}

function normalizeChroma(chroma: number[]): number[] {
  const maxVal = Math.max(...chroma, 1e-10);
  return chroma.map((v) => v / maxVal);
}

// 4096-pt FFT, energy-weighted HPS.
// Returns track-average chroma (body windows) + time frames spanning the full file
// so the over-time chromagram aligns with waveform seek (0–1 = full duration).
function computeChromaAnalysis(
  samples: Float32Array,
  sampleRate: number,
): { chroma: number[]; chromaFrames: number[][] } {
  const N = 4096;
  const empty = () => ({
    chroma: new Array(12).fill(0),
    chromaFrames: [] as number[][],
  });
  if (samples.length < N + 1) return empty();

  // --- Average (skip first/last 10%, 150 windows) ---
  const chroma = new Array(12).fill(0);
  const bodyStart = Math.floor(samples.length * 0.10);
  const bodyEnd = Math.floor(samples.length * 0.90);
  const bodySpan = bodyEnd - bodyStart - N;
  let totalWeight = 0;

  if (bodySpan > 0) {
    const NUM_WINDOWS = 150;
    for (let w = 0; w < NUM_WINDOWS; w++) {
      const start = bodyStart + Math.floor((w / (NUM_WINDOWS - 1)) * bodySpan);
      if (start + N >= samples.length) continue;
      totalWeight += accumulateWindowChroma(samples, sampleRate, N, start, chroma);
    }
  }

  if (totalWeight > 0) for (let i = 0; i < 12; i++) chroma[i] /= totalWeight;
  const avg = normalizeChroma(chroma);

  // --- Frames across full track (aligns with waveform scrub) ---
  const NUM_FRAMES = 64;
  const fullSpan = samples.length - N;
  const chromaFrames: number[][] = [];

  if (fullSpan > 0) {
    for (let f = 0; f < NUM_FRAMES; f++) {
      const start = Math.floor((f / (NUM_FRAMES - 1)) * fullSpan);
      const frame = new Array(12).fill(0);
      accumulateWindowChroma(samples, sampleRate, N, start, frame);
      chromaFrames.push(normalizeChroma(frame));
    }
  }

  return { chroma: avg, chromaFrames };
}

// ---------- Frequency band energy (DJ EQ bands) ----------

// Normalized relative to the loudest band so the dominant band = 1.0.
// Uses 20 evenly-spaced windows across the body of the track for stability.
function computeBands(samples: Float32Array, sampleRate: number) {
  const N = 2048;
  const binHz = sampleRate / N;

  const BANDS = [
    { lo:    20, hi:    80 }, // sub
    { lo:    80, hi:   300 }, // bass
    { lo:   300, hi:  3000 }, // mids
    { lo:  3000, hi: 20000 }, // highs
  ];

  const acc = [0, 0, 0, 0];
  const start = Math.floor(samples.length * 0.10);
  const end   = Math.floor(samples.length * 0.90);
  const span  = end - start - N;
  const NUM   = 20;

  for (let w = 0; w < NUM; w++) {
    const offset = start + Math.floor((w / (NUM - 1)) * span);
    if (offset + N >= samples.length) continue;
    const mags = windowedMagnitudes(samples, N, offset);
    for (let b = 0; b < BANDS.length; b++) {
      const kLo = Math.max(1, Math.round(BANDS[b].lo / binHz));
      const kHi = Math.min((N >> 1) - 1, Math.round(BANDS[b].hi / binHz));
      for (let k = kLo; k <= kHi; k++) acc[b] += mags[k];
    }
  }

  const maxVal = Math.max(...acc, 1e-10);
  return {
    sub:   acc[0] / maxVal,
    bass:  acc[1] / maxVal,
    mids:  acc[2] / maxVal,
    highs: acc[3] / maxVal,
  };
}

function computeRMS(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

// Peak amplitude envelope downsampled to `points` buckets for waveform display.
function computeWaveform(samples: Float32Array, points = 120): number[] {
  const blockSize = Math.max(1, Math.floor(samples.length / points));
  const wf: number[] = [];
  let maxVal = 0;
  for (let i = 0; i < points; i++) {
    let peak = 0;
    const s = i * blockSize;
    for (let j = 0; j < blockSize; j++) {
      const v = Math.abs(samples[s + j] ?? 0);
      if (v > peak) peak = v;
    }
    wf.push(peak);
    if (peak > maxVal) maxVal = peak;
  }
  return maxVal > 0 ? wf.map(v => v / maxVal) : wf;
}

// ---------- Hook ----------

export function useArcAnalyzer() {
  const analyzeFile = useCallback(async (file: File): Promise<Partial<ArcTrack>> => {
    const arrayBuffer = await file.arrayBuffer();
    const ctx = new AudioContext();
    try {
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      // Defensive copy so any third-party lib can't corrupt our samples
      const samples = audioBuffer.getChannelData(0).slice();
      const sr = audioBuffer.sampleRate;

      // BPM — onset-based, accuracy-first
      const bpm = detectBPMAccurate(samples, sr);

      // Waveform for display — 500 points for detail on long tracks
      const waveform = computeWaveform(samples, 500);

      // Key + chroma average + time frames (4096 FFT, HPS, energy-weighted)
      const { chroma, chromaFrames } = computeChromaAnalysis(samples, sr);
      const { key, camelot } = detectKey(chroma);

      // Energy
      const energy = Math.min(computeRMS(samples) * 6, 1);

      // EQ band energies
      const { sub, bass, mids, highs } = computeBands(samples, sr);

      // Metadata from filename: "Artist - Title" convention
      const baseName = file.name.replace(/\.[^.]+$/, "");
      const dashIdx = baseName.indexOf(" - ");
      const title  = dashIdx >= 0 ? baseName.slice(dashIdx + 3).trim() : baseName.trim();
      const artist = dashIdx >= 0 ? baseName.slice(0, dashIdx).trim() : "";

      return {
        title, artist,
        duration: audioBuffer.duration,
        bpm, key, camelot, chroma, chromaFrames, waveform,
        energy, sub, bass, mids, highs,
      };
    } finally {
      ctx.close();
    }
  }, []);

  return { analyzeFile };
}
