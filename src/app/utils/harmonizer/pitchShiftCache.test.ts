import { describe, expect, it } from "vitest";
import { PitchShiftCache, makePitchCacheKey } from "./pitchShiftCache";

describe("pitchShiftCache", () => {
  it("round-trips by key", () => {
    const cache = new PitchShiftCache();
    const key = makePitchCacheKey(0, "root-a", 7);
    const fake = { length: 1 } as AudioBuffer;
    cache.set(key, fake);
    expect(cache.get(key)).toBe(fake);
  });

  it("clearTrack removes only that track's entries", () => {
    const cache = new PitchShiftCache();
    cache.set(makePitchCacheKey(0, "a", 3), { length: 1 } as AudioBuffer);
    cache.set(makePitchCacheKey(1, "b", 3), { length: 2 } as AudioBuffer);
    cache.clearTrack(0);
    expect(cache.get(makePitchCacheKey(0, "a", 3))).toBeUndefined();
    expect(cache.get(makePitchCacheKey(1, "b", 3))).toBeDefined();
  });
});
