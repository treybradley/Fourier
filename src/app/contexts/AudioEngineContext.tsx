import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import getBpm from "bpm-detective";

export interface Marker {
  id: string;
  time: number; // in seconds
}

export interface StemState {
  file: File | null;
  fileName: string;
  audioBuffer: AudioBuffer | null;
  isPlaying: boolean;
  volume: number; // 0-2 (0-200%)
  pitch: number; // 0.5-2 (50-200%)
  isMuted: boolean;
  isSolo: boolean;
  duration: number; // in seconds
  currentTime: number; // current playback position in seconds
  markers: Marker[];
  analyserNode: AnalyserNode | null;
  detectedBpm: number | null;
}

export interface AudioEngineContextValue {
  stems: StemState[];
  isAnyPlaying: boolean;

  // File operations
  loadFile: (stemIndex: number, file: File) => Promise<void>;
  clearFile: (stemIndex: number) => void;

  // Playback controls
  play: (stemIndex: number) => void;
  pause: (stemIndex: number) => void;
  stop: (stemIndex: number) => void;
  playAll: () => void;
  pauseAll: () => void;
  stopAll: () => void;

  // Parameter controls
  setVolume: (stemIndex: number, volume: number) => void;
  setPitch: (stemIndex: number, pitch: number) => void;
  setMute: (stemIndex: number, muted: boolean) => void;
  setSolo: (stemIndex: number, solo: boolean) => void;
  seek: (stemIndex: number, time: number) => void;

  // Markers (max 4)
  addMarker: (stemIndex: number) => void;
  removeMarker: (stemIndex: number, markerIndex: number) => void;
  seekToMarker: (stemIndex: number, markerIndex: number) => void;

  // Capture taps — every stem is summed into the master bus
  getAudioContext: () => AudioContext;
  getMasterNode: () => GainNode | null;

  // State
  isLoading: boolean;
  error: string | null;
}

const AudioEngineContext = createContext<AudioEngineContextValue | null>(null);

export function useAudioEngine() {
  const context = useContext(AudioEngineContext);
  if (!context) {
    throw new Error("useAudioEngine must be used within AudioEngineProvider");
  }
  return context;
}

interface SourceNodeRef {
  source: AudioBufferSourceNode | null;
  gainNode: GainNode | null;
  startTime: number;
  startOffset: number;
}

