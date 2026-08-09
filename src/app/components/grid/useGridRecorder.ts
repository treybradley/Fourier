import { useRef, useState } from "react";

/**
 * Record microphone into an AudioBuffer for loading onto a pad.
 * Captures PCM via ScriptProcessor so decode isn't dependent on webm support.
 */
export function useGridRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const muteRef = useRef<GainNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef(44100);

  async function startRecording(audioContext: AudioContext): Promise<boolean> {
    if (recordingRef.current) return true;
    try {
      if (audioContext.state === "suspended") await audioContext.resume();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;
      chunksRef.current = [];
      sampleRateRef.current = audioContext.sampleRate;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      const mute = audioContext.createGain();
      mute.gain.value = 0;

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        chunksRef.current.push(new Float32Array(input));
      };

      source.connect(processor);
      processor.connect(mute);
      mute.connect(audioContext.destination);

      sourceRef.current = source;
      processorRef.current = processor;
      muteRef.current = mute;
      recordingRef.current = true;
      setIsRecording(true);
      return true;
    } catch {
      cleanupGraph();
      return false;
    }
  }

  function cleanupGraph() {
    try {
      processorRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    try {
      sourceRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    try {
      muteRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    sourceRef.current = null;
    processorRef.current = null;
    muteRef.current = null;
  }

  function stopRecording(audioContext: AudioContext): AudioBuffer | null {
    if (!recordingRef.current && chunksRef.current.length === 0) {
      cleanupGraph();
      recordingRef.current = false;
      setIsRecording(false);
      return null;
    }

    cleanupGraph();
    recordingRef.current = false;
    setIsRecording(false);

    const chunks = chunksRef.current;
    chunksRef.current = [];
    if (chunks.length === 0) return null;

    let total = 0;
    for (const c of chunks) total += c.length;
    const merged = new Float32Array(total);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }

    const buffer = audioContext.createBuffer(
      1,
      merged.length,
      sampleRateRef.current,
    );
    buffer.copyToChannel(merged, 0);
    return buffer;
  }

  return { isRecording, startRecording, stopRecording };
}
