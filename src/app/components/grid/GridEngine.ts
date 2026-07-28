import type { Pad } from "./types";

declare global {
  interface Window {
    YT: {
      Player: new (
        el: string | HTMLElement,
        config: {
          videoId?: string;
          width?: number | string;
          height?: number | string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (event: { target: YTPlayerInstance }) => void;
            onError?: (event: unknown) => void;
          };
        }
      ) => YTPlayerInstance;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayerInstance {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  loadVideoById(videoId: string, startSeconds?: number): void;
  destroy(): void;
}

interface YTEntry {
  player: YTPlayerInstance;
  ready: boolean;
}

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_SEC = 0.1;

// Module-level singleton so API is only loaded once
let ytApiPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (ytApiPromise) return ytApiPromise;
  if (typeof window !== "undefined" && window.YT?.Player) {
    return (ytApiPromise = Promise.resolve());
  }
  ytApiPromise = new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }
  });
  return ytApiPromise;
}

export class GridEngine {
  private _ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeSources = new Map<number, AudioBufferSourceNode[]>();
  private padGains = new Map<number, GainNode>();
  private padShapers = new Map<number, WaveShaperNode>();
  private ytEntries = new Map<number, YTEntry>();
  private schedulerTimer: ReturnType<typeof setTimeout> | null = null;
  private nextNoteTime = 0;
  private schedulerStep = 0;

  get ctx(): AudioContext {
    if (!this._ctx || this._ctx.state === "closed") {
      this._ctx = new AudioContext();
      this.masterGain = this._ctx.createGain();
      this.masterGain.connect(this._ctx.destination);
      // Persistent per-pad nodes belong to the old context — clear them
      this.padGains.clear();
      this.padShapers.clear();
    }
    return this._ctx;
  }

  // Returns (and lazily creates) the persistent shaper→gain chain for a pad
  private getPadNodes(padId: number, initGain: number, initDrive: number): { gain: GainNode; shaper: WaveShaperNode } {
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
    return { gain: this.padGains.get(padId)!, shaper: this.padShapers.get(padId)! };
  }

  // Call these from React when sliders change — updates nodes live
  setPadGain(padId: number, value: number): void {
    const node = this.padGains.get(padId);
    if (node) node.gain.setTargetAtTime(value, this.ctx.currentTime, 0.01);
  }

  setPadSpeed(padId: number, value: number): void {
    const sources = this.activeSources.get(padId);
    if (sources && this._ctx) {
      sources.forEach((s) => s.playbackRate.setTargetAtTime(value, this._ctx!.currentTime, 0.01));
    }
  }

  setPadDrive(padId: number, drive: number): void {
    const node = this.padShapers.get(padId);
    if (node) {
      node.curve = this.makeDistortionCurve(drive);
      node.oversample = drive > 0 ? "4x" : "none";
    }
  }

  private async ensureRunning(): Promise<void> {
    const ctx = this.ctx;
    if (ctx.state === "suspended") await ctx.resume();
  }

  // ── Audio pad playback ──────────────────────────────────────────────────────

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
    // Sync current param values (handles first-time init)
    gain.gain.value = pad.gain;
    shaper.curve = this.makeDistortionCurve(pad.drive ?? 0);
    shaper.oversample = (pad.drive ?? 0) > 0 ? "4x" : "none";

