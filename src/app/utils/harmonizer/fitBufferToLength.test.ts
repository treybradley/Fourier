import { describe, expect, it } from "vitest";
import { fitBufferToLength } from "./fitBufferToLength";

function makeFakeCtx() {
  return {
    sampleRate: 48000,
    createBuffer(channels: number, length: number, sampleRate: number) {
      const data = [new Float32Array(length)];
      return {
        numberOfChannels: channels,
        length,
        sampleRate,
        duration: length / sampleRate,
        getChannelData: (c: number) => data[c] ?? data[0],
        copyFromChannel() {},
        copyToChannel() {},
      } as unknown as AudioBuffer;
    },
  };
}

function fillBuffer(buf: AudioBuffer, fill: (i: number) => number) {
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = fill(i);
}

describe("fitBufferToLength", () => {
  it("trims when source is longer than target", () => {
    const ctx = makeFakeCtx();
    const src = ctx.createBuffer(1, 100, 48000);
    fillBuffer(src, (i) => i);
    const out = fitBufferToLength(ctx, src, 40);
    expect(out.length).toBe(40);
    expect(out.getChannelData(0)[39]).toBe(39);
  });

  it("loops when source is shorter than target", () => {
    const ctx = makeFakeCtx();
    const src = ctx.createBuffer(1, 10, 48000);
    fillBuffer(src, (i) => i + 1);
    const out = fitBufferToLength(ctx, src, 25);
    expect(out.length).toBe(25);
    const d = out.getChannelData(0);
    expect(d[0]).toBe(1);
    expect(d[10]).toBe(1);
    expect(d[24]).toBe(5);
  });

  it("returns equivalent length when equal", () => {
    const ctx = makeFakeCtx();
    const src = ctx.createBuffer(1, 16, 48000);
    fillBuffer(src, () => 0.5);
    const out = fitBufferToLength(ctx, src, 16);
    expect(out.length).toBe(16);
  });
});
