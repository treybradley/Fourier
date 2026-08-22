import { useRef, useState } from "react";
import { motion } from "motion/react";
import { useStemSeparatorContext } from "../../contexts/StemSeparatorContext";
import { formatTime } from "../../utils/audioUtils";
import { useVisualMode } from "../../hooks/useVisualMode";

export function StemSeparatorUpload() {
  const { sourceFile, sourceBuffer, stage, error, loadFile, startSeparation, reset } =
    useStemSeparatorContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { mono } = useVisualMode();
  const accent = mono ? "#111111" : "#00FDD9";

  const handleFiles = (files: FileList | null) => {
    if (files?.[0]) loadFile(files[0]);
  };

  const hasFile = !!sourceBuffer;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      {/* Drop zone */}
      <motion.div
        className={`
          relative w-full max-w-md rounded-sm border-2 border-dashed transition-all duration-200 p-10
          flex flex-col items-center justify-center gap-4 cursor-pointer
          ${isDragging
            ? mono
              ? "border-black/50 bg-black/[0.06]"
              : "border-[#00FDD9]/70 bg-[#00FDD9]/[0.06]"
            : hasFile
            ? mono
              ? "border-black/40 bg-black/[0.04]"
              : "border-[#00FDD9]/40 bg-[#00FDD9]/[0.03]"
            : "border-white/15 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]"
          }
        `}
        onClick={() => !hasFile && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".mp3,.wav,audio/mpeg,audio/wav"
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />

        {!hasFile ? (
          <>
            {/* Waveform icon */}
            <svg width="48" height="32" viewBox="0 0 48 32" fill="none" className="opacity-30">
              <rect x="0" y="12" width="4" height="8" rx="2" fill="currentColor" />
              <rect x="6" y="8" width="4" height="16" rx="2" fill="currentColor" />
              <rect x="12" y="4" width="4" height="24" rx="2" fill="currentColor" />
              <rect x="18" y="0" width="4" height="32" rx="2" fill="currentColor" />
              <rect x="24" y="4" width="4" height="24" rx="2" fill="currentColor" />
              <rect x="30" y="8" width="4" height="16" rx="2" fill="currentColor" />
              <rect x="36" y="10" width="4" height="12" rx="2" fill="currentColor" />
              <rect x="42" y="13" width="4" height="6" rx="2" fill="currentColor" />
            </svg>
            <div className="text-center">
              <p className="text-white/60 text-sm font-mono tracking-wider">
                {stage === "uploading" ? "Decoding…" : "Drop audio here"}
              </p>
              <p className="text-white/25 text-[10px] font-mono mt-1">MP3 or WAV · max 50 MB</p>
            </div>
            {stage !== "uploading" && (
              <span className="text-[10px] font-mono tracking-widest uppercase text-white/30 border border-white/10 px-3 py-1 rounded-sm">
                Browse
              </span>
            )}
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: mono ? "rgba(0,0,0,0.08)" : "rgba(0,253,217,0.15)" }}>
              <svg className="w-4 h-4" style={{ color: accent }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="15" r="3" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-white/80 text-sm font-mono tracking-wide truncate max-w-[260px]">
                {sourceFile?.name}
              </p>
              <p className="text-white/30 text-[10px] font-mono mt-0.5">
                {formatTime(sourceBuffer.duration)} · {sourceBuffer.sampleRate / 1000} kHz · {sourceBuffer.numberOfChannels}ch
              </p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); reset(); }}
              className="text-[9px] font-mono tracking-widest uppercase text-white/25 hover:text-white/50 transition-colors"
            >
              Remove
            </button>
          </>
        )}
      </motion.div>

      {/* Error */}
      {error && (
        <p className="text-red-400/70 text-[10px] font-mono text-center">{error}</p>
      )}

      {/* Separate button */}
      {hasFile && (
        <motion.button
          className="flex items-center gap-2 px-8 py-3 rounded-sm border text-xs font-mono tracking-widest uppercase transition-all duration-200 text-white/80 hover:text-white"
          style={{
            borderColor: mono ? "rgba(0,0,0,0.45)" : "rgba(0,253,217,0.45)",
            background: mono ? "rgba(0,0,0,0.08)" : "rgba(0,253,217,0.08)",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = mono ? "rgba(0,0,0,0.7)" : "rgba(0,253,217,0.75)";
            (e.currentTarget as HTMLButtonElement).style.background = mono ? "rgba(0,0,0,0.14)" : "rgba(0,253,217,0.14)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = mono ? "rgba(0,0,0,0.45)" : "rgba(0,253,217,0.45)";
            (e.currentTarget as HTMLButtonElement).style.background = mono ? "rgba(0,0,0,0.08)" : "rgba(0,253,217,0.08)";
          }}
          onClick={startSeparation}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Separate stems
        </motion.button>
      )}

      {/* Disclaimer */}
      <p className="text-white/45 text-[9px] font-mono text-center max-w-xs leading-relaxed">
        Runs entirely in your browser · ~2–4 min per track · Models cached after first download
      </p>
    </div>
  );
}
