import { useEffect, useState, useRef } from "react";

/**
 * Extract waveform data from AudioBuffer
 * Returns normalized amplitude values for visualization
 */
export function extractWaveformData(
  audioBuffer: AudioBuffer,
  samples: number = 1000
): number[] {
  const rawData = audioBuffer.getChannelData(0); // Use first channel (mono or left)
  const blockSize = Math.floor(rawData.length / samples);
  const waveformData: number[] = [];

  for (let i = 0; i < samples; i++) {
    const blockStart = blockSize * i;
    let sum = 0;

    // Calculate RMS (root mean square) for this block
    for (let j = 0; j < blockSize; j++) {
      const sample = rawData[blockStart + j];
      sum += sample * sample;
    }

    const rms = Math.sqrt(sum / blockSize);
    waveformData.push(rms);
  }

  // Normalize to 0-1 range
  const max = Math.max(...waveformData);
  return waveformData.map((val) => val / max);
}

interface UseWaveformParams {
  audioBuffer: AudioBuffer | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

export function useWaveform({
  audioBuffer,
  isPlaying,
  currentTime,
  duration,
}: UseWaveformParams) {
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const animationFrameRef = useRef<number>();

  // Extract waveform when audio buffer loads
  useEffect(() => {
    if (audioBuffer) {
      const data = extractWaveformData(audioBuffer, 1000);
      setWaveformData(data);
    } else {
      setWaveformData([]);
    }
  }, [audioBuffer]);

  // Calculate scroll position (0-1, where 0.5 is center)
  const progress = duration > 0 ? currentTime / duration : 0;

  return {
    waveformData,
    progress,
  };
}
