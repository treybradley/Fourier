/**
 * Demo AudioBuffer for Waveform + Arc analysis.
 * Wide amplitude dynamics so RMS and peak envelopes read as a real stem
 * (thick body + clearer hits), plus chord motion for chroma.
 */
export function createDemoBuffer(
  ctx: BaseAudioContext,
  seconds = 6,
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  // C major progression: C – Am – F – G
  const chords = [
    [60, 64, 67],
    [57, 60, 64],
    [53, 57, 60],
    [55, 59, 62],
  ];

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const u = t / seconds;

    // Macro silhouette with real valleys (so normalize doesn't flatten)
    let macro = 0.35;
    if (u < 0.1) macro = 0.18 + (u / 0.1) * 0.22;
    else if (u < 0.35) macro = 0.5 + 0.2 * Math.sin(((u - 0.1) / 0.25) * Math.PI);
    else if (u < 0.5) macro = 0.85;
    else if (u < 0.65) macro = 0.25 + 0.1 * Math.sin(((u - 0.5) / 0.15) * Math.PI * 3);
    else if (u < 0.85) macro = 0.7 + 0.25 * Math.sin(((u - 0.65) / 0.2) * Math.PI);
    else macro = 0.4 * (1 - (u - 0.85) / 0.15);

    // Stronger beat accents (~100 BPM)
    const beat = (t * (100 / 60)) % 1;
    const kick = beat < 0.12 ? Math.exp(-beat * 20) : 0;
    const pulse = 0.45 + 0.55 * kick + 0.2 * Math.exp(-(((beat - 0.5 + 1) % 1) * 18));

    const chordIndex = Math.min(3, Math.floor(u * 4));
    const chord = chords[chordIndex];
    let tone = 0;
    for (let n = 0; n < chord.length; n++) {
      const freq = 440 * Math.pow(2, (chord[n] - 69) / 12);
      const amp = n === 0 ? 0.5 : n === 1 ? 0.3 : 0.22;
      tone += amp * Math.sin(2 * Math.PI * freq * t);
      if (n === 0) {
        tone += 0.15 * Math.sin(2 * Math.PI * freq * 2 * t);
        tone += 0.25 * kick * Math.sin(2 * Math.PI * (freq / 2) * t);
      }
    }

    const noise = (Math.random() * 2 - 1) * (0.03 + kick * 0.08);
    const fade = Math.min(1, t * 10) * Math.min(1, (seconds - t) * 8);
    data[i] = Math.tanh((tone + noise) * macro * pulse * fade * 0.9);
  }

  return buffer;
}
