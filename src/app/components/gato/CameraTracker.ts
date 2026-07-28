type PositionCallback = (x: number, y: number) => void;

export class CameraTracker {
  private rafId: number | null = null;
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;

  async init(
    _videoEl: HTMLVideoElement,
    _onPosition: PositionCallback,
    _canvasW: number,
    _canvasH: number,
  ): Promise<void> {
    throw new Error(
      "Camera mode requires @tensorflow/tfjs and @tensorflow-models/hand-pose-detection. Run: pnpm add @tensorflow/tfjs @tensorflow-models/hand-pose-detection",
    );
  }

  stop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.video) { this.video.srcObject = null; this.video = null; }
  }
}
