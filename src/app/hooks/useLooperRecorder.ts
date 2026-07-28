import { useRef, useState, useCallback } from "react";

function getSupportedMimeType(hasVideo: boolean): string {
  const types = hasVideo
    ? ["video/mp4", "video/webm;codecs=vp9,opus", "video/webm"]
    : ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
  for (const t of types) {
    try { if (MediaRecorder.isTypeSupported(t)) return t; } catch {}
  }
  return hasVideo ? "video/webm" : "audio/webm";
}

export function useLooperRecorder(
  getMasterNode: () => GainNode | null,
  getAudioContext: () => AudioContext | null,
  getVideoTrack: () => MediaStreamTrack | null,
) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureBlob, setCaptureBlob] = useState<Blob | null>(null);
  const [format, setFormat] = useState<"mp4" | "webm">("webm");

  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const destRef = useRef<MediaStreamDestinationNode | null>(null);
  const masterSnapshotRef = useRef<GainNode | null>(null);

  const startCapture = useCallback(() => {
    const ctx = getAudioContext();
    const master = getMasterNode();
    if (!ctx || !master) return;

    const dest = ctx.createMediaStreamDestination();
    master.connect(dest);
    destRef.current = dest;
    masterSnapshotRef.current = master;

    const videoTrack = getVideoTrack();
    const allTracks = [
      ...dest.stream.getAudioTracks(),
      ...(videoTrack ? [videoTrack] : []),
    ];
    const captureStream = new MediaStream(allTracks);

    const mimeType = getSupportedMimeType(!!videoTrack);
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
      try { masterSnapshotRef.current?.disconnect(destRef.current!); } catch {}
      destRef.current = null;
    };

    mr.start(200); // collect chunks every 200ms
    mrRef.current = mr;
    setIsCapturing(true);
    setCaptureBlob(null);
  }, [getMasterNode, getAudioContext, getVideoTrack]);

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
