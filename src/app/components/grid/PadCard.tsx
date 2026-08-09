import { useEffect, useRef, type Dispatch } from "react";
import type { Pad, GridAction } from "./types";
import { PAD_KEYS } from "./types";

const ACCENT_A = "#FFF047";
const ACCENT_B = "#62FF00";

interface PadCardProps {
  pad: Pad;
  isSelected: boolean;
  isActive: boolean;
  dispatch: Dispatch<GridAction>;
  onTrigger: (padId: number) => void;
  onDropFile: (padId: number, file: File) => void;
}

export function PadCard({
  pad,
  isSelected,
  isActive,
  dispatch,
  onTrigger,
  onDropFile,
}: PadCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasContent = !!pad.buffer;

  useEffect(() => {
    if (!pad.buffer || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const W = canvas.offsetWidth || 100;
    const H = canvas.offsetHeight || 32;
    const dpr = window.devicePixelRatio;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const data = pad.buffer.getChannelData(0);
    const step = Math.ceil(data.length / W);
    ctx.strokeStyle = ACCENT_A;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < W; x++) {
      let max = 0;
      for (let j = 0; j < step; j++) {
        const v = Math.abs(data[x * step + j] ?? 0);
        if (v > max) max = v;
      }
      const h = max * H * 0.4;
      ctx.moveTo(x + 0.5, H / 2 - h);
      ctx.lineTo(x + 0.5, H / 2 + h);
    }
    ctx.stroke();
  }, [pad.buffer]);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) onDropFile(pad.id, file);
    else {
      const text = e.dataTransfer.getData("text/plain");
      if (text) {
        dispatch({ type: "SELECT_PAD", padId: pad.id });
      }
    }
  }

  const borderColor = isSelected
    ? ACCENT_B
    : isActive
      ? ACCENT_A
      : hasContent
        ? `${ACCENT_A}50`
        : "rgba(255,255,255,0.08)";

  const bgColor = isActive
    ? `${ACCENT_A}18`
    : isSelected
      ? `${ACCENT_B}10`
      : hasContent
        ? "rgba(255,255,255,0.04)"
        : "rgba(255,255,255,0.02)";

  return (
    <button
      className="relative flex flex-col justify-between p-2 rounded-[10px] border overflow-hidden transition-all duration-100 cursor-pointer group text-left w-full h-full min-h-[72px]"
      style={{ borderColor, background: bgColor }}
      onClick={() => {
        dispatch({ type: "SELECT_PAD", padId: pad.id });
        if (hasContent) onTrigger(pad.id);
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isActive && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[10px]"
          style={{
            boxShadow: `0 0 16px ${ACCENT_A}40 inset`,
            background: `${ACCENT_A}08`,
          }}
        />
      )}

      <div className="flex-1 min-h-0 w-full overflow-hidden">
        {pad.buffer ? (
          <canvas
            ref={canvasRef}
            className="w-full"
            style={{ height: "36px" }}
          />
        ) : (
          <div className="w-full h-9 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white/15 group-hover:text-white/25 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
        )}
      </div>

      <div className="flex items-end justify-between mt-1 gap-1">
        <span className="text-[8px] font-mono text-white/35 truncate leading-tight flex-1">
          {pad.fileName
            ? pad.fileName.replace(
                /\.(mp3|wav|ogg|flac|m4a)$/i,
                "",
              )
            : "––"}
        </span>
        <span
          className="text-[8px] font-mono shrink-0 leading-none px-1 py-0.5 rounded border"
          style={{
            color: hasContent
              ? ACCENT_A
              : "rgba(255,255,255,0.15)",
            borderColor: hasContent
              ? `${ACCENT_A}40`
              : "rgba(255,255,255,0.08)",
            background: hasContent
              ? `${ACCENT_A}10`
              : "transparent",
          }}
        >
          {PAD_KEYS[pad.id]}
        </span>
      </div>
    </button>
  );
}
