import { useEffect, useRef, useState, useCallback } from "react";

const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_TIP = 8;
const MIDDLE_TIP = 12;
const RING_TIP = 16;
const PINKY_TIP = 20;
const MIDDLE_MCP = 9;

/**
 * Control bands, in *visible frame* space (0-1 of what the composited frame
 * shows, already mirrored like the selfie view). Stacked near the bottom with
 * a tight gap; each maps left→right for the continuous control.
 */
export const PITCH_BAND = { xMin: 0.06, xMax: 0.94, yMin: 0.72, yMax: 0.825 };
export const VOLUME_BAND = { xMin: 0.06, xMax: 0.94, yMin: 0.84, yMax: 0.945 };

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface ProcessedHand {
  landmarks: HandLandmark[];
  pinchDistance: number;
  isPinching: boolean;
  fingersExtended: number;
  isOpen: boolean;
  thumbTip: HandLandmark;
  indexTip: HandLandmark;
  wrist: HandLandmark;
  /** Pinch midpoint in visible-frame space, mirrored to match the on-screen view. */
  pinchFrameX: number;
  pinchFrameY: number;
  isPinchInPitchZone: boolean;
  pitchZoneNormalizedX: number; // 0=left(low pitch), 1=right(high pitch)
  isPinchInVolumeZone: boolean;
  volumeZoneNormalizedX: number; // 0=left(quiet), 1=right(loud)
}

export interface HandTrackingState {
  leftHand: ProcessedHand | null;
  rightHand: ProcessedHand | null;
  isReady: boolean;
  error: string | null;
}

export interface UseHandTrackingReturn extends HandTrackingState {
  videoRef: React.RefObject<HTMLVideoElement>;
  start: () => void;
  stop: () => void;
  started: boolean;
}

