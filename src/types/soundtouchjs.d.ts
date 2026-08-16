declare module "soundtouchjs" {
  export class SoundTouch {
    tempo: number;
    rate: number;
    pitch: number;
    pitchSemitones: number;
  }
  export class SimpleFilter {
    constructor(source: unknown, soundTouch: SoundTouch);
    extract(target: Float32Array, numFrames: number): number;
    readonly sourcePosition: number;
  }
  export class WebAudioBufferSource {
    constructor(buffer: AudioBuffer);
  }
}
