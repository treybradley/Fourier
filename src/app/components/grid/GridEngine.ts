import type { Pad } from "./types";

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_SEC = 0.1;
const STEPS_PER_BAR = 16;

export class GridEngine {
  private _ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeSources = new Map<number, AudioBufferSourceNode[]>();
  private padGains = new Map<number, GainNode>();
  private padShapers = new Map<number, WaveShaperNode>();
  private schedulerTimer: ReturnType<typeof setTimeout> | null = null;
  private nextNoteTime = 0;
  private schedulerStep = 0;

  get ctx(): AudioContext {
    if (!this._ctx || this._ctx.state === "closed") {
      this._ctx = new AudioContext();
      this.masterGain = this._ctx.createGain();
      this.masterGain.connect(this._ctx.destination);
      this.padGains.clear();
      this.padShapers.clear();
    }
    return this._ctx;
  }

  getMasterNode(): GainNode | null {
    // Ensure graph exists
    void this.ctx;
    return this.masterGain;
  }

  private getPadNodes(
    padId: number,
    initGain: number,
    initDrive: number,
  ): { gain: GainNode; shaper: WaveShaperNode } {
    if (!this.padGains.has(padId)) {
      const ctx = this.ctx;
      const gain = ctx.createGain();
      gain.gain.value = initGain;
      const shaper = ctx.createWaveShaper();
      shaper.curve = this.makeDistortionCurve(initDrive);
      shaper.oversample = initDrive > 0 ? "4x" : "none";
      shaper.connect(gain);
      gain.connect(this.masterGain!);
      this.padGains.set(padId, gain);
      this.padShapers.set(padId, shaper);
    }
    return {
      gain: this.padGains.get(padId)!,
      shaper: this.padShapers.get(padId)!,
    };
  }

  setPadGain(padId: number, value: number): void {
    const node = this.padGains.get(padId);
    if (node) node.gain.setTargetAtTime(value, this.ctx.currentTime, 0.01);
  }

  setPadSpeed(padId: number, value: number): void {
    const sources = this.activeSources.get(padId);
    if (sources && this._ctx) {
      sources.forEach((s) =>
        s.playbackRate.setTargetAtTime(value, this._ctx!.currentTime, 0.01),
      );
    }
  }

  setPadDrive(padId: number, drive: number): void {
    const node = this.padShapers.get(padId);
    if (node) {
      node.curve = this.makeDistortionCurve(drive);
      node.oversample = drive > 0 ? "4x" : "none";
    }
  }

