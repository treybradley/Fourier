import { useRef, useState, useCallback } from "react";

function getSupportedMimeType(hasVideo: boolean): string {
  const types = hasVideo
    ? ["video/mp4", "video/webm;codecs=vp9,opus", "video/webm"]
    : ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
  for (const t of types) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t;
    } catch {
      /* ignore */
    }
  }
  return hasVideo ? "video/webm" : "audio/webm";
}

export function useLooperRecorder(
  getMasterNode: () => GainNode | null,
  getAudioContext: () => AudioContext | null,
  getMicSourceNode: () => MediaStreamAudioSourceNode | null,
  getCanvasStream: () => MediaStream | null,
) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureBlob, setCaptureBlob] = useState<Blob | null>(null);
  const [format, setFormat] = useState<"mp4" | "webm">("webm");

  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const masterSnapshotRef = useRef<GainNode | null>(null);
  const micSnapshotRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const canvasStreamRef = useRef<MediaStream | null>(null);

  const startCapture = useCallback(() => {
    const ctx = getAudioContext();
    const master = getMasterNode();
    if (!ctx || !master) return;

    const canvasStream = getCanvasStream();
    const videoTrack = canvasStream?.getVideoTracks()[0] ?? null;
    if (!videoTrack) return;

    const dest = ctx.createMediaStreamDestination();
    master.connect(dest);
    destRef.current = dest;
    masterSnapshotRef.current = master;

    // Live mic into capture only (speakers stay silent via existing gain 0 path)
    const mic = getMicSourceNode();
    if (mic) {
      try {
        mic.connect(dest);
        micSnapshotRef.current = mic;
      } catch {
        micSnapshotRef.current = null;
      }
    }

    canvasStreamRef.current = canvasStream;

    const allTracks = [
      ...dest.stream.getAudioTracks(),
      videoTrack,
    ];
    const captureStream = new MediaStream(allTracks);

    const mimeType = getSupportedMimeType(true);
    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    setFormat(ext as "mp4" | "webm");

    const mr = new MediaRecorder(captureStream, { mimeType });
    chunksRef.current = [];

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setCaptureBlob(blob);
      try {
        masterSnapshotRef.current?.disconnect(destRef.current!);
      } catch {
        /* ignore */
      }
      try {
        micSnapshotRef.current?.disconnect(destRef.current!);
      } catch {
        /* ignore */
      }
      destRef.current = null;
      masterSnapshotRef.current = null;
      micSnapshotRef.current = null;
      canvasStreamRef.current = null;
    };

    mr.start(200);
    mrRef.current = mr;
    setIsCapturing(true);
    setCaptureBlob(null);
  }, [getMasterNode, getAudioContext, getMicSourceNode, getCanvasStream]);

  const stopCapture = useCallback(() => {
    mrRef.current?.stop();
    mrRef.current = null;
    setIsCapturing(false);
  }, []);

  const download = useCallback(() => {
    if (!captureBlob) return;
    const url = URL.createObjectURL(captureBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loop-session.${format}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, [captureBlob, format]);

  return { isCapturing, captureBlob, format, startCapture, stopCapture, download };
}
