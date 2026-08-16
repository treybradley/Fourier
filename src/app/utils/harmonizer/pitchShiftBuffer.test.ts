import { describe, expect, it } from "vitest";
import { pitchShiftBuffer, type PitchShiftEngine } from "./pitchShiftBuffer";

function fakeBuffer(length: number): AudioBuffer {
  const data = new Float32Array(length);
  return {
    numberOfChannels: 1,
    length,
    sampleRate: 48000,
    duration: length / 48000,
    getChannelData: () => data,
  } as unknown as AudioBuffer;
}

describe("pitchShiftBuffer", () => {
  it("returns same length as input (time preserved)", async () => {
    const input = fakeBuffer(1000);
    const engine: PitchShiftEngine = {
      async shift(buf, semitones) {
        return fakeBuffer(buf.length + (semitones === 0 ? 0 : 3));
      },
    };
    const out = await pitchShiftBuffer(input, 4, { engine });
    expect(out.length).toBe(input.length);
  });

  it("returns input clone path for 0 semitones without engine work", async () => {
    const input = fakeBuffer(64);
    const out = await pitchShiftBuffer(input, 0, {
      engine: {
        async shift() {
          throw new Error("should not run");
        },
      },
    });
    expect(out.length).toBe(64);
  });
});
