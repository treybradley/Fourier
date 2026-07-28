import type { Grain } from "./featureExtraction";

export class GranularEngine {
  private _ctx: AudioContext | null = null;
  private _masterGain: GainNode | null = null;
  private _buffer: AudioBuffer | null = null;

  private get ctx(): AudioContext {
    if (!this._ctx || this._ctx.state === "closed") {
      this._ctx = new AudioContext();
    }
    return this._ctx;
  }

  private get masterGain(): GainNode {
    if (!this._masterGain) {
      this._masterGain = this.ctx.createGain();
      this._masterGain.gain.value = 0.8;
      this._masterGain.connect(this.ctx.destination);
    }
    return this._masterGain;
  }

  setBuffer(buffer: AudioBuffer): void {
    this._buffer = buffer;
  }

  playOnce(grain: Grain): void {
    if (!this._buffer) return;
    if (this.ctx.state === "suspended") this.ctx.resume();

    const now = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this._buffer;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(1, now + 0.008);
    env.gain.linearRampToValueAtTime(0, now + Math.max(grain.duration - 0.02, 0.008));

    source.connect(env);
    env.connect(this.masterGain);

    const offsetSec = grain.offset / this._buffer.sampleRate;
    source.start(now, offsetSec, grain.duration);
    source.stop(now + grain.duration + 0.05);
  }

  dispose(): void {
    this._masterGain?.disconnect();
    this._masterGain = null;
    this._ctx?.close();
    this._ctx = null;
  }
}
