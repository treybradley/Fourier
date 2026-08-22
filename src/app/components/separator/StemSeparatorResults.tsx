import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useStemSeparatorContext } from "../../contexts/StemSeparatorContext";
import { STEM_LABELS, STEM_COLORS, type StemName } from "../../hooks/useStemSeparator";
import { formatTime } from "../../utils/audioUtils";
import { useVisualMode } from "../../hooks/useVisualMode";

function WaveformRow({
  label,
  color,
  buffer,
  duration,
  playheadTime,
  isMuted,
  volume,
  onToggleMute,
  onVolume,
  onDownload,
  waveformStroke,
}: {
  label: string;
  color: string;
  buffer: AudioBuffer;
  duration: number;
  playheadTime: number;
  isMuted: boolean;
  volume: number;
  onToggleMute: () => void;
  onVolume: (v: number) => void;
  onDownload: () => void;
  /** Override canvas stroke (e.g. full track → white on dark). */
  waveformStroke?: string;
}) {
  const { mono, ink, inkFg } = useVisualMode();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveBoxRef = useRef<HTMLDivElement>(null);
  const stroke = mono ? "#111111" : color;
  const waveStroke = waveformStroke ?? stroke;

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const box = waveBoxRef.current;
    if (!canvas || !box) return;

    const cssW = box.clientWidth;
    const cssH = box.clientHeight;
    if (cssW <= 0 || cssH <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    const W = Math.round(cssW * dpr);
    const H = Math.round(cssH * dpr);
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    const data = buffer.getChannelData(0);
    const step = Math.max(1, Math.ceil(data.length / W));
    ctx.strokeStyle = waveStroke;
    ctx.globalAlpha = isMuted ? 0.25 : 0.85;
    ctx.lineWidth = Math.max(1, dpr);
    ctx.beginPath();
    for (let x = 0; x < W; x++) {
      let max = 0;
      for (let j = 0; j < step; j++) {
        const v = Math.abs(data[x * step + j] ?? 0);
        if (v > max) max = v;
      }
      const h = Math.max(1, max * (H / 2) * 0.85);
      ctx.moveTo(x, H / 2 - h);
      ctx.lineTo(x, H / 2 + h);
    }
    ctx.stroke();
  }, [buffer, waveStroke, isMuted]);

  useEffect(() => {
    drawWaveform();
    const box = waveBoxRef.current;
    if (!box) return;
    const ro = new ResizeObserver(() => drawWaveform());
    ro.observe(box);
    return () => ro.disconnect();
  }, [drawWaveform]);

  const progress = duration > 0 ? Math.min(playheadTime / duration, 1) : 0;

  return (
    <motion.div
      className="flex items-center gap-3 px-1"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-1.5 w-16 shrink-0">
        <div
          className="w-1.5 h-1.5 rounded-full shrink-0 transition-opacity"
          style={{ background: stroke, opacity: isMuted ? 0.3 : 1 }}
        />
        <span
          className="text-[10px] font-mono tracking-widest uppercase transition-colors"
          style={{ color: isMuted ? ink(0.35) : inkFg(0.85) }}
        >
          {label}
        </span>
      </div>

      <div
        ref={waveBoxRef}
        className="relative flex-1 h-9 min-w-[4rem] rounded-sm overflow-hidden border"
        style={{
          backgroundColor: mono ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.35)",
          borderColor: mono ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.08)",
        }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        <div
          className="absolute top-0 bottom-0 w-px transition-none"
          style={{ left: `${progress * 100}%`, background: stroke, opacity: 0.7 }}
        />
      </div>

      <button
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded-sm border transition-all duration-150"
        style={{
          borderColor: isMuted ? `${stroke}60` : "rgba(255,255,255,0.10)",
          background: isMuted ? `${stroke}18` : "transparent",
        }}
        onClick={onToggleMute}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? (
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: stroke }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        ) : (
          <svg className="w-2.5 h-2.5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-4.243-9.757l-.707.707M4 12H2m2.343 4.243l.707-.707" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l6 6" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        )}
      </button>

      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(e) => onVolume(Number(e.target.value))}
        className="w-20 shrink-0 cursor-pointer"
        style={{
          "--thumb-color": stroke,
          "--track-bg": mono ? "rgba(0,0,0,0.18)" : `${stroke}30`,
          opacity: isMuted ? 0.3 : 1,
        } as React.CSSProperties}
      />

      <button
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded-sm border border-white/10 hover:border-white/25 transition-colors"
        onClick={onDownload}
        title="Download WAV"
      >
        <svg className="w-2.5 h-2.5 text-white/35 hover:text-white/65 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </button>
    </motion.div>
  );
}

