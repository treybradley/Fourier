import { useCallback, useRef, useState } from "react";
import { useVisualMode } from "../../hooks/useVisualMode";

interface ImportZoneProps {
  onFiles: (files: FileList | File[]) => void;
  compact?: boolean;
}

const ACCENT = "#EB00F7";

export function ImportZone({ onFiles, compact = false }: ImportZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mono } = useVisualMode();

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) onFiles(e.dataTransfer.files);
    },
    [onFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleClick = useCallback(() => inputRef.current?.click(), []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) onFiles(e.target.files);
      e.target.value = "";
    },
    [onFiles]
  );

  if (compact) {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.flac,.aac,.ogg,.m4a"
          multiple
          className="hidden"
          onChange={handleChange}
        />
        <button
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-[10px] font-mono tracking-widest uppercase transition-all"
          style={{
            borderColor: isDragging
              ? mono
                ? "rgba(0,0,0,0.55)"
                : ACCENT
              : mono
                ? "rgba(0,0,0,0.25)"
                : "rgba(255,255,255,0.15)",
            color: isDragging
              ? mono
                ? "#111111"
                : ACCENT
              : mono
                ? "rgba(0,0,0,0.55)"
                : "rgba(255,255,255,0.45)",
            background: isDragging
              ? mono
                ? "rgba(0,0,0,0.06)"
                : `${ACCENT}12`
              : "transparent",
          }}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add tracks
        </button>
      </>
    );
  }

  const idleBorder = mono ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.18)";
  const activeBorder = mono ? "rgba(0,0,0,0.55)" : ACCENT;
  const idleBg = mono ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)";
  const activeBg = mono ? "rgba(0,0,0,0.08)" : `${ACCENT}0A`;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.flac,.aac,.ogg,.m4a"
        multiple
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        className="w-full flex flex-col items-center justify-center gap-4 rounded-sm border-2 border-dashed cursor-pointer transition-all px-8 py-8 text-left"
        style={{
          borderColor: isDragging ? activeBorder : idleBorder,
          background: isDragging ? activeBg : idleBg,
        }}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <span
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm border text-[11px] font-mono tracking-widest uppercase"
          style={{
            borderColor: mono ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.25)",
            background: mono ? "#111111" : "rgba(255,255,255,0.08)",
            color: mono ? "#ffffff" : "rgba(255,255,255,0.85)",
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {isDragging ? "Drop to import" : "Import audio files"}
        </span>

        <div className="text-center space-y-1">
          <p
            className="text-[10px] font-mono"
            style={{ color: mono ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.35)" }}
          >
            drag & drop or click to browse · MP3, WAV, FLAC, AAC
          </p>
          <p
            className="text-[9px] font-mono tracking-wider uppercase"
            style={{ color: mono ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.15)" }}
          >
            Arc analyzes BPM, key, energy, and more
          </p>
        </div>
      </button>
    </>
  );
}
