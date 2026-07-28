import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
} from "react";
import type { Pad, GridAction } from "./types";
import { parseYouTubeVideoId } from "./types";
import { useGridRecorder } from "./useGridRecorder";

const ACCENT_A = "#62FF00";
const ACCENT_B = "#FBFF00";

interface SampleInspectorProps {
  pad: Pad | null;
  dispatch: Dispatch<GridAction>;
  getAudioCtx: () => AudioContext | null;
  onRecord: (padId: number, buffer: AudioBuffer) => void;
  onLoadYoutube: (padId: number, videoId: string) => void;
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
      Math.max(
        0,
        Math.min(center - newWidth / 2, 1 - newWidth),
      ),
    );
  }

  function zoomOut() {
    const newZoom = Math.max(zoom / 2, 1);
    const newWidth = 1 / newZoom;
    const center = clampedViewStart + viewWidth / 2;
    setZoom(newZoom);
    setViewStart(
      Math.max(
        0,
        Math.min(center - newWidth / 2, 1 - newWidth),
      ),
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
    const startSample = Math.floor(
      clampedViewStart * data.length,
    );
    const endSample = Math.floor(viewEnd * data.length);
    const visibleSamples = Math.max(1, endSample - startSample);
    const step = Math.max(1, Math.ceil(visibleSamples / W));

    ctx.strokeStyle = ACCENT_A;
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

    // Trim markers — only draw if within view
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = ACCENT_B;
    const markers = [trimStart, trimEnd];
    markers.forEach((pos) => {
      if (pos < clampedViewStart || pos > viewEnd) return;
      const x = ((pos - clampedViewStart) / viewWidth) * W;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    });

    // Off-screen marker arrows
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = ACCENT_B;
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
  ]);

  return (
    <div className="select-none flex flex-col gap-1">
      {/* Zoom controls row */}
      <div className="flex items-center justify-end gap-1 px-[6px] py-[6px]">
        {zoom > 1 && (
          <span
            className="text-[7px] font-mono mr-auto"
            style={{ color: "rgba(255,255,255,0.30)" }}
          >
            {zoom}×
          </span>
        )}
        <button
          onClick={zoomOut}
          disabled={zoom <= 1}
          className="w-5 h-5 flex items-center justify-center rounded-sm text-[10px] font-mono transition-colors border"
          style={{
            color:
              zoom <= 1 ? "rgba(255,255,255,0.15)" : ACCENT_A,
            borderColor:
              zoom <= 1
                ? "rgba(255,255,255,0.06)"
                : `${ACCENT_A}40`,
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
              zoom >= 32 ? "rgba(255,255,255,0.15)" : ACCENT_A,
            borderColor:
              zoom >= 32
                ? "rgba(255,255,255,0.06)"
                : `${ACCENT_A}40`,
          }}
        >
          +
        </button>
      </div>
      {/* Waveform canvas */}
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
      {/* View scrubber when zoomed */}
      {zoom > 1 && (
        <div
          className="mt-0.5 h-0.5 w-full rounded-full"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              background: ACCENT_A,
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
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-mono tracking-wider text-white/30 uppercase w-12 shrink-0">
        {label}
      </span>
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
            "--thumb-color": ACCENT_A,
            "--track-bg": `linear-gradient(to right, ${ACCENT_A} ${((value - min) / (max - min)) * 100}%, rgba(181,209,0,0.20) ${((value - min) / (max - min)) * 100}%)`,
          } as React.CSSProperties
        }
      />
      <span className="text-[9px] font-mono text-white/40 w-9 text-right tabular-nums shrink-0">
        {format(value)}
      </span>
    </div>
  );
}

