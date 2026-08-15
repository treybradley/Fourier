import { useCallback, useEffect, useRef } from "react";
import type { LoopTrack } from "../contexts/LooperContext";
import {
  EXPORT_ASPECT,
  EXPORT_HEIGHT,
  EXPORT_WIDTH,
  IG_SAFE,
  TRACK_WAVE_COLORS,
} from "../utils/exportFormat";
import {
  TRACK_PINCH_ZONE,
  type LooperPinchHand,
} from "./useLooperTrackPinch";
import { toFrameSpace } from "./useHandTracking";

const WAVE_CACHE_BARS = 64;
const THUMB_TIP = 4;
const INDEX_TIP = 8;

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

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawPinchHand(
  ctx: CanvasRenderingContext2D,
  hand: LooperPinchHand,
  video: HTMLVideoElement,
  cw: number,
  ch: number,
  color: string,
) {
  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;
  const thumb = toFrameSpace(hand.landmarks[THUMB_TIP], vw, vh, EXPORT_ASPECT);
  const index = toFrameSpace(hand.landmarks[INDEX_TIP], vw, vh, EXPORT_ASPECT);
  const onFrame = (p: { x: number; y: number }) =>
    p.x >= -0.05 && p.x <= 1.05 && p.y >= -0.05 && p.y <= 1.05;
  if (!onFrame(thumb) && !onFrame(index)) return;

  const r = Math.max(10, cw * 0.011);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2.5, cw * 0.003);
  ctx.lineCap = "round";

  if (onFrame(thumb) && onFrame(index)) {
    ctx.beginPath();
    ctx.moveTo(thumb.x * cw, thumb.y * ch);
    ctx.lineTo(index.x * cw, index.y * ch);
    ctx.stroke();
  }
  if (onFrame(thumb)) {
    ctx.beginPath();
    ctx.arc(thumb.x * cw, thumb.y * ch, r, 0, Math.PI * 2);
    ctx.fill();
  }
  if (onFrame(index)) {
    ctx.beginPath();
    ctx.arc(index.x * cw, index.y * ch, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function useLooperCompositor({
  videoRef,
  tracks,
  selectedTrack,
  masterBpm,
  masterLength,
  rightHand,
  getLoopPhase,
  active,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  tracks: LoopTrack[];
  selectedTrack: number;
  masterBpm: number | null;
  masterLength: number | null;
  rightHand: LooperPinchHand | null;
  getLoopPhase: () => number;
  active: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const peaksCacheRef = useRef<Map<string, number[]>>(new Map());
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const selectedRef = useRef(selectedTrack);
  selectedRef.current = selectedTrack;
  const bpmRef = useRef(masterBpm);
  bpmRef.current = masterBpm;
  const lengthRef = useRef(masterLength);
  lengthRef.current = masterLength;
  const handRef = useRef(rightHand);
  handRef.current = rightHand;
  const phaseFnRef = useRef(getLoopPhase);
  phaseFnRef.current = getLoopPhase;

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

      const topGrad = ctx.createLinearGradient(0, 0, 0, topSafe + 80);
      topGrad.addColorStop(0, "rgba(3,8,16,0.72)");
      topGrad.addColorStop(1, "rgba(3,8,16,0)");
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, cw, topSafe + 80);

      const fontSm = Math.max(22, Math.round(cw * 0.026));
      const fontMeta = Math.max(18, Math.round(cw * 0.022));
      const bpm = bpmRef.current;
      const loopLen = lengthRef.current;

      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.font = `600 ${fontSm}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("Fourier · Loop Station", sidePad, topSafe);

      if (bpm) {
        let meta = `${bpm} BPM`;
        if (loopLen) meta += ` · ${loopLen.toFixed(2)}s`;
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.font = `500 ${fontMeta}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        ctx.fillText(meta, sidePad, topSafe + fontSm + 10);
      }

      const selected = selectedRef.current;
      const zoneActive = !!(
        handRef.current?.isPinching && handRef.current.isPinchInZone
      );
      const accent = TRACK_WAVE_COLORS[selected % TRACK_WAVE_COLORS.length];
      const zx = TRACK_PINCH_ZONE.xMin * cw;
      const zy = TRACK_PINCH_ZONE.yMin * ch;
      const zw = (TRACK_PINCH_ZONE.xMax - TRACK_PINCH_ZONE.xMin) * cw;
      const zh = (TRACK_PINCH_ZONE.yMax - TRACK_PINCH_ZONE.yMin) * ch;
      const zr = Math.max(8, Math.round(cw * 0.01));

      ctx.fillStyle = zoneActive ? `${accent}33` : "rgba(255,255,255,0.08)";
      ctx.strokeStyle = zoneActive ? `${accent}cc` : "rgba(255,255,255,0.28)";
      ctx.lineWidth = Math.max(2, cw * 0.002);
      roundRectPath(ctx, zx, zy, zw, zh, zr);
      ctx.fill();
      roundRectPath(ctx, zx, zy, zw, zh, zr);
      ctx.stroke();

      ctx.fillStyle = zoneActive ? `${accent}ee` : "rgba(255,255,255,0.72)";
      ctx.font = `600 ${Math.max(20, Math.round(ch * 0.016))}px ui-monospace, Menlo, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`TRACK ${selected + 1}`, zx + zw / 2, zy + zh / 2 - 14);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = `500 ${Math.max(14, Math.round(ch * 0.011))}px ui-monospace, Menlo, monospace`;
      ctx.fillText("PINCH TO SWITCH", zx + zw / 2, zy + zh / 2 + 16);

      const withAudio = tracksRef.current.filter((t) => t.audioBuffer);
      if (withAudio.length > 0) {
        const rowH = Math.round(ch * 0.06);
        const rowGap = .5;
        const railBottom = ch - bottomSafe + 10;
        const usedH =
          rowH * withAudio.length + rowGap * Math.max(0, withAudio.length - 1);

        const gradTop = railBottom - usedH - Math.round(ch * 0.04);
        const grad = ctx.createLinearGradient(0, gradTop, 0, ch);
        grad.addColorStop(0, "rgba(3,8,16,0)");
        grad.addColorStop(0.35, "rgba(3,8,16,0.55)");
        grad.addColorStop(1, "rgba(3,8,16,0.85)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, gradTop, cw, ch - gradTop);

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
          const baseAlpha = isActive ? 0.95 : 0.45;

          const bars = peaks.length;
          const barGap = 1;
          const usableW = cw - sidePad * 2;
          const barW = Math.max(1, (usableW - barGap * (bars - 1)) / bars);
          const phase = phaseFnRef.current();
          const currentBar = isActive
            ? Math.min(bars - 1, Math.floor(phase * bars))
            : -1;
          const headPulse = isActive
            ? 1.15 + 0.45 * Math.abs(Math.sin(performance.now() / 140))
            : 1;

          for (let i = 0; i < bars; i++) {
            const boosted = 0.22 + Math.pow(peaks[i], 0.45) * 0.78;
            const h = Math.max(8, boosted * rowH * (i === currentBar ? headPulse : 1));
            const x = sidePad + i * (barW + barGap);
            const played = isActive && i / bars <= phase;
            ctx.fillStyle = color;
            ctx.globalAlpha = played
              ? baseAlpha
              : baseAlpha * (isActive ? 0.72 : 0.55);
            ctx.fillRect(x, y + rowH - h, barW, h);
          }
          ctx.globalAlpha = 1;

          y += rowH + rowGap;
        }
      }

      const hand = handRef.current;
      if (hand && video && video.readyState >= 2) {
        drawPinchHand(ctx, hand, video, cw, ch, "rgba(139,92,246,0.95)");
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
