import { useEffect, useRef, useState, useCallback } from "react";

export interface FaceGestureState {
  eyebrowsRaised: boolean;   // both brows raised — record/stop trigger
  isReady: boolean;
  started: boolean;
  error: string | null;
}

export interface UseFaceTrackingReturn extends FaceGestureState {
  videoRef: React.RefObject<HTMLVideoElement>;
  overlayCanvasRef: React.RefObject<HTMLCanvasElement>;
  start: () => void;
  stop: () => void;
}

// MediaPipe FaceLandmarker blendshape indices we care about
// brow_inner_up, brow_outer_up_left, brow_outer_up_right
const BROW_INNER_UP = "browInnerUp";
const BROW_OUTER_UP_LEFT = "browOuterUpLeft";
const BROW_OUTER_UP_RIGHT = "browOuterUpRight";

// Thresholds — tuned for deliberate raise vs ambient expression
const INNER_THRESHOLD = 0.45;
const OUTER_THRESHOLD = 0.35;

// Debounce: eyebrows must be raised for this many ms before triggering
const HOLD_MS = 120;
// Cooldown after trigger fires to prevent rapid-fire
const COOLDOWN_MS = 600;

export function useFaceTracking(onEyebrowTrigger?: () => void): UseFaceTrackingReturn {
  const videoRef = useRef<HTMLVideoElement>(null!);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null!);
  const rafRef = useRef<number>();
  const faceLandmarkerRef = useRef<unknown>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [started, setStarted] = useState(false);
  const [state, setState] = useState<Omit<FaceGestureState, "started">>({
    eyebrowsRaised: false,
    isReady: false,
    error: null,
  });

  // Debounce tracking refs (no re-renders)
  const raisedSinceRef = useRef<number | null>(null);
  const lastTriggerRef = useRef<number>(0);
  const wasRaisedRef = useRef(false);
  const onTriggerRef = useRef(onEyebrowTrigger);
  onTriggerRef.current = onEyebrowTrigger;

  const start = useCallback(() => setStarted(true), []);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    (faceLandmarkerRef.current as { close?: () => void } | null)?.close?.();
    faceLandmarkerRef.current = null;
    setStarted(false);
    setState({ eyebrowsRaised: false, isReady: false, error: null });
    const canvas = overlayCanvasRef.current;
    if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const drawOverlay = useCallback((
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    eyebrowsRaised: boolean,
    landmarks: { x: number; y: number }[][] | null,
  ) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = video.videoWidth || canvas.offsetWidth;
    canvas.height = video.videoHeight || canvas.offsetHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const w = canvas.width;
    const h = canvas.height;

    if (!landmarks || landmarks.length === 0) return;

    const face = landmarks[0];
    // Single line from left brow outer edge to right brow outer edge
    // Left outer: 70, Right outer: 300
    const leftOuter = face[70];
    const rightOuter = face[300];
    if (!leftOuter || !rightOuter) return;

    // Average Y across all four brow endpoints for a flat horizontal line
    const leftInner = face[107];
    const rightInner = face[336];
    const avgY = ((leftOuter.y + rightOuter.y + (leftInner?.y ?? leftOuter.y) + (rightInner?.y ?? rightOuter.y)) / 4) * h;

    const browColor = eyebrowsRaised ? "rgba(251,191,36,0.9)" : "rgba(255,255,255,0.3)";
    ctx.strokeStyle = browColor;
    ctx.lineWidth = eyebrowsRaised ? 2.5 : 1.5;
    ctx.lineCap = "round";
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo((1 - leftOuter.x) * w, avgY);
    ctx.lineTo((1 - rightOuter.x) * w, avgY);
    ctx.stroke();
  }, []);

  useEffect(() => {
    if (!started) return;
    let cancelled = false;

    async function init() {
      try {
        const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
        if (cancelled) return;

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
        );
        if (cancelled) return;

        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: true,
        });
        if (cancelled) { faceLandmarker.close(); return; }
        faceLandmarkerRef.current = faceLandmarker;

        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await new Promise<void>((res) => { video.onloadedmetadata = () => res(); });
        await video.play();
        if (cancelled) return;

        setState((p) => ({ ...p, isReady: true }));

        let lastTs = -1;
        const detect = () => {
          if (cancelled) return;
          const lm = faceLandmarkerRef.current as typeof faceLandmarker | null;
          if (!lm || !video || video.readyState < 2) {
            rafRef.current = requestAnimationFrame(detect);
            return;
          }
          const now = performance.now();
          if (now === lastTs) { rafRef.current = requestAnimationFrame(detect); return; }
          lastTs = now;

          const result = lm.detectForVideo(video, now);
          const blendshapes = result.faceBlendshapes?.[0]?.categories ?? [];

          const get = (name: string) =>
            blendshapes.find((b: { categoryName: string; score: number }) => b.categoryName === name)?.score ?? 0;

          const innerUp = get(BROW_INNER_UP);
          const outerLeft = get(BROW_OUTER_UP_LEFT);
          const outerRight = get(BROW_OUTER_UP_RIGHT);

          const raised = innerUp > INNER_THRESHOLD &&
            outerLeft > OUTER_THRESHOLD &&
            outerRight > OUTER_THRESHOLD;

          // Debounce: must hold for HOLD_MS before triggering
          if (raised && !wasRaisedRef.current) {
            raisedSinceRef.current = now;
          } else if (!raised) {
            raisedSinceRef.current = null;
          }
          wasRaisedRef.current = raised;

          const heldLongEnough =
            raisedSinceRef.current !== null && now - raisedSinceRef.current >= HOLD_MS;
          const cooledDown = now - lastTriggerRef.current >= COOLDOWN_MS;

          if (heldLongEnough && cooledDown) {
            lastTriggerRef.current = now;
            raisedSinceRef.current = null; // reset so it doesn't fire again until re-raise
            onTriggerRef.current?.();
          }

          setState((p) => ({ ...p, eyebrowsRaised: raised }));

          const canvas = overlayCanvasRef.current;
          if (canvas) drawOverlay(canvas, video, raised, result.faceLandmarks ?? null);

          rafRef.current = requestAnimationFrame(detect);
        };
        rafRef.current = requestAnimationFrame(detect);
      } catch (err) {
        if (!cancelled) {
          setState((p) => ({
            ...p,
            error: err instanceof Error ? err.message : "Face tracking unavailable",
          }));
        }
      }
    }

    init();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      (faceLandmarkerRef.current as { close?: () => void } | null)?.close?.();
    };
  }, [started, drawOverlay]);

  return { ...state, started, videoRef, overlayCanvasRef, start, stop };
}
