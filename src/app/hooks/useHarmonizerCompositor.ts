import { useCallback, useEffect, useRef } from "react";
import type { HarmonizerTrack } from "../contexts/HarmonizerContext";
import {
  EXPORT_HEIGHT,
  EXPORT_WIDTH,
  IG_SAFE,
  TRACK_WAVE_COLORS,
} from "../utils/exportFormat";

function drawCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  cw: number,
  ch: number,
  mirror: boolean,
) {
  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;
  if (vw < 2 || vh < 2) return;
  const scale = Math.max(cw / vw, ch / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  const ox = (cw - dw) / 2;
  const oy = (ch - dh) / 2;
  ctx.save();
  if (mirror) {
    ctx.translate(cw, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, ox, oy, dw, dh);
  ctx.restore();
}

function peaksFromBuffer(buffer: AudioBuffer, bars = 48): number[] {
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

export function useHarmonizerCompositor({
  cameraVideoRef,
  clipVideoRef,
  tracks,
  getLoopPhase,
  active,
  preferClip,
  isPlaying,
}: {
  cameraVideoRef: React.RefObject<HTMLVideoElement | null>;
  clipVideoRef: React.RefObject<HTMLVideoElement | null>;
  tracks: HarmonizerTrack[];
  getLoopPhase: () => number;
  active: boolean;
  preferClip: boolean;
  isPlaying: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const phaseFnRef = useRef(getLoopPhase);
  phaseFnRef.current = getLoopPhase;
  const preferClipRef = useRef(preferClip);
  preferClipRef.current = preferClip;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const lastPhaseRef = useRef(0);

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

      ctx.fillStyle = "#0A060C";
      ctx.fillRect(0, 0, cw, ch);

      const clip = clipVideoRef.current;
      const cam = cameraVideoRef.current;
      const useClip =
        preferClipRef.current &&
        clip &&
        clip.readyState >= 2 &&
        clip.videoWidth > 0;

      if (useClip) {
        const phase = phaseFnRef.current();
        const dur = clip.duration;
        if (dur && Number.isFinite(dur) && dur > 0) {
          const target = phase * dur;
          const playing = isPlayingRef.current;

          if (!playing) {
            if (!clip.paused) clip.pause();
            // Seek handled on transport stop; avoid per-frame currentTime writes
          } else {
            if (clip.paused) void clip.play().catch(() => undefined);
            const wrapped = phase + 0.5 < lastPhaseRef.current;
            const drift = Math.abs(clip.currentTime - target);
            // Resync on loop wrap or large drift only
            if (wrapped || drift > 0.35) {
              try {
                clip.currentTime = target;
              } catch {
                /* ignore */
              }
            }
          }
          lastPhaseRef.current = phase;
        }
        drawCover(ctx, clip, cw, ch, false);
      } else if (cam && cam.readyState >= 2) {
        drawCover(ctx, cam, cw, ch, true);
      }

      const sidePad = Math.round(cw * IG_SAFE.side);
      const topSafe = Math.round(ch * IG_SAFE.top);
      const bottomSafe = Math.round(ch * IG_SAFE.bottom);

      const topGrad = ctx.createLinearGradient(0, 0, 0, topSafe + 80);
      topGrad.addColorStop(0, "rgba(10,6,12,0.75)");
      topGrad.addColorStop(1, "rgba(10,6,12,0)");
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, cw, topSafe + 80);

      ctx.fillStyle = "rgba(255,255,255,0.82)";
      ctx.font = `600 ${Math.max(22, Math.round(cw * 0.026))}px ui-monospace, Menlo, monospace`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("Fourier · Harmonizer", sidePad, topSafe);

      const withAudio = tracksRef.current.filter((t) => t.rootBuffer);
      let chipY = topSafe + Math.round(ch * 0.04);
      ctx.font = `500 ${Math.max(16, Math.round(cw * 0.02))}px ui-monospace, Menlo, monospace`;
      for (const track of withAudio) {
        const intervals = track.voices.map(
          (v) => `${v.semitones > 0 ? "+" : ""}${v.semitones}`,
        );
        const label =
          intervals.length > 0
            ? `T${track.id + 1}  root · ${intervals.join(" · ")}`
            : `T${track.id + 1}  root`;
        ctx.fillStyle = TRACK_WAVE_COLORS[track.id % TRACK_WAVE_COLORS.length];
        ctx.fillText(label, sidePad, chipY);
        chipY += Math.round(ch * 0.028);
      }

      if (withAudio.length > 0) {
        const rowH = Math.round(ch * 0.05);
        const rowGap = 4;
        const railBottom = ch - bottomSafe + 10;
        const usedH =
          rowH * withAudio.length + rowGap * Math.max(0, withAudio.length - 1);
        const gradTop = railBottom - usedH - Math.round(ch * 0.04);
        const grad = ctx.createLinearGradient(0, gradTop, 0, ch);
        grad.addColorStop(0, "rgba(10,6,12,0)");
        grad.addColorStop(0.35, "rgba(10,6,12,0.55)");
        grad.addColorStop(1, "rgba(10,6,12,0.85)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, gradTop, cw, ch - gradTop);

        let y = railBottom - usedH;
        const phase = phaseFnRef.current();
        for (const track of withAudio) {
          const peaks = peaksFromBuffer(track.rootBuffer!);
          const color = TRACK_WAVE_COLORS[track.id % TRACK_WAVE_COLORS.length];
          const bars = peaks.length;
          const usableW = cw - sidePad * 2;
          const barGap = 1;
          const barW = Math.max(1, (usableW - barGap * (bars - 1)) / bars);
          for (let i = 0; i < bars; i++) {
            const h = Math.max(6, Math.pow(peaks[i], 0.45) * rowH);
            const x = sidePad + i * (barW + barGap);
            const played = i / bars <= phase;
            ctx.fillStyle = color;
            ctx.globalAlpha = played ? 0.95 : 0.4;
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
  }, [active, cameraVideoRef, clipVideoRef]);

  return { canvasRef, getCanvasStream };
}