function StemRow({
  stem,
  duration,
  playheadTime,
}: {
  stem: StemName;
  duration: number;
  playheadTime: number;
}) {
  const { results, stemVolumes, mutedStems, setStemVolume, toggleMute, downloadStem } =
    useStemSeparatorContext();
  const buffer = results[stem];
  if (!buffer) return null;

  return (
    <WaveformRow
      label={STEM_LABELS[stem]}
      color={STEM_COLORS[stem]}
      waveformStroke={STEM_COLORS[stem]}
      buffer={buffer}
      duration={duration}
      playheadTime={playheadTime}
      isMuted={mutedStems[stem]}
      volume={stemVolumes[stem]}
      onToggleMute={() => toggleMute(stem)}
      onVolume={(v) => setStemVolume(stem, v)}
      onDownload={() => downloadStem(stem)}
    />
  );
}

export function StemSeparatorResults() {
  const {
    results,
    runStems,
    sourceBuffer,
    isPlaying,
    play,
    pause,
    seek,
    reset,
    sourceFile,
    getPlayheadTime,
    originalVolume,
    originalMuted,
    setOriginalVolume,
    toggleOriginalMute,
    downloadOriginal,
  } = useStemSeparatorContext();
  const { mono } = useVisualMode();
  const [playheadTime, setPlayheadTime] = useState(0);
  const rafRef = useRef<number>();
  const isSeeking = useRef(false);

  const stemDur = runStems.map(s => results[s]?.duration ?? 0).find(d => d > 0) ?? 0;
  const duration = Math.max(sourceBuffer?.duration ?? 0, stemDur);

  useEffect(() => {
    const tick = () => {
      setPlayheadTime(getPlayheadTime());
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [getPlayheadTime]);

  const progress = duration > 0 ? Math.min(playheadTime / duration, 1) : 0;

  return (
    <div className="flex flex-col gap-5 w-full max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/60 text-xs font-mono tracking-wider truncate max-w-[240px]">
            {sourceFile?.name}
          </p>
          <p className="text-white/25 text-[9px] font-mono tracking-widest uppercase mt-0.5">
            Separation complete · {runStems.length} {runStems.length === 1 ? "stem" : "stems"}
          </p>
        </div>
        <button
          onClick={reset}
          className="text-[9px] font-mono tracking-widest uppercase text-white/25 hover:text-white/50 border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-sm transition-colors"
        >
          New file
        </button>
      </div>

      <div
        className="flex items-center gap-3 px-4 py-3 rounded-sm border border-white/8"
        style={{ background: "rgba(255,255,255,0.03)" }}
      >
        <button
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-sm border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 transition-all"
          onClick={() => isPlaying ? pause() : play()}
        >
          {isPlaying ? (
            <svg className="w-3 h-3 text-white/80" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg className="w-3 h-3 text-white/80" fill="currentColor" viewBox="0 0 24 24">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>

        <span className="text-[10px] font-mono text-white/40 tabular-nums w-10 shrink-0">
          {formatTime(playheadTime)}
        </span>

        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.01}
          value={isSeeking.current ? undefined : playheadTime}
          className="flex-1 cursor-pointer"
          style={{
            "--thumb-color": mono ? "#111111" : "rgba(255,255,255,0.8)",
            "--track-bg": mono
              ? `linear-gradient(to right, #111111 ${progress * 100}%, rgba(0,0,0,0.12) ${progress * 100}%)`
              : `linear-gradient(to right, rgba(255,255,255,0.55) ${progress * 100}%, rgba(255,255,255,0.10) ${progress * 100}%)`,
          } as React.CSSProperties}
          onMouseDown={() => { isSeeking.current = true; if (isPlaying) pause(); }}
          onChange={(e) => { setPlayheadTime(Number(e.target.value)); }}
          onMouseUp={(e) => {
            isSeeking.current = false;
            seek(Number((e.target as HTMLInputElement).value));
          }}
        />

        <span className="text-[10px] font-mono text-white/25 tabular-nums w-10 shrink-0 text-right">
          {formatTime(duration)}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {sourceBuffer && (
          <WaveformRow
            label="Full track"
            color={mono ? "#111111" : "rgba(255,255,255,0.9)"}
            waveformStroke={mono ? "#111111" : "#ffffff"}
            buffer={sourceBuffer}
            duration={duration}
            playheadTime={playheadTime}
            isMuted={originalMuted}
            volume={originalVolume}
            onToggleMute={toggleOriginalMute}
            onVolume={setOriginalVolume}
            onDownload={downloadOriginal}
          />
        )}
        {runStems.map(stem => (
          <StemRow
            key={stem}
            stem={stem}
            duration={duration}
            playheadTime={playheadTime}
          />
        ))}
      </div>

      <p className="text-white/15 text-[9px] font-mono text-center">
        Full track muted by default · Download stems as WAV · 44.1 kHz stereo
      </p>
    </div>
  );
}
