import { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Upload, X, Loader2 } from "lucide-react";
import { isValidAudioFile, isFileSizeValid } from "../utils/audioUtils";

interface FileUploaderProps {
  onFileSelect: (file: File) => Promise<void>;
  onClear?: () => void;
  fileName?: string;
  isLoading?: boolean;
}

export function FileUploader({
  onFileSelect,
  onClear,
  fileName,
  isLoading = false,
}: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileValidation = (file: File): boolean => {
    setError(null);

    if (!isValidAudioFile(file)) {
      setError("Please upload MP3 or WAV files only");
      return false;
    }

    if (!isFileSizeValid(file)) {
      setError("File too large (max 50MB)");
      return false;
    }

    return true;
  };

  const handleFile = async (file: File) => {
    if (!handleFileValidation(file)) return;

    try {
      await onFileSelect(file);
      setError(null);
    } catch (err) {
      setError("Failed to load audio file");
    }
  };

  const handleClick = () => {
    if (fileName && !isLoading) {
      // If file already loaded, clear it
      if (onClear) {
        onClear();
      }
    } else {
      // Otherwise open file picker
      fileInputRef.current?.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      await handleFile(file);
    }
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.wav,audio/mpeg,audio/wav"
        onChange={handleFileInputChange}
        className="hidden"
      />

      <motion.div
        className="p-3 rounded-sm border border-dashed text-center text-xs cursor-pointer relative overflow-hidden"
        style={{
          borderColor: isDragging
            ? "rgba(255, 255, 255, 0.4)"
            : error
            ? "rgba(239, 68, 68, 0.5)"
            : "rgba(255, 255, 255, 0.1)",
        }}
        animate={{
          borderColor: isDragging
            ? "rgba(255, 255, 255, 0.4)"
            : error
            ? "rgba(239, 68, 68, 0.5)"
            : "rgba(255, 255, 255, 0.1)",
          backgroundColor: isDragging
            ? "rgba(255, 255, 255, 0.05)"
            : "rgba(0, 0, 0, 0)",
        }}
        whileHover={{
          borderColor: "rgba(255, 255, 255, 0.2)",
        }}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2 text-white/40"
            >
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Loading...</span>
            </motion.div>
          ) : fileName ? (
            <motion.div
              key="loaded"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-between gap-2"
            >
              <span className="text-white/70 truncate flex-1 text-left">
                {fileName}
              </span>
              <X className="w-3 h-3 text-white/40 hover:text-white/70 flex-shrink-0" />
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-red-400"
            >
              {error}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2 text-white/30"
            >
              <Upload className="w-3 h-3" />
              <span>Drop audio file or click to upload</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drag overlay */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/5 flex items-center justify-center pointer-events-none"
            >
              <span className="text-white/70 text-sm">Drop here</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