    const buffer = pad.reverse && pad.reverseBuffer ? pad.reverseBuffer : pad.buffer;
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
    if (pad.source.type === "youtube") {
      this.playYouTubePad(pad);
      return;
    }
    if (!pad.buffer) return;
    this.ensureRunning();
    // Loop pads toggle: if already playing, stop them
    if (pad.loop) {
      const active = this.activeSources.get(pad.id);
      if (active && active.length > 0) {
        active.forEach((s) => { try { s.stop(); } catch {} });
        this.activeSources.set(pad.id, []);
        return;
      }
    }
    this.scheduleAudioPad(pad, this.ctx.currentTime);
  }

  // ── YouTube pad management ──────────────────────────────────────────────────

  async loadYouTubePad(padId: number, videoId: string): Promise<void> {
    await loadYouTubeAPI();
    // Destroy existing player for this pad if any
    this.destroyYouTubePad(padId);
    const containerId = `yt-grid-pad-${padId}`;
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement("div");
      container.id = containerId;
      container.style.cssText =
        "position:fixed;width:2px;height:2px;top:-10px;left:-10px;overflow:hidden;pointer-events:none;opacity:0;";
      document.body.appendChild(container);
    }
    return new Promise<void>((resolve) => {
      const entry: YTEntry = { player: null as unknown as YTPlayerInstance, ready: false };
      this.ytEntries.set(padId, entry);
      const player = new window.YT.Player(container!, {
        videoId,
        width: 2,
        height: 2,
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, modestbranding: 1 },
        events: {
          onReady: () => {
            entry.ready = true;
            resolve();
          },
        },
      });
      entry.player = player;
    });
  }

  destroyYouTubePad(padId: number): void {
    const entry = this.ytEntries.get(padId);
    if (entry) {
      try { entry.player.destroy(); } catch {}
      this.ytEntries.delete(padId);
    }
    document.getElementById(`yt-grid-pad-${padId}`)?.remove();
  }

  private playYouTubePad(pad: Pad): void {
    if (pad.source.type !== "youtube") return;
    const entry = this.ytEntries.get(pad.id);
    if (!entry?.ready) return;
    try {
      entry.player.seekTo(pad.source.cueTime, true);
      entry.player.playVideo();
    } catch {}
  }

  // ── Reverse buffer computation ──────────────────────────────────────────────

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

  // ── Lookahead sequencer ─────────────────────────────────────────────────────

  startScheduler(
    getPads: () => Pad[],
    getPattern: () => boolean[][],
    getBpm: () => number,
    onStep: (step: number) => void
  ): void {
    this.stopScheduler();
    this.ensureRunning();
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
          if (pad.source.type === "youtube") {
            const delay = Math.max(0, (noteTime - this.ctx.currentTime) * 1000);
            setTimeout(() => this.playYouTubePad(pad), delay);
          } else {
            this.scheduleAudioPad(pad, noteTime, true);
          }
        }

        const uiDelay = Math.max(0, (noteTime - this.ctx.currentTime) * 1000);
        setTimeout(() => onStep(step), uiDelay);

        this.nextNoteTime += secondsPerStep;
        this.schedulerStep = (this.schedulerStep + 1) % 16;
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

  // ── WAV render ──────────────────────────────────────────────────────────────

  async renderToBuffer(pads: Pad[], pattern: boolean[][], bpm: number): Promise<AudioBuffer> {
    const secondsPerStep = 60 / bpm / 4;
    const totalDuration = secondsPerStep * 16 + 2; // extra 2s for tails
    const sr = 44100;
    const offline = new OfflineAudioContext(2, Math.ceil(totalDuration * sr), sr);

    for (let step = 0; step < 16; step++) {
      const stepTime = step * secondsPerStep;
      for (let padId = 0; padId < 9; padId++) {
        if (!pattern[padId]?.[step]) continue;
        const pad = pads[padId];
        if (pad.source.type !== "audio" || !pad.buffer) continue;
        const buffer = pad.reverse && pad.reverseBuffer ? pad.reverseBuffer : pad.buffer;
        const source = offline.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = pad.speed;
        const gain = offline.createGain();
        gain.gain.value = pad.gain;
        source.connect(gain);
        gain.connect(offline.destination);
        const offset = pad.trimStart * buffer.duration;
        const dur = (pad.trimEnd - pad.trimStart) * buffer.duration;
        source.start(stepTime, offset, dur > 0.001 ? dur : undefined);
      }
    }

    return offline.startRendering();
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  stopAll(): void {
    this.activeSources.forEach((sources) => {
      sources.forEach((s) => { try { s.stop(); } catch {} });
    });
    this.activeSources.clear();
    this.ytEntries.forEach((entry) => { try { entry.player.pauseVideo(); } catch {} });
  }

  dispose(): void {
    this.stopScheduler();
    this.stopAll();
    this.ytEntries.forEach((entry, padId) => {
      try { entry.player.destroy(); } catch {}
      document.getElementById(`yt-grid-pad-${padId}`)?.remove();
    });
    this.ytEntries.clear();
    this.padGains.clear();
    this.padShapers.clear();
    this._ctx?.close();
    this._ctx = null;
    this.masterGain = null;
  }
}
