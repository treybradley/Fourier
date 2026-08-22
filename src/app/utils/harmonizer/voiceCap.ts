export const MAX_VOICES_PER_TRACK = 6;
export const SEMITONE_MIN = -12;
export const SEMITONE_MAX = 12;

export function canEnableVoice(
  activeSemitones: number[],
  semitones: number,
): boolean {
  if (semitones === 0) return false;
  if (activeSemitones.includes(semitones)) return true;
  return activeSemitones.length < MAX_VOICES_PER_TRACK;
}

export function toggleVoiceSemitone(
  active: number[],
  semitones: number,
): number[] {
  if (semitones === 0) return active.slice();
  if (active.includes(semitones)) return active.filter((s) => s !== semitones);
  if (active.length >= MAX_VOICES_PER_TRACK) return active.slice();
  return [...active, semitones].sort((a, b) => a - b);
}
