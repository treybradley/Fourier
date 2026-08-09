import { useCallback, useRef, useState } from "react";
import { audioBufferToWav } from "./types";

function pickMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];
  for (const t of types) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t;
    } catch {
      /* ignore */
    }
  }
  return "audio/webm";
}

/**
 * Capture the Grid master bus while the user plays (live and/or sequencer).
 * Downloads as WAV after stop.
 */
export function useGridSessionRecorder(
  getMasterNode: () => GainNode | null,
  getAudioContext: () => AudioContext | null,
) {
  const [isRecording, setIsRecording] = useState(false);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const mimeRef = useRef("audio/webm");

  const startRecording = useCallback(async () => {
    const ctx = getAudioContext();
    const master = getMasterNode();
    if (!ctx || !master) return false;

    if (ctx.state === "suspended") await ctx.resume();

    const dest = ctx.createMediaStreamDestination();
    master.connect(dest);
    destRef.current = dest;
    masterRef.current = master;

    const mimeType = pickMimeType();
    mimeRef.current = mimeType;
    chunksRef.current = [];

    const mr = new MediaRecorder(dest.stream, { mimeType });
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.start(200);
    mrRef.current = mr;
    setIsRecording(true);
    return true;
  }, [getAudioContext, getMasterNode]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    const mr = mrRef.current;
    if (!mr || mr.state === "inactive") {
      setIsRecording(false);
      return null;
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      mr.onstop = async () => {
        try {
          masterRef.current?.disconnect(destRef.current!);
        } catch {
          /* ignore */
        }
        destRef.current = null;
        masterRef.current = null;

        const raw = new Blob(chunksRef.current, { type: mimeRef.current });
        chunksRef.current = [];
        if (raw.size === 0) {
          resolve(null);
          return;
        }

        const ctx = getAudioContext();
        if (!ctx) {
          resolve(raw);
          return;
        }
        try {
          const ab = await raw.arrayBuffer();
          const decoded = await ctx.decodeAudioData(ab.slice(0));
          resolve(audioBufferToWav(decoded));
        } catch {
          // Fall back to raw container if decode fails
          resolve(raw);
        }
      };
      mr.stop();
    });

    mrRef.current = null;
    setIsRecording(false);
    return blob;
  }, [getAudioContext]);

  return { isRecording, startRecording, stopRecording };
}
