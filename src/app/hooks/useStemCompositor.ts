import { useCallback, useEffect, useRef } from "react";
import type { StemState } from "../contexts/AudioEngineContext";
import {
  EXPORT_ASPECT,
  EXPORT_HEIGHT,
  EXPORT_WIDTH,
  IG_SAFE,
} from "../utils/exportFormat";
import {
  PITCH_BAND,
  VOLUME_BAND,
  toFrameSpace,
  type ProcessedHand,
} from "./useHandTracking";

const THUMB_TIP = 4;
const INDEX_TIP = 8;

const CHIP_DOT: Record<string, string> = {
  amber: "rgba(251,191,36,0.85)",
  sky: "rgba(56,189,248,0.85)",
  rose: "rgba(251,113,133,0.85)",
  emerald: "rgba(52,211,153,0.85)",
};

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

function drawBand(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  band: { xMin: number; xMax: number; yMin: number; yMax: number },
  color: string,
  label: string,
  active: boolean,
  progress: number | null,
) {
  const x = band.xMin * cw;
  const y = band.yMin * ch;
  const w = (band.xMax - band.xMin) * cw;
  const h = (band.yMax - band.yMin) * ch;
  // Match UI `rounded-sm` containers, scaled for the export canvas
  const radius = Math.max(8, Math.round(cw * 0.01));

  ctx.fillStyle = active ? `${color}33` : `${color}18`;
  ctx.strokeStyle = active ? `${color}cc` : `${color}66`;
  ctx.lineWidth = Math.max(2, cw * 0.002);
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.fill();
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.stroke();

  ctx.fillStyle = active ? `${color}ee` : `${color}99`;
  ctx.font = `600 ${Math.max(18, Math.round(ch * 0.014))}px ui-monospace, Menlo, monospace`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + 12, y + h / 2);

  if (active && progress != null) {
    const px = x + progress * w;
    const inset = Math.max(4, radius * 0.4);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Math.max(2, cw * 0.0025);
    ctx.beginPath();
    ctx.moveTo(px, y + inset);
    ctx.lineTo(px, y + h - inset);
    ctx.stroke();
  }
}

/** Match WebcamFeed Chip look: dark pill + colored square + mono label. */
function drawChip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: keyof typeof CHIP_DOT,
  text: string,
  fontSize: number,
): number {
  ctx.font = `${fontSize}px ui-monospace, Menlo, monospace`;
  const padX = Math.round(fontSize * 0.8);
  const padY = Math.round(fontSize * 0.45);
  const gap = Math.round(fontSize * 0.55);
  const dot = Math.max(4, Math.round(fontSize * 0.45));
  const textW = ctx.measureText(text).width;
  const w = padX * 2 + dot + gap + textW;
  const h = fontSize + padY * 2;

  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.beginPath();
  const r = 4;
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = CHIP_DOT[color];
  ctx.fillRect(x + padX, y + (h - dot) / 2, dot, dot);

  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + padX + dot + gap, y + h / 2);

  return h;
}

/** Thumb + index tips only, with a connector line (pinch cue). */
function drawPinchHand(
  ctx: CanvasRenderingContext2D,
  hand: ProcessedHand,
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

export function useStemCompositor({
  videoRef,
  stems,
  selectedStem,
  leftHand,
  rightHand,
  active,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stems: StemState[];
  selectedStem: number;
  leftHand: ProcessedHand | null;
  rightHand: ProcessedHand | null;
  active: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const stemsRef = useRef(stems);
  stemsRef.current = stems;
  const selectedRef = useRef(selectedStem);
  selectedRef.current = selectedStem;
  const leftRef = useRef(leftHand);
  leftRef.current = leftHand;
  const rightRef = useRef(rightHand);
  rightRef.current = rightHand;

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

      ctx.fillStyle = "#04050F";
      ctx.fillRect(0, 0, cw, ch);

      if (video && video.readyState >= 2) {
        drawCoverMirrored(ctx, video, cw, ch);
      }

      const sidePad = Math.round(cw * IG_SAFE.side);
      const topSafe = Math.round(ch * IG_SAFE.top);

      const botGrad = ctx.createLinearGradient(0, ch * 0.62, 0, ch);
      botGrad.addColorStop(0, "rgba(4,5,15,0)");
      botGrad.addColorStop(0.4, "rgba(4,5,15,0.5)");
      botGrad.addColorStop(1, "rgba(4,5,15,0.88)");
      ctx.fillStyle = botGrad;
      ctx.fillRect(0, ch * 0.62, cw, ch * 0.38);

      const left = leftRef.current;
      const right = rightRef.current;
      const stem = stemsRef.current[selectedRef.current];
      const selected = selectedRef.current;

      const pitchActive = !!(right?.isPinching && right.isPinchInPitchZone);
      const volActive = !!(left?.isPinching && left.isPinchInVolumeZone);

      // Status chips — same info as the old HTML overlay, inside IG safe zone
      const chipFont = Math.max(28, Math.round(cw * 0.028));
      const chipGap = Math.round(ch * 0.011);
      let chipY = topSafe;
      const chipX = sidePad;

      const stemLabel =
        right?.isPinching && !right.isPinchInPitchZone
          ? `STEM ${selected + 1} ← PINCH`
          : `STEM ${selected + 1}`;
      chipY +=
        drawChip(ctx, chipX, chipY, "amber", stemLabel, chipFont) + chipGap;

      if (volActive && left) {
        const volPct = Math.round(left.volumeZoneNormalizedX * 200);
        chipY +=
          drawChip(ctx, chipX, chipY, "rose", `VOL ${volPct}%`, chipFont) +
          chipGap;
      }

      if (pitchActive && right) {
        const pitchRatio = 0.5 + right.pitchZoneNormalizedX * 1.5;
        const pitchText = stem?.detectedBpm
          ? `${Math.round(stem.detectedBpm * pitchRatio)} BPM`
          : `PITCH ${Math.round(pitchRatio * 100)}%`;
        chipY +=
          drawChip(ctx, chipX, chipY, "sky", pitchText, chipFont) + chipGap;
      }

      if (left) {
        drawChip(
          ctx,
          chipX,
          chipY,
          left.isOpen ? "rose" : "emerald",
          left.isOpen ? "PAUSE" : "PLAY",
          chipFont,
        );
      }

      // Brand just above the pitch / volume bands
      const brandFont = Math.max(20, Math.round(cw * 0.024));
      const brandY = PITCH_BAND.yMin * ch - Math.round(ch * 0.018);
      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.font = `600 ${brandFont}px ui-monospace, Menlo, monospace`;
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText("Fourier · Stem Collage", sidePad, brandY);

      drawBand(
        ctx,
        cw,
        ch,
        PITCH_BAND,
        "#38bdf8",
        "PITCH",
        pitchActive,
        pitchActive ? right!.pitchZoneNormalizedX : null,
      );
      drawBand(
        ctx,
        cw,
        ch,
        VOLUME_BAND,
        "#fb7185",
        "VOLUME",
        volActive,
        volActive ? left!.volumeZoneNormalizedX : null,
      );

      if (video && video.readyState >= 2) {
        if (right)
          drawPinchHand(ctx, right, video, cw, ch, "rgba(56,189,248,0.95)");
        if (left)
          drawPinchHand(ctx, left, video, cw, ch, "rgba(251,113,133,0.95)");
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [active, videoRef]);

  return { canvasRef, getCanvasStream };
}