function dist(a: HandLandmark, b: HandLandmark, width: number, height: number): number {
  const dx = (a.x - b.x) * width;
  const dy = (a.y - b.y) * height;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Map a landmark into the frame the user actually sees: object-cover crop of the
 * camera into `frameAspect`, then mirrored horizontally. Values outside 0-1 are
 * off-frame. Pass no aspect for the camera's own framing.
 */
export function toFrameSpace(
  lm: { x: number; y: number },
  videoWidth: number,
  videoHeight: number,
  frameAspect?: number,
): { x: number; y: number } {
  const videoAspect = videoWidth / videoHeight;
  const target = frameAspect ?? videoAspect;
  const visibleW = target < videoAspect ? target / videoAspect : 1;
  const visibleH = target < videoAspect ? 1 : videoAspect / target;
  const cropX = (1 - visibleW) / 2;
  const cropY = (1 - visibleH) / 2;
  return {
    x: 1 - (lm.x - cropX) / visibleW,
    y: (lm.y - cropY) / visibleH,
  };
}

function inBand(band: typeof PITCH_BAND, x: number, y: number): boolean {
  return x >= band.xMin && x <= band.xMax && y >= band.yMin && y <= band.yMax;
}

function bandProgress(band: typeof PITCH_BAND, x: number): number {
  return Math.max(0, Math.min(1, (x - band.xMin) / (band.xMax - band.xMin)));
}

function processHand(
  landmarks: HandLandmark[],
  videoWidth: number,
  videoHeight: number,
  frameAspect?: number,
): ProcessedHand {
  const thumbTip = landmarks[THUMB_TIP];
  const indexTip = landmarks[INDEX_TIP];
  const middleTip = landmarks[MIDDLE_TIP];
  const ringTip = landmarks[RING_TIP];
  const pinkyTip = landmarks[PINKY_TIP];
  const indexMcp = landmarks[INDEX_MCP];
  const middleMcp = landmarks[MIDDLE_MCP];

  const pinchDistance = dist(thumbTip, indexTip, videoWidth, videoHeight);
  const isPinching = pinchDistance < 40;

  const extended = [indexTip, middleTip, ringTip, pinkyTip].filter(
    (tip, i) => tip.y < (i === 0 ? indexMcp : middleMcp).y
  );
  const fingersExtended = extended.length;
  const isOpen = fingersExtended >= 3;

  // Band detection uses the midpoint of thumb + index tips
  const pinch = toFrameSpace(
    { x: (thumbTip.x + indexTip.x) / 2, y: (thumbTip.y + indexTip.y) / 2 },
    videoWidth,
    videoHeight,
    frameAspect,
  );

  return {
    landmarks, pinchDistance, isPinching, fingersExtended, isOpen,
    thumbTip, indexTip, wrist: landmarks[WRIST],
    pinchFrameX: pinch.x,
    pinchFrameY: pinch.y,
    isPinchInPitchZone: inBand(PITCH_BAND, pinch.x, pinch.y),
    pitchZoneNormalizedX: bandProgress(PITCH_BAND, pinch.x),
    isPinchInVolumeZone: inBand(VOLUME_BAND, pinch.x, pinch.y),
    volumeZoneNormalizedX: bandProgress(VOLUME_BAND, pinch.x),
  };
}

function classifyHands(
  detections: { landmarks: HandLandmark[]; handedness: string }[],
  videoWidth: number,
  videoHeight: number,
  frameAspect?: number,
): { left: ProcessedHand | null; right: ProcessedHand | null } {
  let left: ProcessedHand | null = null;
  let right: ProcessedHand | null = null;
  for (const det of detections) {
    const processed = processHand(det.landmarks, videoWidth, videoHeight, frameAspect);
    // Use MediaPipe's handedness (person's Left/Right), not image geometry —
    // the old index-vs-wrist heuristic swapped hands on selfie cameras.
    const label = det.handedness.toLowerCase();
    if (label.startsWith("right")) right = processed;
    else if (label.startsWith("left")) left = processed;
  }
  return { left, right };
}

export function useHandTracking(
  externalVideoRef?: React.RefObject<HTMLVideoElement>,
  /** Aspect (w/h) of the frame the user sees, so bands land where they're drawn. */
  { frameAspect }: { frameAspect?: number } = {},
): UseHandTrackingReturn {
  const ownVideoRef = useRef<HTMLVideoElement>(null!);
  const videoRef = externalVideoRef ?? ownVideoRef;
  const rafRef = useRef<number>();
  const handLandmarkerRef = useRef<unknown>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameAspectRef = useRef(frameAspect);
  frameAspectRef.current = frameAspect;
  const [started, setStarted] = useState(false);

  const [state, setState] = useState<HandTrackingState>({
    leftHand: null, rightHand: null, isReady: false, error: null,
  });

  const start = useCallback(() => setStarted(true), []);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    (handLandmarkerRef.current as { close?: () => void } | null)?.close?.();
    handLandmarkerRef.current = null;
    setStarted(false);
    setState({ leftHand: null, rightHand: null, isReady: false, error: null });
  }, []);

  useEffect(() => {
    if (!started) return;
    let cancelled = false;

    async function init() {
      try {
        const { HandLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
        if (cancelled) return;

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
        );
        if (cancelled) return;

        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
        });
        if (cancelled) { handLandmarker.close(); return; }
        handLandmarkerRef.current = handLandmarker;

        const video = videoRef.current;
        if (!video) { setState((p) => ({ ...p, error: "No video source" })); return; }

        // If no external stream, acquire the camera ourselves
        if (!externalVideoRef) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
          streamRef.current = stream;
          video.srcObject = stream;
          await new Promise<void>((resolve) => { video.onloadedmetadata = () => resolve(); });
          await video.play();
        } else if (video.readyState < 2) {
          await new Promise<void>((resolve) => {
            const onReady = () => { video.removeEventListener("canplay", onReady); resolve(); };
            video.addEventListener("canplay", onReady);
          });
        }
        if (cancelled) return;

        setState((prev) => ({ ...prev, isReady: true }));

        let lastTimestamp = -1;
        const detect = () => {
          if (cancelled) return;
          const lm = handLandmarkerRef.current as typeof handLandmarker | null;
          if (!lm || !video || video.readyState < 2) {
            rafRef.current = requestAnimationFrame(detect);
            return;
          }
          const now = performance.now();
          if (now === lastTimestamp) { rafRef.current = requestAnimationFrame(detect); return; }
          lastTimestamp = now;

          const results = lm.detectForVideo(video, now);
          const detections = (results.landmarks || []).map((lms, i) => ({
            landmarks: lms as HandLandmark[],
            handedness: results.handedness?.[i]?.[0]?.categoryName ?? "Unknown",
          }));

          const vw = video.videoWidth || 640;
          const vh = video.videoHeight || 480;
          const { left, right } = classifyHands(
            detections, vw, vh, frameAspectRef.current,
          );

          setState({ leftHand: left, rightHand: right, isReady: true, error: null });

          rafRef.current = requestAnimationFrame(detect);
        };
        rafRef.current = requestAnimationFrame(detect);
      } catch (err) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            error: err instanceof Error ? err.message : "Hand tracking failed",
          }));
        }
      }
    }

    init();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      (handLandmarkerRef.current as { close?: () => void } | null)?.close?.();
    };
  }, [started, externalVideoRef, videoRef]);

  return { ...state, videoRef, start, stop, started };
}
