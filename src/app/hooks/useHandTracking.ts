import { useEffect, useRef, useState, useCallback } from "react";

const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_TIP = 8;
const MIDDLE_TIP = 12;
const RING_TIP = 16;
const PINKY_TIP = 20;
const MIDDLE_MCP = 9;

// Zones in landmark normalized space. Display is mirrored: displayX = (1 - lm.x) * w
// Pitch zone: far right edge of mirrored display (low lm.x), display cols 82-98%
export const PITCH_ZONE = { xMin: 0.02, xMax: 0.18, yMin: 0.12, yMax: 0.78 };
// Volume zone: far left edge of mirrored display (high lm.x), display cols 2-18%
export const VOLUME_ZONE = { xMin: 0.82, xMax: 0.98, yMin: 0.12, yMax: 0.78 };

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
  isPinchInPitchZone: boolean;
  pitchZoneNormalizedY: number; // 0=top(high pitch), 1=bottom(low pitch)
  isPinchInVolumeZone: boolean;
  volumeZoneNormalizedY: number; // 0=top(loud), 1=bottom(quiet)
}

export interface HandTrackingState {
  leftHand: ProcessedHand | null;
  rightHand: ProcessedHand | null;
  isReady: boolean;
  error: string | null;
}

export interface UseHandTrackingReturn extends HandTrackingState {
  videoRef: React.RefObject<HTMLVideoElement>;
  overlayCanvasRef: React.RefObject<HTMLCanvasElement>;
  start: () => void;
  stop: () => void;
  started: boolean;
}

function dist(a: HandLandmark, b: HandLandmark, width: number, height: number): number {
  const dx = (a.x - b.x) * width;
  const dy = (a.y - b.y) * height;
  return Math.sqrt(dx * dx + dy * dy);
}

function processHand(landmarks: HandLandmark[], videoWidth: number, videoHeight: number): ProcessedHand {
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

  // Zone detection: midpoint of thumb + index tips
  const pinchMidX = (thumbTip.x + indexTip.x) / 2;
  const pinchMidY = (thumbTip.y + indexTip.y) / 2;

  const isPinchInPitchZone =
    pinchMidX >= PITCH_ZONE.xMin && pinchMidX <= PITCH_ZONE.xMax &&
    pinchMidY >= PITCH_ZONE.yMin && pinchMidY <= PITCH_ZONE.yMax;
  const pitchZoneNormalizedY = Math.max(0, Math.min(1,
    (pinchMidY - PITCH_ZONE.yMin) / (PITCH_ZONE.yMax - PITCH_ZONE.yMin)
  ));

  const isPinchInVolumeZone =
    pinchMidX >= VOLUME_ZONE.xMin && pinchMidX <= VOLUME_ZONE.xMax &&
    pinchMidY >= VOLUME_ZONE.yMin && pinchMidY <= VOLUME_ZONE.yMax;
  const volumeZoneNormalizedY = Math.max(0, Math.min(1,
    (pinchMidY - VOLUME_ZONE.yMin) / (VOLUME_ZONE.yMax - VOLUME_ZONE.yMin)
  ));

  return {
    landmarks, pinchDistance, isPinching, fingersExtended, isOpen,
    thumbTip, indexTip, wrist: landmarks[WRIST],
    isPinchInPitchZone, pitchZoneNormalizedY,
    isPinchInVolumeZone, volumeZoneNormalizedY,
  };
}

function classifyHands(
  detections: { landmarks: HandLandmark[]; handedness: string }[],
  videoWidth: number,
  videoHeight: number
): { left: ProcessedHand | null; right: ProcessedHand | null } {
  let left: ProcessedHand | null = null;
  let right: ProcessedHand | null = null;
  for (const det of detections) {
    const wrist = det.landmarks[WRIST];
    const indexMcp = det.landmarks[INDEX_MCP];
    const isRight = indexMcp.x > wrist.x;
    const processed = processHand(det.landmarks, videoWidth, videoHeight);
    if (isRight) right = processed;
    else left = processed;
  }
  return { left, right };
}

