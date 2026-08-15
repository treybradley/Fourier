import { useCallback, useEffect, useRef, useState } from "react";
import { EXPORT_ASPECT } from "../utils/exportFormat";
import { toFrameSpace, type HandLandmark } from "./useHandTracking";

const THUMB_TIP = 4;
const INDEX_TIP = 8;
const PINCH_PX = 40;

/** Upper-right track-select zone in visible 9:16 frame space (mirrored selfie). */
export const TRACK_PINCH_ZONE = {
  xMin: 0.62,
  xMax: 0.94,
  yMin: 0.12,
  yMax: 0.36,
};

export interface LooperPinchHand {
  landmarks: HandLandmark[];
  pinchFrameX: number;
  pinchFrameY: number;
  isPinching: boolean;
  isPinchInZone: boolean;
}

function dist(
  a: HandLandmark,
  b: HandLandmark,
  width: number,
  height: number,
): number {
  const dx = (a.x - b.x) * width;
  const dy = (a.y - b.y) * height;
  return Math.sqrt(dx * dx + dy * dy);
}

function inZone(x: number, y: number): boolean {
  return (
    x >= TRACK_PINCH_ZONE.xMin &&
    x <= TRACK_PINCH_ZONE.xMax &&
    y >= TRACK_PINCH_ZONE.yMin &&
    y <= TRACK_PINCH_ZONE.yMax
  );
}

export function useLooperTrackPinch({
  videoRef,
  enabled,
  trackCount,
  onCycleTrack,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  trackCount: number;
  onCycleTrack: () => void;
}) {
  const [rightHand, setRightHand] = useState<LooperPinchHand | null>(null);
  const [isReady, setIsReady] = useState(false);
  const landmarkerRef = useRef<{
    detectForVideo: (video: HTMLVideoElement, ts: number) => {
      landmarks?: HandLandmark[][];
      handedness?: { categoryName?: string }[][];
    };
    close?: () => void;
  } | null>(null);
  const rafRef = useRef(0);
  const pinchHeldRef = useRef(false);
  const onCycleRef = useRef(onCycleTrack);
  onCycleRef.current = onCycleTrack;
  const trackCountRef = useRef(trackCount);
  trackCountRef.current = trackCount;

  const reset = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    landmarkerRef.current?.close?.();
    landmarkerRef.current = null;
    pinchHeldRef.current = false;
    setRightHand(null);
    setIsReady(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      reset();
      return;
    }

    let cancelled = false;

    async function init() {
      try {
        const { HandLandmarker, FilesetResolver } = await import(
          "@mediapipe/tasks-vision"
        );
        if (cancelled) return;

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
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
        if (cancelled) {
          handLandmarker.close();
          return;
        }
        landmarkerRef.current = handLandmarker;

        const video = videoRef.current;
        if (!video) return;
        if (video.readyState < 2) {
          await new Promise<void>((resolve) => {
            const onReady = () => {
              video.removeEventListener("canplay", onReady);
              resolve();
            };
            video.addEventListener("canplay", onReady);
          });
        }
        if (cancelled) return;

        setIsReady(true);

        let lastTimestamp = -1;
        const detect = () => {
          if (cancelled) return;
          const lm = landmarkerRef.current;
          if (!lm || !video || video.readyState < 2) {
            rafRef.current = requestAnimationFrame(detect);
            return;
          }
          const now = performance.now();
          if (now === lastTimestamp) {
            rafRef.current = requestAnimationFrame(detect);
            return;
          }
          lastTimestamp = now;

          const results = lm.detectForVideo(video, now);
          const vw = video.videoWidth || 640;
          const vh = video.videoHeight || 480;

          let next: LooperPinchHand | null = null;
          const landmarksList = results.landmarks || [];
          for (let i = 0; i < landmarksList.length; i++) {
            const label =
              results.handedness?.[i]?.[0]?.categoryName?.toLowerCase() ?? "";
            if (!label.startsWith("right")) continue;

            const landmarks = landmarksList[i] as HandLandmark[];
            const thumb = landmarks[THUMB_TIP];
            const index = landmarks[INDEX_TIP];
            const pinchDistance = dist(thumb, index, vw, vh);
            const isPinching = pinchDistance < PINCH_PX;
            const pinch = toFrameSpace(
              { x: (thumb.x + index.x) / 2, y: (thumb.y + index.y) / 2 },
              vw,
              vh,
              EXPORT_ASPECT,
            );
            const isPinchInZone = inZone(pinch.x, pinch.y);
            next = {
              landmarks,
              pinchFrameX: pinch.x,
              pinchFrameY: pinch.y,
              isPinching,
              isPinchInZone,
            };

            const armed = isPinching && isPinchInZone;
            if (armed && !pinchHeldRef.current && trackCountRef.current > 0) {
              pinchHeldRef.current = true;
              onCycleRef.current();
            } else if (!armed) {
              pinchHeldRef.current = false;
            }
            break;
          }

          if (!next) pinchHeldRef.current = false;
          setRightHand(next);
          rafRef.current = requestAnimationFrame(detect);
        };

        rafRef.current = requestAnimationFrame(detect);
      } catch {
        if (!cancelled) setIsReady(false);
      }
    }

    void init();
    return () => {
      cancelled = true;
      reset();
    };
  }, [enabled, reset, videoRef]);

  return { rightHand, isReady };
}
