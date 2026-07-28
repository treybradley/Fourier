export type FeatureKey =
  | "rms"
  | "zcr"
  | "spectralCentroid"
  | "spectralFlatness"
  | "spectralFlux"
  | "pitch";

export interface Grain {
  id: number;
  offset: number;
  duration: number;
  rms: number;
  zcr: number;
  spectralCentroid: number;
  spectralFlatness: number;
  spectralFlux: number;
  pitch: number;
  normRms: number;
  normZcr: number;
  normCentroid: number;
  normFlatness: number;
  normFlux: number;
  normPitch: number;
}

export function getNormKey(key: FeatureKey): keyof Grain {
  const map: Record<FeatureKey, keyof Grain> = {
    rms: "normRms",
    zcr: "normZcr",
    spectralCentroid: "normCentroid",
    spectralFlatness: "normFlatness",
    spectralFlux: "normFlux",
    pitch: "normPitch",
  };
  return map[key];
}

const DFT_SIZE = 256;

function dft(samples: Float32Array, size: number): Float32Array {
  const mag = new Float32Array(size / 2);
  for (let k = 0; k < size / 2; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < size; n++) {
      const angle = (2 * Math.PI * k * n) / size;
      re += samples[n] * Math.cos(angle);
      im -= samples[n] * Math.sin(angle);
    }
    mag[k] = Math.sqrt(re * re + im * im);
  }
  return mag;
}

function computeRms(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

function computeZcr(samples: Float32Array): number {
  let count = 0;
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i] >= 0) !== (samples[i - 1] >= 0)) count++;
  }
  return count / samples.length;
}

function computeCentroid(mag: Float32Array, sr: number): number {
  let num = 0, den = 0;
  for (let k = 0; k < mag.length; k++) {
    const freq = (k * sr) / (mag.length * 2);
    num += freq * mag[k];
    den += mag[k];
  }
  return den > 0 ? num / den : 0;
}

function computeFlatness(mag: Float32Array): number {
  let logSum = 0, arithmeticSum = 0;
  const n = mag.length;
  for (let k = 0; k < n; k++) {
    const v = mag[k] + 1e-10;
    logSum += Math.log(v);
    arithmeticSum += v;
  }
  const geo = Math.exp(logSum / n);
  const arith = arithmeticSum / n;
  return arith > 0 ? geo / arith : 0;
}

function computeFlux(mag: Float32Array, prevMag: Float32Array): number {
  let flux = 0;
  for (let k = 0; k < mag.length; k++) {
    flux += Math.max(0, mag[k] - prevMag[k]);
  }
  return flux / mag.length;
}

function computePitch(samples: Float32Array, sr: number): number {
  const minLag = Math.floor(sr / 1000);
  const maxLag = Math.floor(sr / 50);
  let bestLag = 0, bestCorr = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    for (let i = 0; i < samples.length - lag; i++) {
      corr += samples[i] * samples[i + lag];
    }
    if (corr > bestCorr) { bestCorr = corr; bestLag = lag; }
  }
  return bestLag > 0 && bestCorr > 0 ? sr / bestLag : 0;
}

function minmax(grains: Grain[], raw: keyof Grain, norm: keyof Grain) {
  let min = Infinity, max = -Infinity;
  for (const g of grains) { const v = g[raw] as number; if (v < min) min = v; if (v > max) max = v; }
  const range = max - min || 1;
  for (const g of grains) (g[norm] as number) = ((g[raw] as number) - min) / range;
}

export async function extractGrains(
  buffer: AudioBuffer,
  grainSizeMs: number,
  overlapFactor: number,
  onProgress: (p: number) => void,
): Promise<Grain[]> {
  const sr = buffer.sampleRate;
  const data = buffer.getChannelData(0);
  const grainSamples = Math.floor((grainSizeMs * sr) / 1000);
  const hopSamples = Math.floor(grainSamples * (1 - overlapFactor));
  const total = Math.floor((data.length - grainSamples) / hopSamples);
  const grains: Grain[] = [];
  let prevMag = new Float32Array(DFT_SIZE / 2);

  for (let idx = 0; idx < total; idx++) {
    if (idx % 50 === 0) {
      onProgress(idx / total);
      await new Promise<void>((r) => setTimeout(r, 0));
    }
    const start = idx * hopSamples;
    const slice = data.slice(start, start + grainSamples);
    const dftInput = slice.slice(0, DFT_SIZE);
    const mag = dft(dftInput, DFT_SIZE);

    grains.push({
      id: idx,
      offset: start,
      duration: grainSizeMs / 1000,
      rms: computeRms(slice),
      zcr: computeZcr(slice),
      spectralCentroid: computeCentroid(mag, sr),
      spectralFlatness: computeFlatness(mag),
      spectralFlux: computeFlux(mag, prevMag),
      pitch: computePitch(slice, sr),
      normRms: 0, normZcr: 0, normCentroid: 0,
      normFlatness: 0, normFlux: 0, normPitch: 0,
    });
    prevMag = mag;
  }

  minmax(grains, "rms", "normRms");
  minmax(grains, "zcr", "normZcr");
  minmax(grains, "spectralCentroid", "normCentroid");
  minmax(grains, "spectralFlatness", "normFlatness");
  minmax(grains, "spectralFlux", "normFlux");
  minmax(grains, "pitch", "normPitch");

  return grains;
}
