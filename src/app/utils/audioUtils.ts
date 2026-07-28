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
