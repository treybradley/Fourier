import { useCallback, useRef, useState } from "react";

interface ImportZoneProps {
  onFiles: (files: FileList | File[]) => void;
  compact?: boolean;
}

const ACCENT = "#EB00F7";
const ACCENT2 = "#009DFF";

export function ImportZone({ onFiles, compact = false }: ImportZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
            borderColor: isDragging ? ACCENT : "rgba(255,255,255,0.15)",
            color: isDragging ? ACCENT : "rgba(255,255,255,0.45)",
            background: isDragging ? `${ACCENT}12` : "transparent",
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
      <div
        className="flex flex-col items-center justify-center gap-5 rounded-sm border-2 border-dashed cursor-pointer transition-all p-10"
        style={{
          borderColor: isDragging ? ACCENT : "rgba(255,255,255,0.08)",
          background: isDragging ? `${ACCENT}0A` : "rgba(255,255,255,0.015)",
        }}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >

        <div className="text-center space-y-1.5">
          <p className="text-white/60 text-sm font-medium">
            {isDragging ? "Drop to import" : "Import audio files"}
          </p>
          <p className="text-white/25 text-[10px] font-mono">
            drag & drop or click to browse · MP3, WAV, FLAC, AAC
          </p>
        </div>

        <p className="text-[9px] font-mono text-white/15 tracking-wider uppercase">
          Arc analyzes BPM, key, energy, and more
        </p>
      </div>
    </>
  );
}