  /** Stop all active sources for a single pad (e.g. when loop is turned off). */
  stopPad(padId: number): void {
    const sources = this.activeSources.get(padId);
    if (!sources) return;
    sources.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* ignore */
      }
    });
    this.activeSources.set(padId, []);
  }

  async ensureRunning(): Promise<void> {
    const ctx = this.ctx;
    if (ctx.state === "suspended") await ctx.resume();
  }

  private makeDistortionCurve(drive: number): Float32Array {
    const amount = drive * 400;
    const n = 256;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  private scheduleAudioPad(pad: Pad, when: number, ignoreLoop = false): void {
    if (!pad.buffer) return;
    const ctx = this.ctx;
    const { gain, shaper } = this.getPadNodes(pad.id, pad.gain, pad.drive ?? 0);
    gain.gain.value = pad.gain;
    shaper.curve = this.makeDistortionCurve(pad.drive ?? 0);
    shaper.oversample = (pad.drive ?? 0) > 0 ? "4x" : "none";

    const buffer =
      pad.reverse && pad.reverseBuffer ? pad.reverseBuffer : pad.buffer;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = pad.speed;
    const offset = pad.trimStart * buffer.duration;
    const dur = (pad.trimEnd - pad.trimStart) * buffer.duration;

    if (pad.loop && !ignoreLoop) {
      source.loop = true;
      source.loopStart = pad.trimStart * buffer.duration;
      source.loopEnd = pad.trimEnd * buffer.duration;
      source.start(when, offset);
    } else {
      source.start(when, offset, dur > 0.001 ? dur : undefined);
    }

    source.connect(shaper);
    const arr = this.activeSources.get(pad.id) ?? [];
    arr.push(source);
    this.activeSources.set(pad.id, arr);
    source.onended = () => {
      const a = this.activeSources.get(pad.id);
      if (a) {
        const i = a.indexOf(source);
        if (i >= 0) a.splice(i, 1);
      }
    };
  }

  playPad(pad: Pad): void {
    if (!pad.buffer) return;
    void this.ensureRunning();
    if (pad.loop) {
      const active = this.activeSources.get(pad.id);
      if (active && active.length > 0) {
        active.forEach((s) => {
          try {
            s.stop();
          } catch {
            /* ignore */
          }
        });
        this.activeSources.set(pad.id, []);
        return;
      }
    }
    this.scheduleAudioPad(pad, this.ctx.currentTime);
  }

  computeReverseBuffer(buffer: AudioBuffer): AudioBuffer {
    const ctx = this.ctx;
    const nCh = buffer.numberOfChannels;
    const len = buffer.length;
    const rev = ctx.createBuffer(nCh, len, buffer.sampleRate);
    for (let ch = 0; ch < nCh; ch++) {
      const src = buffer.getChannelData(ch);
      const dst = rev.getChannelData(ch);
      for (let i = 0; i < len; i++) dst[i] = src[len - 1 - i];
    }
    return rev;
  }

  startScheduler(
    getPads: () => Pad[],
    getPattern: () => boolean[][],
    getBpm: () => number,
    onStep: (step: number) => void,
  ): void {
    this.stopScheduler();
    void this.ensureRunning();
    this.schedulerStep = 0;
    this.nextNoteTime = this.ctx.currentTime;

    const tick = () => {
      const pads = getPads();
      const pattern = getPattern();
      const secondsPerStep = 60 / getBpm() / 4;

      while (this.nextNoteTime < this.ctx.currentTime + SCHEDULE_AHEAD_SEC) {
        const step = this.schedulerStep;
        const noteTime = this.nextNoteTime;

        for (let padId = 0; padId < 9; padId++) {
          if (!pattern[padId]?.[step]) continue;
          const pad = pads[padId];
          this.scheduleAudioPad(pad, noteTime, true);
        }

        const uiDelay = Math.max(0, (noteTime - this.ctx.currentTime) * 1000);
        setTimeout(() => onStep(step), uiDelay);

        this.nextNoteTime += secondsPerStep;
        this.schedulerStep = (this.schedulerStep + 1) % STEPS_PER_BAR;
      }

      this.schedulerTimer = setTimeout(tick, LOOKAHEAD_MS);
    };

    tick();
  }

  stopScheduler(): void {
    if (this.schedulerTimer !== null) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  /**
   * Offline bounce of the pattern for `bars` cycles of 16 steps.
   * Includes trim / speed / gain / drive (one-shot hits; loop ignored).
   */
  async renderToBuffer(
    pads: Pad[],
    pattern: boolean[][],
    bpm: number,
    bars = 1,
  ): Promise<AudioBuffer> {
    const secondsPerStep = 60 / bpm / 4;
    const totalSteps = STEPS_PER_BAR * Math.max(1, bars);
    const totalDuration = secondsPerStep * totalSteps + 2;
    const sr = 44100;
    const offline = new OfflineAudioContext(
      2,
      Math.ceil(totalDuration * sr),
      sr,
    );

    for (let step = 0; step < totalSteps; step++) {
      const stepInBar = step % STEPS_PER_BAR;
      const stepTime = step * secondsPerStep;
      for (let padId = 0; padId < 9; padId++) {
        if (!pattern[padId]?.[stepInBar]) continue;
        const pad = pads[padId];
        if (!pad.buffer) continue;
        const buffer =
          pad.reverse && pad.reverseBuffer ? pad.reverseBuffer : pad.buffer;
        const source = offline.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = pad.speed;

        const shaper = offline.createWaveShaper();
        shaper.curve = this.makeDistortionCurve(pad.drive ?? 0);
        shaper.oversample = (pad.drive ?? 0) > 0 ? "4x" : "none";

        const gain = offline.createGain();
        gain.gain.value = pad.gain;

        source.connect(shaper);
        shaper.connect(gain);
        gain.connect(offline.destination);

        const offset = pad.trimStart * buffer.duration;
        const dur = (pad.trimEnd - pad.trimStart) * buffer.duration;
        source.start(stepTime, offset, dur > 0.001 ? dur : undefined);
      }
    }

    return offline.startRendering();
  }

  stopAll(): void {
    this.activeSources.forEach((sources) => {
      sources.forEach((s) => {
        try {
          s.stop();
        } catch {
          /* ignore */
        }
      });
    });
    this.activeSources.clear();
  }

  dispose(): void {
    this.stopScheduler();
    this.stopAll();
    this.padGains.clear();
    this.padShapers.clear();
    this._ctx?.close();
    this._ctx = null;
    this.masterGain = null;
  }
}
