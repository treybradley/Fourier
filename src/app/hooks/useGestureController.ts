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
}

export function useGestureController({
  leftHand,
  rightHand,
  selectedStem,
  setSelectedStem,
  audioEngine,
}: GestureControllerOptions) {
  const lastPinchTimeRef = useRef(0);
  const lastHandStateRef = useRef<"open" | "closed" | null>(null);
  const lastCueFingerCountRef = useRef(0);
  const lastCueTimeRef = useRef(0);
  const smoothedVolumeRef = useRef(0.5);
  const smoothedPitchRef = useRef(1.0);
  const lastSentVolumeRef = useRef(0.5);
  const lastSentPitchRef = useRef(1.0);
  // Keep latest values accessible in the effect without re-subscribing
  const selectedStemRef = useRef(selectedStem);
  selectedStemRef.current = selectedStem;

  const setSelectedStemRef = useRef(setSelectedStem);
  setSelectedStemRef.current = setSelectedStem;

  const audioRef = useRef(audioEngine);
  audioRef.current = audioEngine;

  useEffect(() => {
    const now = performance.now();
    const audio = audioRef.current;
    const stem = selectedStemRef.current;

    // ── RIGHT HAND ────────────────────────────────────────────────
    if (rightHand) {
      const { isPinching, fingersExtended, isPinchInPitchZone, pitchZoneNormalizedY } = rightHand;

      if (isPinching) {
        if (isPinchInPitchZone) {
          // Pinch inside pitch zone: Y position controls pitch (top=2.0, bottom=0.5)
          const rawPitch = 2.0 - pitchZoneNormalizedY * 1.5;
          smoothedPitchRef.current = smoothValue(smoothedPitchRef.current, rawPitch, 0.12);
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

      // Extended fingers (1–4, non-pinch) → jump to cue point (400ms debounce)
      if (!isPinching && fingersExtended >= 1 && fingersExtended <= 4) {
        if (
          fingersExtended !== lastCueFingerCountRef.current ||
          now - lastCueTimeRef.current > 1200
        ) {
          if (now - lastCueTimeRef.current > 400) {
            const markerIndex = fingersExtended - 1;
            const markers = audio.stems[stem].markers;
            if (markers[markerIndex]) {
              audio.seekToMarker(stem, markerIndex);
            }
            lastCueFingerCountRef.current = fingersExtended;
            lastCueTimeRef.current = now;
          }
        }
      } else if (!isPinching && fingersExtended === 0) {
        lastCueFingerCountRef.current = 0;
      }
    }

    // ── LEFT HAND ─────────────────────────────────────────────────
    if (leftHand) {
      const { isPinching, isPinchInVolumeZone, volumeZoneNormalizedY, isOpen } = leftHand;

      // Pinch inside volume zone: Y position controls volume (top=2.0, bottom=0.0)
      if (isPinching && isPinchInVolumeZone) {
        const rawVolume = 2.0 - volumeZoneNormalizedY * 2.0;
        smoothedVolumeRef.current = smoothValue(smoothedVolumeRef.current, rawVolume, 0.12);
        const clampedVolume = clamp(smoothedVolumeRef.current, 0, 2);
        if (Math.abs(clampedVolume - lastSentVolumeRef.current) > 0.03) {
          audio.setVolume(stem, clampedVolume);
          lastSentVolumeRef.current = clampedVolume;
        }
      }

      // Open/close → play/pause state transitions
      const handState: "open" | "closed" = isOpen ? "open" : "closed";
      if (handState !== lastHandStateRef.current) {
        lastHandStateRef.current = handState;
        if (handState === "open") {
          if (audio.stems[stem].isPlaying) audio.pause(stem);
        } else {
          if (!audio.stems[stem].isPlaying && audio.stems[stem].audioBuffer) {
            audio.play(stem);
          }
        }
      }
    } else {
      lastHandStateRef.current = null;
    }
  }, [leftHand, rightHand]);
}
