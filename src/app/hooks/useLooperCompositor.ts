import { useCallback, useEffect, useRef } from "react";
import type { LoopTrack } from "../../contexts/LooperContext";
import {
  EXPORT_HEIGHT,
  EXPORT_WIDTH,
  IG_SAFE,
  TRACK_WAVE_COLORS,
} from "../components/looper/exportAspect";

const WAVE_CACHE_BARS = 64;

function peaksFromBuffer(buffer: AudioBuffer, bars = WAVE_CACHE_BARS): number[] {
  const data = buffer.getChannelData(0);
  const block = Math.max(1, Math.floor(data.length / bars));
  const peaks: number[] = [];
  for (let i = 0; i < bars; i++) {
    let max = 0;
    const start = i * block;
    for (let j = 0; j < block && start + j < data.length; j++) {
      max = Math.max(max, Math.abs(data[start + j]));
    }
    peaks.push(max);
  }
  return peaks;
}

function drawCoverMirrored(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  cw: number,
  ch: number,
) {
  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;
  const scale = Math.max(cw / vw, ch / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  const ox = (cw - dw) / 2;
  const oy = (ch - dh) / 2;

  ctx.save();
  ctx.translate(cw, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, ox, oy, dw, dh);
  ctx.restore();
}

export function useLooperCompositor({
  videoRef,
  tracks,
  masterBpm,
  masterLength,
  active,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  tracks: LoopTrack[];
  masterBpm: number | null;
  masterLength: number | null;
  active: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const peaksCacheRef = useRef<Map<string, number[]>>(new Map());
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const bpmRef = useRef(masterBpm);
  bpmRef.current = masterBpm;
  const lengthRef = useRef(masterLength);
  lengthRef.current = masterLength;

  const getCanvasStream = useCallback((fps = 30) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.captureStream(fps);
  }, []);

  useEffect(() => {
    if (!active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      return;
    }

    const draw = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const cw = EXPORT_WIDTH;
      const ch = EXPORT_HEIGHT;
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      ctx.fillStyle = "#030810";
      ctx.fillRect(0, 0, cw, ch);

      if (video && video.readyState >= 2) {
        drawCoverMirrored(ctx, video, cw, ch);
      }

      const sidePad = Math.round(cw * IG_SAFE.side);
      const topSafe = Math.round(ch * IG_SAFE.top);
      const bottomSafe = Math.round(ch * IG_SAFE.bottom);

      // Soft bottom gradient behind waveform rail
      const gradTop = ch - bottomSafe - Math.round(ch * 0.18);
      const grad = ctx.createLinearGradient(0, gradTop, 0, ch);
      grad.addColorStop(0, "rgba(3,8,16,0)");
      grad.addColorStop(0.4, "rgba(3,8,16,0.55)");
      grad.addColorStop(1, "rgba(3,8,16,0.85)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, gradTop, cw, ch - gradTop);

      // Soft top gradient behind wordmark
      const topGrad = ctx.createLinearGradient(0, 0, 0, topSafe + 40);
      topGrad.addColorStop(0, "rgba(3,8,16,0.7)");
      topGrad.addColorStop(1, "rgba(3,8,16,0)");
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, cw, topSafe + 40);

      const fontSm = Math.max(22, Math.round(cw * 0.026));

      // Wordmark + BPM on one line (IG top safe zone)
      const bpm = bpmRef.current;
      const loopLen = lengthRef.current;
      let header = "Fourier · Loop Station";
      if (bpm) {
        header += ` · ${bpm} BPM`;
        if (loopLen) header += ` · ${loopLen.toFixed(2)}s`;
      }

      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.font = `600 ${fontSm}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(header, sidePad, topSafe);

      // Bottom waveform rail — taller rows, tight gaps, matched bottom inset
      const withAudio = tracksRef.current.filter((t) => t.audioBuffer);
      if (withAudio.length > 0) {
        const railH = Math.round(ch * 0.2);
        const railBottom = ch - bottomSafe;
        const rowGap = Math.max(2, Math.round(ch * 0.004));
        const rowH = Math.max(
          18,
          Math.floor((railH - rowGap * (withAudio.length - 1)) / withAudio.length),
        );
        const usedH =
          rowH * withAudio.length + rowGap * Math.max(0, withAudio.length - 1);
        let y = railBottom - usedH;

        for (const track of withAudio) {
          const buf = track.audioBuffer!;
          const cacheKey = `${track.id}:${buf.length}:${buf.duration.toFixed(3)}`;
          let peaks = peaksCacheRef.current.get(cacheKey);
          if (!peaks) {
            peaks = peaksFromBuffer(buf);
            peaksCacheRef.current.set(cacheKey, peaks);
          }

          const isActive =
            track.status === "playing" ||
            track.status === "overdubbing" ||
            track.status === "pending";
          const color = TRACK_WAVE_COLORS[track.id % TRACK_WAVE_COLORS.length];
          const baseAlpha = isActive ? 0.9 : 0.35;

          const bars = peaks.length;
          const barGap = 1;
          const usableW = cw - sidePad * 2;
          const barW = Math.max(1, (usableW - barGap * (bars - 1)) / bars);

          for (let i = 0; i < bars; i++) {
            const h = Math.max(2, peaks[i] * rowH);
            const x = sidePad + i * (barW + barGap);
            ctx.fillStyle = color;
            ctx.globalAlpha = baseAlpha * (0.45 + peaks[i] * 0.55);
            ctx.fillRect(x, y + rowH - h, barW, h);
          }
          ctx.globalAlpha = 1;

          y += rowH + rowGap;
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [active, videoRef]);

  useEffect(() => {
    const keys = new Set(
      tracks
        .filter((t) => t.audioBuffer)
        .map(
          (t) =>
            `${t.id}:${t.audioBuffer!.length}:${t.audioBuffer!.duration.toFixed(3)}`,
        ),
    );
    for (const key of peaksCacheRef.current.keys()) {
      if (!keys.has(key)) peaksCacheRef.current.delete(key);
    }
  }, [tracks]);

  return { canvasRef, getCanvasStream };
}
