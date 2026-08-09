/**
 * Audio utility functions for the stem player
 */

/**
 * Format time in seconds to MM:SS format
 */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Decode an audio file to an AudioBuffer
 */
export async function decodeAudioFile(
  file: File,
  audioContext: AudioContext
): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  return audioBuffer;
}

/**
 * Validate if a file is a supported audio format
 */
export function isValidAudioFile(file: File): boolean {
  const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave'];
  const validExtensions = ['.mp3', '.wav'];

  const hasValidType = validTypes.includes(file.type);
  const hasValidExtension = validExtensions.some(ext =>
    file.name.toLowerCase().endsWith(ext)
  );

  return hasValidType || hasValidExtension;
}

/**
 * Check if file size is within limits (50MB)
 */
export function isFileSizeValid(file: File): boolean {
  const maxSize = 50 * 1024 * 1024; // 50MB in bytes
  return file.size <= maxSize;
}

/**
 * Smooth a value using exponential moving average
 */
export function smoothValue(current: number, target: number, alpha: number = 0.3): number {
  return current * (1 - alpha) + target * alpha;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Encode an AudioBuffer as a 16-bit PCM WAV blob
 */
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

/**
 * Map a value from one range to another
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}