export function SampleInspector({
  pad,
  dispatch,
  getAudioCtx,
  onRecord,
  onLoadYoutube,
}: SampleInspectorProps) {
  const { isRecording, startRecording, stopRecording } =
    useGridRecorder();
  const [ytInput, setYtInput] = useState("");
  const [ytError, setYtError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const isYt = pad.source.type === "youtube";
  const ytSource =
    pad.source.type === "youtube" ? pad.source : null;

  function handleRecord() {
    const audioCtx = getAudioCtx();
    if (!audioCtx) return;
    if (isRecording) {
      stopRecording(audioCtx).then((buf) => {
        if (buf) onRecord(pad!.id, buf);
      });
    } else {
      startRecording();
    }
  }

  function handleYtSubmit() {
    setYtError("");
    const id = parseYouTubeVideoId(ytInput.trim());
    if (!id) {
      setYtError("Invalid YouTube URL");
      return;
    }
    onLoadYoutube(pad.id, id);
    setYtInput("");
  }

  function handleFileClick() {
    fileInputRef.current?.click();
  }

  return (
    <div className="h-full flex flex-col gap-3 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: isYt ? "#FF0000" : ACCENT_A }}
          />
          <span className="text-[9px] font-mono tracking-widest uppercase text-white/40">
            {isYt
              ? "YouTube Pad"
              : pad.buffer
                ? "Audio Pad"
                : "Empty Pad"}{" "}
            · {pad.id + 1}
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

      {/* Waveform (audio pads only) */}
      {pad.buffer && !isYt && (
        <div className="flex-shrink-0 rounded-sm overflow-hidden bg-black/20">
          <WaveformCanvas
            buffer={pad.buffer}
            trimStart={pad.trimStart}
            trimEnd={pad.trimEnd}
          />
        </div>
      )}

      {/* YouTube thumbnail + info */}
      {isYt && ytSource && (
        <div className="flex-shrink-0 rounded-sm overflow-hidden bg-black/30 relative">
          <img
            src={`https://img.youtube.com/vi/${ytSource.videoId}/mqdefault.jpg`}
            alt="YouTube thumbnail"
            className="w-full object-cover opacity-60"
            style={{ height: "72px" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-8 h-8 opacity-80"
              viewBox="0 0 24 24"
              fill="#FF0000"
            >
              <path d="M23.5 6.2a3.01 3.01 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3.01 3.01 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3.01 3.01 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3.01 3.01 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8z" />
              <polygon
                points="9.6,15.6 15.8,12 9.6,8.4"
                fill="white"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Source section */}
      <div className="flex-shrink-0 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-white/8" />
          <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest">
            Source
          </span>
          <div className="flex-1 h-px bg-white/8" />
        </div>

        {/* Load audio file */}
        <div className="flex gap-1.5">
          <button
            onClick={handleFileClick}
            className="flex-1 py-1.5 text-[9px] font-mono tracking-wider text-white/40 hover:text-white/70 border border-white/10 hover:border-white/20 rounded-sm transition-colors"
          >
            Load file
          </button>
          <button
            onClick={handleRecord}
            className="flex-1 py-1.5 text-[9px] font-mono tracking-wider rounded-sm border transition-all duration-150"
            style={
              isRecording
                ? {
                    color: ACCENT_A,
                    borderColor: `${ACCENT_A}60`,
                    background: `${ACCENT_A}18`,
                  }
                : {
                    color: "rgba(255,255,255,0.40)",
                    borderColor: "rgba(255,255,255,0.10)",
                  }
            }
          >
            {isRecording ? "● Stop" : "Rec"}
          </button>
        </div>
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

        {/* YouTube URL */}
        <div className="space-y-1">
          <div className="flex gap-1">
            <input
              type="text"
              placeholder="YouTube URL or ID"
              value={ytInput}
              onChange={(e) => setYtInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleYtSubmit();
              }}
              className="flex-1 text-[9px] font-mono text-white/60 bg-white/5 border border-white/10 rounded-sm px-2 py-1.5 focus:outline-none focus:border-white/25 placeholder:text-white/20"
            />
            <button
              onClick={handleYtSubmit}
              className="px-2 py-1 text-[9px] font-mono rounded-sm border border-white/10 hover:border-white/20 text-white/40 hover:text-white/70 transition-colors"
            >
              Add
            </button>
          </div>
          {ytError && (
            <p className="text-[8px] font-mono text-red-400/70">
              {ytError}
            </p>
          )}
        </div>

        {/* Cue time for YouTube pads */}
        {isYt && ytSource && (
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-white/30 uppercase tracking-wider w-12 shrink-0">
              Cue
            </span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={ytSource.cueTime}
              onChange={(e) =>
                dispatch({
                  type: "UPDATE_YT_CUE",
                  padId: pad.id,
                  cueTime: Math.max(0, Number(e.target.value)),
                })
              }
              className="w-16 text-[9px] font-mono text-white/60 bg-white/5 border border-white/10 rounded-sm px-2 py-1 focus:outline-none focus:border-white/25"
            />
            <span className="text-[9px] font-mono text-white/25">
              s
            </span>
          </div>
        )}
      </div>

      {/* Audio controls (audio pads only) */}
      {!isYt && (
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
          <Slider
            label="Speed"
            value={pad.speed}
            min={0.25}
            max={4}
            step={0.01}
            format={(v) => `${v.toFixed(2)}×`}
            onChange={(v) =>
              dispatch({
                type: "UPDATE_PAD_PARAM",
                padId: pad.id,
                param: "speed",
                value: v,
              })
            }
          />
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

          {/* Reverse + Loop toggles */}
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
                      color: ACCENT_B,
                      borderColor: `${ACCENT_B}60`,
                      background: `${ACCENT_B}18`,
                    }
                  : {
                      color: "rgba(255,255,255,0.35)",
                      borderColor: "rgba(255,255,255,0.10)",
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
                      color: ACCENT_A,
                      borderColor: `${ACCENT_A}60`,
                      background: `${ACCENT_A}18`,
                    }
                  : {
                      color: "rgba(255,255,255,0.35)",
                      borderColor: "rgba(255,255,255,0.10)",
                    }
              }
            >
              {pad.loop ? "↻ Loop" : "Loop"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}