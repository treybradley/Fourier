export function makePitchCacheKey(
  trackId: number,
  rootToken: string,
  semitones: number,
): string {
  return `${trackId}:${rootToken}:${semitones}`;
}

export class PitchShiftCache {
  private map = new Map<string, AudioBuffer>();

  get(key: string) {
    return this.map.get(key);
  }

  set(key: string, buffer: AudioBuffer) {
    this.map.set(key, buffer);
  }

  clearTrack(trackId: number) {
    const prefix = `${trackId}:`;
    for (const key of [...this.map.keys()]) {
      if (key.startsWith(prefix)) this.map.delete(key);
    }
  }

  clearAll() {
    this.map.clear();
  }
}