export function AudioEngineProvider({ children }: { children: React.ReactNode }) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const sourceNodesRef = useRef<SourceNodeRef[]>([
    { source: null, gainNode: null, startTime: 0, startOffset: 0 },
    { source: null, gainNode: null, startTime: 0, startOffset: 0 },
    { source: null, gainNode: null, startTime: 0, startOffset: 0 },
    { source: null, gainNode: null, startTime: 0, startOffset: 0 },
  ]);
  const animationFrameRef = useRef<number>();
  const seekingRef = useRef<boolean[]>([false, false, false, false]);

  const [stems, setStems] = useState<StemState[]>([
    {
      file: null,
      fileName: "",
      audioBuffer: null,
      isPlaying: false,
      volume: 0.5,
      pitch: 1.0,
      isMuted: false,
      isSolo: false,
      duration: 0,
      currentTime: 0,
      markers: [],
      analyserNode: null,
      detectedBpm: null,
    },
    {
      file: null,
      fileName: "",
      audioBuffer: null,
      isPlaying: false,
      volume: 0.5,
      pitch: 1.0,
      isMuted: false,
      isSolo: false,
      duration: 0,
      currentTime: 0,
      markers: [],
      analyserNode: null,
      detectedBpm: null,
    },
    {
      file: null,
      fileName: "",
      audioBuffer: null,
      isPlaying: false,
      volume: 0.5,
      pitch: 1.0,
      isMuted: false,
      isSolo: false,
      duration: 0,
      currentTime: 0,
      markers: [],
      analyserNode: null,
      detectedBpm: null,
    },
    {
      file: null,
      fileName: "",
      audioBuffer: null,
      isPlaying: false,
      volume: 0.5,
      pitch: 1.0,
      isMuted: false,
      isSolo: false,
      duration: 0,
      currentTime: 0,
      markers: [],
      analyserNode: null,
      detectedBpm: null,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAnyPlaying = stems.some((stem) => stem.isPlaying);

  // Initialize AudioContext (and its master bus) lazily
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      const ctx = new AudioContext();
      const master = ctx.createGain();
      master.gain.value = 1;
      master.connect(ctx.destination);
      audioContextRef.current = ctx;
      masterGainRef.current = master;
    }
    return audioContextRef.current;
  };

  // Null until an AudioContext exists so callers can't spin one up during render
  const getMasterNode = () => masterGainRef.current;

  // Load audio file
  const loadFile = async (stemIndex: number, file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const audioContext = getAudioContext();

      // Resume context if suspended (autoplay policy)
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Create analyser node for this stem
      const analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 2048;

      // BPM detection (best-effort, non-blocking)
      let detectedBpm: number | null = null;
      try {
        detectedBpm = getBpm(audioBuffer);
      } catch (_) {}

      setStems((prev) => {
        const newStems = [...prev];
        newStems[stemIndex] = {
          ...newStems[stemIndex],
          file,
          fileName: file.name,
          audioBuffer,
          duration: audioBuffer.duration,
          currentTime: 0,
          markers: [],
          analyserNode,
          detectedBpm,
        };
        return newStems;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audio file");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Clear file from stem
  const clearFile = (stemIndex: number) => {
    // Stop playback if playing
    if (stems[stemIndex].isPlaying) {
      stop(stemIndex);
    }

    setStems((prev) => {
      const newStems = [...prev];
      newStems[stemIndex] = {
        file: null,
        fileName: "",
        audioBuffer: null,
        isPlaying: false,
        volume: 0.5,
        pitch: 1.0,
        isMuted: false,
        isSolo: false,
        duration: 0,
        currentTime: 0,
        markers: [],
        analyserNode: null,
        detectedBpm: null,
      };
      return newStems;
    });
  };

  // Create and configure source node
  const createSourceNode = (stemIndex: number, offset: number = 0) => {
    const audioContext = getAudioContext();
    const stem = stems[stemIndex];

    if (!stem.audioBuffer) return null;

    // Create nodes
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();

    source.buffer = stem.audioBuffer;
    source.playbackRate.value = stem.pitch;

    // Calculate effective volume (considering mute and solo)
    const anySolo = stems.some((s) => s.isSolo);
    let effectiveVolume = stem.volume;

    if (stem.isMuted || (anySolo && !stem.isSolo)) {
      effectiveVolume = 0;
    }

    gainNode.gain.value = effectiveVolume;

    // Connect: source -> gain -> analyser -> master -> destination
    const master = masterGainRef.current ?? audioContext.destination;
    source.connect(gainNode);

    if (stem.analyserNode) {
      gainNode.connect(stem.analyserNode);
      stem.analyserNode.connect(master);
    } else {
      gainNode.connect(master);
    }

    // Handle playback end
    source.onended = () => {
      if (stems[stemIndex].isPlaying) {
        setStems((prev) => {
          const newStems = [...prev];
          newStems[stemIndex] = { ...newStems[stemIndex], isPlaying: false };
          return newStems;
        });
      }
    };

    // Start playback
    source.start(0, offset);

    return { source, gainNode, startTime: audioContext.currentTime, startOffset: offset };
  };

  // Play stem
  const play = (stemIndex: number) => {
    const stem = stems[stemIndex];
    if (!stem.audioBuffer || stem.isPlaying) return;

    const sourceNodeRef = createSourceNode(stemIndex, sourceNodesRef.current[stemIndex].startOffset);

    if (sourceNodeRef) {
      sourceNodesRef.current[stemIndex] = sourceNodeRef;

      setStems((prev) => {
        const newStems = [...prev];
        newStems[stemIndex] = { ...newStems[stemIndex], isPlaying: true };
        return newStems;
      });
    }
  };

  // Pause stem
  const pause = (stemIndex: number) => {
    const audioContext = getAudioContext();
    const sourceNode = sourceNodesRef.current[stemIndex];

    if (sourceNode.source && stems[stemIndex].isPlaying) {
      // Calculate current position
      const elapsed = audioContext.currentTime - sourceNode.startTime;
      const currentPosition = sourceNode.startOffset + elapsed;

      // Stop the source
      sourceNode.source.stop();
      sourceNode.source.disconnect();
      if (sourceNode.gainNode) {
        sourceNode.gainNode.disconnect();
      }

      // Update offset for resume
      sourceNodesRef.current[stemIndex] = {
        source: null,
        gainNode: null,
        startTime: 0,
        startOffset: currentPosition,
      };

      setStems((prev) => {
        const newStems = [...prev];
        newStems[stemIndex] = { ...newStems[stemIndex], isPlaying: false };
        return newStems;
      });
    }
  };

  // Stop stem (reset to beginning)
  const stop = (stemIndex: number) => {
    const sourceNode = sourceNodesRef.current[stemIndex];

    if (sourceNode.source) {
      sourceNode.source.stop();
      sourceNode.source.disconnect();
      if (sourceNode.gainNode) {
        sourceNode.gainNode.disconnect();
      }
    }

    sourceNodesRef.current[stemIndex] = {
      source: null,
      gainNode: null,
      startTime: 0,
      startOffset: 0,
    };

    setStems((prev) => {
      const newStems = [...prev];
      newStems[stemIndex] = { ...newStems[stemIndex], isPlaying: false };
      return newStems;
    });
  };

  // Play all stems
  const playAll = () => {
    stems.forEach((stem, index) => {
      if (stem.audioBuffer && !stem.isPlaying) {
        play(index);
      }
    });
  };

  // Pause all stems
  const pauseAll = () => {
    stems.forEach((_, index) => {
      if (stems[index].isPlaying) {
        pause(index);
      }
    });
  };

  // Stop all stems
  const stopAll = () => {
    stems.forEach((_, index) => {
      stop(index);
    });
  };

  // Set volume
  const setVolume = (stemIndex: number, volume: number) => {
    const clampedVolume = Math.max(0, Math.min(2, volume));

    setStems((prev) => {
      const newStems = [...prev];
      newStems[stemIndex] = { ...newStems[stemIndex], volume: clampedVolume };
      return newStems;
    });

    // Update gain node if playing
    const sourceNode = sourceNodesRef.current[stemIndex];
    if (sourceNode.gainNode) {
      const anySolo = stems.some((s) => s.isSolo);
      let effectiveVolume = clampedVolume;

      if (stems[stemIndex].isMuted || (anySolo && !stems[stemIndex].isSolo)) {
        effectiveVolume = 0;
      }

      sourceNode.gainNode.gain.value = effectiveVolume;
    }
  };

  // Set pitch
  const setPitch = (stemIndex: number, pitch: number) => {
    const clampedPitch = Math.max(0.5, Math.min(2, pitch));

    setStems((prev) => {
      const newStems = [...prev];
      newStems[stemIndex] = { ...newStems[stemIndex], pitch: clampedPitch };
      return newStems;
    });

    // Update playback rate in real-time if playing
    const sourceNode = sourceNodesRef.current[stemIndex];
    if (sourceNode.source) {
      sourceNode.source.playbackRate.value = clampedPitch;
    }
  };

  // Set mute
  const setMute = (stemIndex: number, muted: boolean) => {
    setStems((prev) => {
      const newStems = [...prev];
      newStems[stemIndex] = { ...newStems[stemIndex], isMuted: muted };
      return newStems;
    });

    // Update gain node if playing
    const sourceNode = sourceNodesRef.current[stemIndex];
    if (sourceNode.gainNode) {
      sourceNode.gainNode.gain.value = muted ? 0 : stems[stemIndex].volume;
    }
  };

  // Set solo
  const setSolo = (stemIndex: number, solo: boolean) => {
    setStems((prev) => {
      const newStems = [...prev];
      newStems[stemIndex] = { ...newStems[stemIndex], isSolo: solo };
      return newStems;
    });

    // Update all gain nodes
    sourceNodesRef.current.forEach((sourceNode, index) => {
      if (sourceNode.gainNode) {
        const anySolo = stems.some((s, i) => i === stemIndex ? solo : s.isSolo);
        let effectiveVolume = stems[index].volume;

        if (stems[index].isMuted || (anySolo && index !== stemIndex && !stems[index].isSolo)) {
          effectiveVolume = 0;
        }

        sourceNode.gainNode.gain.value = effectiveVolume;
      }
    });
  };

  // Seek to position
  const seek = (stemIndex: number, time: number) => {
    // Prevent concurrent seeks on same stem
    if (seekingRef.current[stemIndex]) return;
    seekingRef.current[stemIndex] = true;

    // Get fresh state and perform seek
    setStems((prev) => {
      const stem = prev[stemIndex];
      if (!stem.audioBuffer) {
        seekingRef.current[stemIndex] = false;
        return prev;
      }

      const clampedTime = Math.max(0, Math.min(time, stem.duration));
      const wasPlaying = stem.isPlaying;

      // Stop current source if it exists
      const sourceNode = sourceNodesRef.current[stemIndex];
      if (sourceNode.source) {
        try {
          sourceNode.source.stop();
          sourceNode.source.disconnect();
          if (sourceNode.gainNode) {
            sourceNode.gainNode.disconnect();
          }
        } catch (e) {
          // Source might already be stopped
        }
      }

      // Reset source node ref with new offset
      sourceNodesRef.current[stemIndex] = {
        source: null,
        gainNode: null,
        startTime: 0,
        startOffset: clampedTime,
      };

      // If was playing, restart immediately using fresh stem data
      if (wasPlaying && stem.audioBuffer) {
        const audioContext = getAudioContext();
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();

        source.buffer = stem.audioBuffer;
        source.playbackRate.value = stem.pitch;

        // Calculate effective volume using fresh state
        const anySolo = prev.some((s) => s.isSolo);
        let effectiveVolume = stem.volume;
        if (stem.isMuted || (anySolo && !stem.isSolo)) {
          effectiveVolume = 0;
        }
        gainNode.gain.value = effectiveVolume;

        // Connect audio graph
        const master = masterGainRef.current ?? audioContext.destination;
        source.connect(gainNode);
        if (stem.analyserNode) {
          gainNode.connect(stem.analyserNode);
          stem.analyserNode.connect(master);
        } else {
          gainNode.connect(master);
        }

        // Handle playback end
        source.onended = () => {
          if (!seekingRef.current[stemIndex]) {
            setStems((current) => {
              const updated = [...current];
              updated[stemIndex] = { ...updated[stemIndex], isPlaying: false };
              return updated;
            });
          }
        };

        // Start playback
        source.start(0, clampedTime);

        // Store source node ref
        sourceNodesRef.current[stemIndex] = {
          source,
          gainNode,
          startTime: audioContext.currentTime,
          startOffset: clampedTime,
        };
      }

      // Clear seeking flag after operation
      setTimeout(() => {
        seekingRef.current[stemIndex] = false;
      }, 50);

      // Return updated state
      const newStems = [...prev];
      newStems[stemIndex] = {
        ...stem,
        currentTime: clampedTime,
        isPlaying: wasPlaying,
      };
      return newStems;
    });
  };

  // Add marker at current position (max 4)
  const addMarker = (stemIndex: number) => {
    setStems((prev) => {
      if (prev[stemIndex].markers.length >= 4) {
        return prev; // Max 4 markers
      }

      const currentTime = prev[stemIndex].currentTime;
      const newMarker: Marker = {
        id: `marker-${Date.now()}-${Math.random()}`,
        time: currentTime,
      };

      const newStems = [...prev];
      newStems[stemIndex] = {
        ...newStems[stemIndex],
        markers: [...newStems[stemIndex].markers, newMarker],
      };
      return newStems;
    });
  };

  // Remove marker by index
  const removeMarker = (stemIndex: number, markerIndex: number) => {
    setStems((prev) => {
      const newStems = [...prev];
      const markers = [...newStems[stemIndex].markers];
      markers.splice(markerIndex, 1);
      newStems[stemIndex] = {
        ...newStems[stemIndex],
        markers,
      };
      return newStems;
    });
  };

  // Seek to marker by index
  const seekToMarker = (stemIndex: number, markerIndex: number) => {
    const marker = stems[stemIndex].markers[markerIndex];
    if (marker) {
      seek(stemIndex, marker.time);
    }
  };

  // Update current time for each playing stem
  useEffect(() => {
    if (!isAnyPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const updateTime = () => {
      const audioContext = getAudioContext();

      setStems((prev) => {
        const newStems = [...prev];

        prev.forEach((stem, index) => {
          if (stem.isPlaying) {
            const sourceNode = sourceNodesRef.current[index];
            if (sourceNode.source) {
              const elapsed = audioContext.currentTime - sourceNode.startTime;
              // Account for pitch: higher pitch = faster playback
              const position = sourceNode.startOffset + (elapsed * stem.pitch);
              newStems[index] = { ...newStems[index], currentTime: position };
            }
          }
        });

        return newStems;
      });

      animationFrameRef.current = requestAnimationFrame(updateTime);
    };

    animationFrameRef.current = requestAnimationFrame(updateTime);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isAnyPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAll();
      masterGainRef.current = null;
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const value: AudioEngineContextValue = {
    stems,
    isAnyPlaying,
    loadFile,
    clearFile,
    play,
    pause,
    stop,
    playAll,
    pauseAll,
    stopAll,
    setVolume,
    setPitch,
    setMute,
    setSolo,
    seek,
    addMarker,
    removeMarker,
    seekToMarker,
    getAudioContext,
    getMasterNode,
    isLoading,
    error,
  };

  return (
    <AudioEngineContext.Provider value={value}>
      {children}
    </AudioEngineContext.Provider>
  );
}
