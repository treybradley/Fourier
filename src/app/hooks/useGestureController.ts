import { useEffect, useRef } from "react";
import type { ProcessedHand } from "./useHandTracking";
import type { AudioEngineContextValue } from "../contexts/AudioEngineContext";
import { smoothValue, clamp } from "../utils/audioUtils";

interface GestureControllerOptions {
  leftHand: ProcessedHand | null;
  rightHand: ProcessedHand | null;
  selectedStem: number;
  setSelectedStem: (stem: number) => void;
  audioEngine: AudioEngineContextValue;
  /** When false, gestures are ignored (Hand control off). */
  enabled?: boolean;
}

export function useGestureController({
  leftHand,
  rightHand,
  selectedStem,
  setSelectedStem,
  audioEngine,
  enabled = true,
}: GestureControllerOptions) {
  const lastPinchTimeRef = useRef(0);
  const lastHandStateRef = useRef<"open" | "closed" | null>(null);
  const smoothedVolumeRef = useRef(0.5);
  const smoothedPitchRef = useRef(1.0);
  const lastSentVolumeRef = useRef(0.5);
  const lastSentPitchRef = useRef(1.0);

  const selectedStemRef = useRef(selectedStem);
  selectedStemRef.current = selectedStem;

  const setSelectedStemRef = useRef(setSelectedStem);
  setSelectedStemRef.current = setSelectedStem;

  const audioRef = useRef(audioEngine);
  audioRef.current = audioEngine;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabledRef.current) {
      lastHandStateRef.current = null;
      return;
    }

    const now = performance.now();
    const audio = audioRef.current;
    const stem = selectedStemRef.current;

    // ── RIGHT HAND ────────────────────────────────────────────────
    if (rightHand) {
      const { isPinching, isPinchInPitchZone, pitchZoneNormalizedY } = rightHand;

      if (isPinching) {
        if (isPinchInPitchZone) {
          // Pinch inside pitch zone: Y position controls pitch (top=2.0, bottom=0.5)
          const rawPitch = 2.0 - pitchZoneNormalizedY * 1.5;
          smoothedPitchRef.current = smoothValue(
            smoothedPitchRef.current,
            rawPitch,
            0.12,
          );
          const clampedPitch = clamp(smoothedPitchRef.current, 0.5, 2.0);
          if (Math.abs(clampedPitch - lastSentPitchRef.current) > 0.03) {
            audio.setPitch(stem, clampedPitch);
            lastSentPitchRef.current = clampedPitch;
          }
        } else if (now - lastPinchTimeRef.current > 800) {
          // Pinch outside pitch zone: cycle selected stem
          lastPinchTimeRef.current = now;
          const next = (selectedStemRef.current + 1) % 4;
          setSelectedStemRef.current(next);
        }
      }
    }

    // ── LEFT HAND ─────────────────────────────────────────────────
    if (leftHand) {
      const { isPinching, isPinchInVolumeZone, volumeZoneNormalizedY, isOpen } =
        leftHand;

      if (isPinching && isPinchInVolumeZone) {
        const rawVolume = 2.0 - volumeZoneNormalizedY * 2.0;
        smoothedVolumeRef.current = smoothValue(
          smoothedVolumeRef.current,
          rawVolume,
          0.12,
        );
        const clampedVolume = clamp(smoothedVolumeRef.current, 0, 2);
        if (Math.abs(clampedVolume - lastSentVolumeRef.current) > 0.03) {
          audio.setVolume(stem, clampedVolume);
          lastSentVolumeRef.current = clampedVolume;
        }
      }

      const handState: "open" | "closed" = isOpen ? "open" : "closed";
      if (handState !== lastHandStateRef.current) {
        lastHandStateRef.current = handState;
        if (handState === "open") {
          if (audio.stems[stem].isPlaying) audio.pause(stem);
        } else {
          if (
            !audio.stems[stem].isPlaying &&
            audio.stems[stem].audioBuffer
          ) {
            audio.play(stem);
          }
        }
      }
    } else {
      lastHandStateRef.current = null;
    }
  }, [leftHand, rightHand, enabled]);
}