export function useHandTracking(
  externalVideoRef?: React.RefObject<HTMLVideoElement>,
  { showPitchZone = false } = {}
): UseHandTrackingReturn {
  const ownVideoRef = useRef<HTMLVideoElement>(null!);
  const videoRef = externalVideoRef ?? ownVideoRef;
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null!);
  const rafRef = useRef<number>();
  const handLandmarkerRef = useRef<unknown>(null);
  const streamRef = useRef<MediaStream | null>(null);
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
    const canvas = overlayCanvasRef.current;
    if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const drawOverlay = useCallback((
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    left: ProcessedHand | null,
    right: ProcessedHand | null
  ) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth || canvas.offsetWidth;
    canvas.height = video.videoHeight || canvas.offsetHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const w = canvas.width;
    const h = canvas.height;

    function toPixel(lm: HandLandmark) {
      return { x: (1 - lm.x) * w, y: lm.y * h };
    }

    // ── Gesture zones (stem collage only) ────────────────────
    if (showPitchZone) {
      function drawZone(
        zone: typeof PITCH_ZONE,
        active: boolean,
        normalizedY: number | null,
        label: string,
        colorActive: string,
        colorInactive: string,
      ) {
        // displayX = (1 - lm.x) * w, so left edge of zone in display = (1 - xMax) * w
        const zX = (1 - zone.xMax) * w;
        const zW = (zone.xMax - zone.xMin) * w;
        const zY = zone.yMin * h;
        const zH = (zone.yMax - zone.yMin) * h;

        ctx.save();
        ctx.fillStyle = active ? colorActive.replace("COLOR", "0.07") : "rgba(255,255,255,0.025)";
        ctx.fillRect(zX, zY, zW, zH);
        ctx.strokeStyle = active ? colorActive.replace("COLOR", "0.65") : colorInactive;
        ctx.lineWidth = active ? 1.5 : 1;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(zX, zY, zW, zH);
        ctx.setLineDash([]);
        ctx.fillStyle = active ? colorActive.replace("COLOR", "0.75") : "rgba(255,255,255,0.22)";
        ctx.font = "bold 9px monospace";
        ctx.fillText(label, zX + 6, zY + 13);
        ctx.font = "10px monospace";
        ctx.fillText("↕", zX + zW / 2 - 4, zY + 22);
        if (active && normalizedY !== null) {
          const tickY = zY + normalizedY * zH;
          ctx.strokeStyle = colorActive.replace("COLOR", "0.85");
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(zX + 4, tickY);
          ctx.lineTo(zX + zW - 4, tickY);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Pitch zone (right side, amber)
      const pitchActive = !!(right?.isPinching && right?.isPinchInPitchZone);
      drawZone(
        PITCH_ZONE, pitchActive,
        pitchActive && right ? right.pitchZoneNormalizedY : null,
        "PITCH",
        "rgba(251,191,36,COLOR)", "rgba(255,255,255,0.18)",
      );

      // Volume zone (left side, rose)
      const volActive = !!(left?.isPinching && left?.isPinchInVolumeZone);
      drawZone(
        VOLUME_ZONE, volActive,
        volActive && left ? left.volumeZoneNormalizedY : null,
        "VOL",
        "rgba(251,113,133,COLOR)", "rgba(255,255,255,0.18)",
      );
    }

    // ── Right hand: yellow dots + connecting line ─────────────
    if (right) {
      const thumb = toPixel(right.thumbTip);
      const index = toPixel(right.indexTip);
      ctx.fillStyle = right.isPinching ? "rgba(255,220,0,0.9)" : "rgba(255,220,0,0.6)";
      ctx.beginPath(); ctx.arc(thumb.x, thumb.y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(index.x, index.y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = right.isPinching ? "rgba(255,220,0,0.9)" : "rgba(255,220,0,0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(thumb.x, thumb.y); ctx.lineTo(index.x, index.y); ctx.stroke();
    }

    // ── Left hand: red dots + connecting line ─────────────────
    if (left) {
      const thumb = toPixel(left.thumbTip);
      const index = toPixel(left.indexTip);
      ctx.fillStyle = left.isPinching ? "rgba(255,60,60,0.9)" : "rgba(255,60,60,0.6)";
      ctx.beginPath(); ctx.arc(thumb.x, thumb.y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(index.x, index.y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255,60,60,0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(thumb.x, thumb.y); ctx.lineTo(index.x, index.y); ctx.stroke();
    }
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
          const { left, right } = classifyHands(detections, vw, vh);

          setState({ leftHand: left, rightHand: right, isReady: true, error: null });

          const canvas = overlayCanvasRef.current;
          if (canvas) drawOverlay(canvas, video, left, right);

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
  }, [started, drawOverlay, externalVideoRef, videoRef]);

  return { ...state, videoRef, overlayCanvasRef, start, stop, started };
}
