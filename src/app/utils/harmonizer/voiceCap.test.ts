import { describe, expect, it } from "vitest";
import {
  MAX_VOICES_PER_TRACK,
  canEnableVoice,
  toggleVoiceSemitone,
} from "./voiceCap";

describe("voiceCap", () => {
  it("allows enabling when under cap", () => {
    expect(canEnableVoice([3, 7], 12)).toBe(true);
  });

  it("blocks enabling a new interval at cap", () => {
    const active = [3, 5, 7, 12];
    expect(active.length).toBe(MAX_VOICES_PER_TRACK);
    expect(canEnableVoice(active, -5)).toBe(false);
  });

  it("allows disabling an active interval at cap", () => {
    const next = toggleVoiceSemitone([3, 5, 7, 12], 5);
    expect(next).toEqual([3, 7, 12]);
  });

  it("ignores root (0) toggles", () => {
    expect(toggleVoiceSemitone([3], 0)).toEqual([3]);
  });

  it("does not add past cap", () => {
    expect(toggleVoiceSemitone([3, 5, 7, 12], -7)).toEqual([3, 5, 7, 12]);
  });
});
