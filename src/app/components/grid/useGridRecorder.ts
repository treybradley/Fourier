import { useRef, useState } from "react";

export function useGridRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  async function startRecording(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.start();
      setIsRecording(true);
      return true;
    } catch {
      return false;
    }
  }

  async function stopRecording(audioContext: AudioContext): Promise<AudioBuffer | null> {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === "inactive") return null;

    return new Promise((resolve) => {
      mr.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        try {
          const ab = await blob.arrayBuffer();
          const decoded = await audioContext.decodeAudioData(ab);
          resolve(decoded);
        } catch {
          resolve(null);
        }
        setIsRecording(false);
      };
      mr.stop();
    });
  }

  return { isRecording, startRecording, stopRecording };
}
