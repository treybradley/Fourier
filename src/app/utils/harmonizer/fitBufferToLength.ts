type BufferFactory = {
  sampleRate: number;
  createBuffer: (
    numberOfChannels: number,
    length: number,
    sampleRate: number,
  ) => AudioBuffer;
};

/** Trim if longer, loop if shorter, so output length === targetSamples. Uses ch0. */
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
