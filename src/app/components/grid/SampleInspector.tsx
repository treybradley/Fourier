import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
} from "react";
import type { Pad, GridAction } from "./types";
import { useGridRecorder } from "./useGridRecorder";
import { useVisualMode } from "../../hooks/useVisualMode";

interface SampleInspectorProps {
  pad: Pad | null;
  dispatch: Dispatch<GridAction>;
  ensureAudioCtx: () => Promise<AudioContext | null>;
  onRecord: (padId: number, buffer: AudioBuffer) => void;
}

function WaveformCanvas({
  buffer,
  trimStart,
  trimEnd,
}: {
  buffer: AudioBuffer;
  trimStart: number;
  trimEnd: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { accent, ink } = useVisualMode();
  const accentA = accent("#62FF00");
  const accentB = accent("#FBFF00", "#555555");
  const [zoom, setZoom] = useState(1);
  const [viewStart, setViewStart] = useState(0);
  const dragRef = useRef<{
    startX: number;
    startView: number;
  } | null>(null);

  const viewWidth = 1 / zoom;
  const clampedViewStart = Math.max(
    0,
    Math.min(viewStart, 1 - viewWidth),
  );
  const viewEnd = clampedViewStart + viewWidth;

  function zoomIn() {
    const newZoom = Math.min(zoom * 2, 32);
    const newWidth = 1 / newZoom;
    const center = (trimStart + trimEnd) / 2;
    setZoom(newZoom);
    setViewStart(
      Math.max(0, Math.min(center - newWidth / 2, 1 - newWidth)),
    );
  }

  function zoomOut() {
    const newZoom = Math.max(zoom / 2, 1);
    const newWidth = 1 / newZoom;
    const center = clampedViewStart + viewWidth / 2;
    setZoom(newZoom);
    setViewStart(
      Math.max(0, Math.min(center - newWidth / 2, 1 - newWidth)),
    );
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (zoom <= 1) return;
    dragRef.current = {
      startX: e.clientX,
      startView: clampedViewStart,
    };
  }
  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!dragRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dx =
      (e.clientX - dragRef.current.startX) / canvas.offsetWidth;
    setViewStart(
      Math.max(
        0,
        Math.min(
          dragRef.current.startView - dx * viewWidth,
          1 - viewWidth,
        ),
      ),
    );
  }
  function onMouseUp() {
    dragRef.current = null;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.offsetWidth || 200;
    const H = canvas.offsetHeight || 80;
    const dpr = window.devicePixelRatio;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const data = buffer.getChannelData(0);
    const startSample = Math.floor(clampedViewStart * data.length);
    const endSample = Math.floor(viewEnd * data.length);
    const visibleSamples = Math.max(1, endSample - startSample);
    const step = Math.max(1, Math.ceil(visibleSamples / W));

    ctx.strokeStyle = accentA;
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x++) {
      let max = 0;
      const base =
        startSample + Math.floor((x / W) * visibleSamples);
      for (let j = 0; j < step; j++) {
        const v = Math.abs(data[base + j] ?? 0);
        if (v > max) max = v;
      }
      const h = max * H * 0.42;
      const norm = clampedViewStart + (x / W) * viewWidth;
      const inTrim = norm >= trimStart && norm <= trimEnd;
      ctx.globalAlpha = inTrim ? 0.65 : 0.15;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, H / 2 - h);
      ctx.lineTo(x + 0.5, H / 2 + h);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = accentB;
    const markers = [trimStart, trimEnd];
    markers.forEach((pos) => {
      if (pos < clampedViewStart || pos > viewEnd) return;
      const x = ((pos - clampedViewStart) / viewWidth) * W;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    });

    ctx.globalAlpha = 0.5;
    ctx.fillStyle = accentB;
    ctx.font = "8px monospace";
    if (trimStart < clampedViewStart)
      ctx.fillText("◂", 2, H / 2 + 3);
    if (trimEnd > viewEnd) ctx.fillText("▸", W - 8, H / 2 + 3);
  }, [
    buffer,
    trimStart,
    trimEnd,
    zoom,
    clampedViewStart,
    viewEnd,
    viewWidth,
    accentA,
    accentB,
  ]);

  return (
    <div className="select-none flex flex-col gap-1">
      <div className="flex items-center justify-end gap-1 px-[6px] py-[6px]">
        {zoom > 1 && (
          <span
            className="text-[7px] font-mono mr-auto"
            style={{ color: ink(0.3) }}
          >
            {zoom}×
          </span>
        )}
        <button
          onClick={zoomOut}
          disabled={zoom <= 1}
          className="w-5 h-5 flex items-center justify-center rounded-sm text-[10px] font-mono transition-colors border"
          style={{
            color: zoom <= 1 ? ink(0.15) : accentA,
            borderColor:
              zoom <= 1
                ? ink(0.06)
                : `${accentA}40`,
          }}
        >
          −
        </button>
        <button
          onClick={zoomIn}
          disabled={zoom >= 32}
          className="w-5 h-5 flex items-center justify-center rounded-sm text-[10px] font-mono transition-colors border"
          style={{
            color:
              zoom >= 32 ? ink(0.15) : accentA,
            borderColor:
              zoom >= 32
                ? ink(0.06)
                : `${accentA}40`,
          }}
        >
          +
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full rounded-sm"
        style={{
          height: "72px",
          cursor: zoom > 1 ? "grab" : "default",
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      />
      {zoom > 1 && (
        <div
          className="mt-0.5 h-0.5 w-full rounded-full"
          style={{ background: ink(0.08) }}
        >
          <div
            className="h-full rounded-full"
            style={{
              background: accentA,
              marginLeft: `${clampedViewStart * 100}%`,
              width: `${viewWidth * 100}%`,
              opacity: 0.5,
            }}
          />
        </div>
      )}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  valueWidthClass = "w-9",
  labelClassName = "text-[9px] font-mono tracking-wider text-white/30 uppercase w-12 shrink-0",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  valueWidthClass?: string;
  labelClassName?: string;
  onChange: (v: number) => void;
}) {
  const { accent } = useVisualMode();
  const accentA = accent("#62FF00");
  return (
    <div className="flex items-center gap-2">
      <span className={labelClassName}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 cursor-pointer"
        style={
          {
            "--thumb-color": accentA,
            "--track-bg": `linear-gradient(to right, ${accentA} ${((value - min) / (max - min)) * 100}%, ${accentA}33 ${((value - min) / (max - min)) * 100}%)`,
          } as React.CSSProperties
        }
      />
      <span
        className={`text-[9px] font-mono text-white/40 text-right tabular-nums shrink-0 ${valueWidthClass}`}
      >
        {format(value)}
      </span>
    </div>
  );
}

export function SampleInspector({
  pad,
  dispatch,
  ensureAudioCtx,
  onRecord,
}: SampleInspectorProps) {
  const { isRecording, startRecording, stopRecording } =
    useGridRecorder();
  const [micError, setMicError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { accent, ink, inkFg, mono } = useVisualMode();
  const accentA = accent("#62FF00");
  const accentB = accent("#FBFF00", "#555555");

  if (!pad) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2">
        <div className="w-6 h-6 rounded-full border border-white/10 flex items-center justify-center">
          <span className="text-white/20 text-xs">↗</span>
        </div>
        <p className="text-white/20 text-[9px] font-mono tracking-wider text-center">
          Select a pad to
          <br />
          inspect or edit
        </p>
      </div>
    );
  }

  async function handleRecord() {
    setMicError("");
    const audioCtx = await ensureAudioCtx();
    if (!audioCtx) {
      setMicError("Audio unavailable");
      return;
    }
    if (isRecording) {
      const buf = stopRecording(audioCtx);
      if (buf && buf.duration > 0.05) onRecord(pad!.id, buf);
      else setMicError("Nothing recorded");
    } else {
      const ok = await startRecording(audioCtx);
      if (!ok) setMicError("Mic permission denied");
    }
  }

  function handleFileClick() {
    fileInputRef.current?.click();
  }

  return (
    <div className="h-full flex flex-col gap-3 overflow-y-auto">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: accentA }}
          />
          <span className="text-[9px] font-mono tracking-widest uppercase text-white/40">
            {pad.buffer ? "Audio Pad" : "Empty Pad"} · {pad.id + 1}
          </span>
        </div>
        <button
          onClick={() =>
            dispatch({ type: "CLEAR_PAD", padId: pad.id })
          }
          className="text-[8px] font-mono text-white/20 hover:text-white/50 transition-colors"
        >
          Clear
        </button>
      </div>

      {pad.buffer && (
        <div className="flex-shrink-0 rounded-sm overflow-hidden bg-black/20">
          <WaveformCanvas
            buffer={pad.buffer}
            trimStart={pad.trimStart}
            trimEnd={pad.trimEnd}
          />
        </div>
      )}

      <div className="flex-shrink-0 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-white/8" />
          <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest">
            Source
          </span>
          <div className="flex-1 h-px bg-white/8" />
        </div>

        <div className="flex gap-1.5">
          <button
            onClick={handleFileClick}
            className="flex-1 py-1.5 text-[9px] font-mono tracking-wider text-white/40 hover:text-white/70 border border-white/10 hover:border-white/20 rounded-sm transition-colors"
          >
            Load file
          </button>
          <button
            onClick={() => void handleRecord()}
            className="flex-1 py-1.5 text-[9px] font-mono tracking-wider rounded-sm border transition-all duration-150"
            style={
              isRecording
                ? {
                    color: accentA,
                    borderColor: `${accentA}60`,
                    background: `${accentA}18`,
                  }
                : {
                    color: inkFg(0.7),
                    borderColor: ink(0.28),
                    background: mono ? "rgba(0,0,0,0.05)" : "transparent",
                  }
            }
          >
            {isRecording ? "● Stop" : "Record mic"}
          </button>
        </div>
        {micError && (
          <p className="text-[8px] font-mono text-red-400/70">
            {micError}
          </p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,.ogg,.flac,.m4a,audio/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const event = new CustomEvent("grid-load-file", {
                detail: { padId: pad.id, file },
              });
              window.dispatchEvent(event);
            }
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex-shrink-0 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-white/8" />
          <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest">
            Edit
          </span>
          <div className="flex-1 h-px bg-white/8" />
        </div>

        <Slider
          label="Start"
          value={pad.trimStart}
          min={0}
          max={pad.trimEnd - 0.01}
          step={0.001}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) =>
            dispatch({
              type: "UPDATE_PAD_PARAM",
              padId: pad.id,
              param: "trimStart",
              value: v,
            })
          }
        />
        <Slider
          label="End"
          value={pad.trimEnd}
          min={pad.trimStart + 0.01}
          max={1}
          step={0.001}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) =>
            dispatch({
              type: "UPDATE_PAD_PARAM",
              padId: pad.id,
              param: "trimEnd",
              value: v,
            })
          }
        />
        <div className="space-y-0.5">
          <Slider
            label={`${pad.speed.toFixed(2)}×`}
            labelClassName="text-[9px] font-mono text-white/40 tabular-nums w-12 shrink-0"
            value={pad.speed}
            min={0.25}
            max={4}
            step={0.01}
            valueWidthClass="w-10"
            format={(v) =>
              pad.detectedBpm
                ? `${Math.round(pad.detectedBpm * v)}bpm`
                : "—"
            }
            onChange={(v) =>
              dispatch({
                type: "UPDATE_PAD_PARAM",
                padId: pad.id,
                param: "speed",
                value: v,
              })
            }
          />
          {pad.detectedBpm != null && Math.abs(pad.speed - 1) > 0.005 && (
            <p className="text-[8px] font-mono text-white/25 text-right pr-0.5">
              {pad.detectedBpm} bpm at 1×
            </p>
          )}
        </div>
        <Slider
          label="Gain"
          value={pad.gain}
          min={0}
          max={1}
          step={0.01}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) =>
            dispatch({
              type: "UPDATE_PAD_PARAM",
              padId: pad.id,
              param: "gain",
              value: v,
            })
          }
        />
        <Slider
          label="Drive"
          value={pad.drive}
          min={0}
          max={1}
          step={0.01}
          format={(v) =>
            v === 0 ? "off" : `${Math.round(v * 100)}%`
          }
          onChange={(v) =>
            dispatch({
              type: "UPDATE_PAD_PARAM",
              padId: pad.id,
              param: "drive",
              value: v,
            })
          }
        />

        <div className="flex gap-1.5">
          <button
            onClick={() =>
              dispatch({
                type: "SET_REVERSE",
                padId: pad.id,
                reverse: !pad.reverse,
              })
            }
            className="flex-1 py-1.5 text-[9px] font-mono tracking-wider rounded-sm border transition-all duration-150"
            style={
              pad.reverse
                ? {
                    color: accentB,
                    borderColor: `${accentB}60`,
                    background: `${accentB}18`,
                  }
                : {
                    color: inkFg(0.65),
                    borderColor: ink(0.28),
                    background: mono ? "rgba(0,0,0,0.05)" : "transparent",
                  }
            }
          >
            {pad.reverse ? "⟵ Rev" : "Reverse"}
          </button>
          <button
            onClick={() =>
              dispatch({
                type: "SET_LOOP",
                padId: pad.id,
                loop: !pad.loop,
              })
            }
            className="flex-1 py-1.5 text-[9px] font-mono tracking-wider rounded-sm border transition-all duration-150"
            style={
              pad.loop
                ? {
                    color: accentA,
                    borderColor: `${accentA}60`,
                    background: `${accentA}18`,
                  }
                : {
                    color: inkFg(0.65),
                    borderColor: ink(0.28),
                    background: mono ? "rgba(0,0,0,0.05)" : "transparent",
                  }
            }
          >
            {pad.loop ? "↻ Loop" : "Loop"}
          </button>
        </div>
      </div>
    </div>
  );
}
