/** Decode audio from a video file (mp4/webm/mov). Rejects files with no usable audio. */
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
  const ch = buffer.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < ch.length; i += 64) {
    peak = Math.max(peak, Math.abs(ch[i]));
  }
  if (peak < 1e-5) throw new Error("No audio track found in video");
  return buffer;
}
