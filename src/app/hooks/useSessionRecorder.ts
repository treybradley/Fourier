import { useCallback, useRef, useState } from "react";
import { audioBufferToWav } from "../utils/audioUtils";

export type SessionFormat = "mp4" | "webm" | "wav";

function pickMimeType(hasVideo: boolean): string {
  const types = hasVideo
    ? ["video/mp4", "video/webm;codecs=vp9,opus", "video/webm"]
    : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const t of types) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t;
    } catch {
      /* ignore */
    }
  }
  return hasVideo ? "video/webm" : "audio/webm";
}

interface SessionRecorderOptions {
  getAudioContext: () => AudioContext | null;
  getMasterNode: () => GainNode | null;
  /** Composited 9:16 canvas stream. Omit or return null to record audio only. */
  getVideoStream?: () => MediaStream | null;
  /** Extra sources (e.g. live mic) mixed into the capture but not the speakers. */
  getExtraAudioNodes?: () => (AudioNode | null)[];
  /** Download file name without extension. */
  fileBaseName: string;
}

/**
 * Records a session off an app's master bus. Video is optional: when a canvas
 * stream is available the capture is 9:16 video + audio, otherwise it's
 * audio-only and transcoded to WAV so it drops straight into a DAW.
 */
export function useSessionRecorder({
  getAudioContext,
  getMasterNode,
  getVideoStream,
  getExtraAudioNodes,
  fileBaseName,
}: SessionRecorderOptions) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [captureBlob, setCaptureBlob] = useState<Blob | null>(null);
  const [format, setFormat] = useState<SessionFormat>("wav");
  const [hasVideo, setHasVideo] = useState(false);

  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeRef = useRef("audio/webm");
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const tappedRef = useRef<AudioNode[]>([]);

  const releaseTaps = useCallback(() => {
    const dest = destRef.current;
    if (dest) {
      for (const node of tappedRef.current) {
        try {
          node.disconnect(dest);
        } catch {
          /* ignore */
        }
      }
    }
    tappedRef.current = [];
    destRef.current = null;
  }, []);

  const startCapture = useCallback(async () => {
    const ctx = getAudioContext();
    const master = getMasterNode();
    if (!ctx || !master) return false;
    if (ctx.state === "suspended") await ctx.resume();

    const videoTrack = getVideoStream?.()?.getVideoTracks()[0] ?? null;
    const withVideo = !!videoTrack;

    const dest = ctx.createMediaStreamDestination();
    destRef.current = dest;
    master.connect(dest);
    tappedRef.current = [master];

    for (const node of getExtraAudioNodes?.() ?? []) {
      if (!node) continue;
      try {
        node.connect(dest);
        tappedRef.current.push(node);
      } catch {
        /* ignore */
      }
    }

    const mimeType = pickMimeType(withVideo);
    mimeRef.current = mimeType;
    chunksRef.current = [];

    const tracks = [...dest.stream.getAudioTracks()];
    if (videoTrack) tracks.push(videoTrack);

    const mr = new MediaRecorder(new MediaStream(tracks), { mimeType });
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.start(200);
    mrRef.current = mr;

    setHasVideo(withVideo);
    setFormat(withVideo ? (mimeType.includes("mp4") ? "mp4" : "webm") : "wav");
    setCaptureBlob(null);
    setIsCapturing(true);
    return true;
  }, [getAudioContext, getMasterNode, getVideoStream, getExtraAudioNodes]);

  const stopCapture = useCallback(async (): Promise<Blob | null> => {
    const mr = mrRef.current;
    mrRef.current = null;
    setIsCapturing(false);
    if (!mr || mr.state === "inactive") {
      releaseTaps();
      return null;
    }

    const wasVideo = mr.mimeType.startsWith("video");
    setIsFinalizing(true);

    const blob = await new Promise<Blob | null>((resolve) => {
      mr.onstop = async () => {
        releaseTaps();
        const raw = new Blob(chunksRef.current, { type: mimeRef.current });
        chunksRef.current = [];
        if (raw.size === 0) {
          resolve(null);
          return;
        }
        if (wasVideo) {
          resolve(raw);
          return;
        }

        // Audio-only: re-encode the opus/aac capture as WAV
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
          resolve(raw);
        }
      };
      mr.stop();
    });

    if (blob && !wasVideo) {
      setFormat(blob.type.includes("wav") ? "wav" : mimeRef.current.includes("mp4") ? "mp4" : "webm");
    }
    setCaptureBlob(blob);
    setIsFinalizing(false);
    return blob;
  }, [getAudioContext, releaseTaps]);

  const download = useCallback(() => {
    if (!captureBlob) return;
    const url = URL.createObjectURL(captureBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBaseName}.${format}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, [captureBlob, format, fileBaseName]);

  return {
    isCapturing,
    isFinalizing,
    captureBlob,
    format,
    hasVideo,
    startCapture,
    stopCapture,
    download,
  };
}
