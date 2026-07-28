import { GlassContainer } from "./GlassContainer";
import { FileUploader } from "./FileUploader";
import { AudioControls } from "./AudioControls";
import { Waveform } from "./Waveform";
import { motion, AnimatePresence } from "motion/react";
import { useAudioEngine } from "../contexts/AudioEngineContext";
import { formatTime } from "../utils/audioUtils";
import { X, Bookmark, SkipForward } from "lucide-react";

interface StemVisualizerProps {
  stemIndex: number;
  stemNumber: number;
  isSelected: boolean;
  onSelect: () => void;
}

export function StemVisualizer({
  stemIndex,
  stemNumber,
  isSelected,
  onSelect,
}: StemVisualizerProps) {
  const {
    stems,
    loadFile,
    clearFile,
    play,
    pause,
    setVolume,
    setPitch,
    seek,
    addMarker,
    removeMarker,
    seekToMarker,
    isLoading,
  } = useAudioEngine();

  const stem = stems[stemIndex];
  const hasFile = !!stem.audioBuffer;

  const handleFileSelect = async (file: File) => {
    await loadFile(stemIndex, file);
  };

  const handleClear = () => {
    clearFile(stemIndex);
  };

  const handlePlay = () => {
    play(stemIndex);
  };

  const handlePause = () => {
    pause(stemIndex);
  };

  const handleVolumeChange = (volume: number) => {
    setVolume(stemIndex, volume);
  };

  const handlePitchChange = (pitch: number) => {
    setPitch(stemIndex, pitch);
  };

  const handleSeek = (time: number) => {
    seek(stemIndex, time);
  };

  const handleAddMarker = () => {
    if (stem.markers.length < 4) {
      addMarker(stemIndex);
    }
  };

  const handleMarkerJump = (markerIndex: number) => {
    seekToMarker(stemIndex, markerIndex);
  };

  return (
    <GlassContainer
      className="transition-all"
      isSelected={isSelected}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 gap-2">
          <div
            className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
            onClick={onSelect}
          >
            <motion.div
              className={`w-6 h-6 rounded-sm flex items-center justify-center text-xs flex-shrink-0 ${
                isSelected
                  ? "bg-white/15 text-white/90"
                  : "bg-white/5 text-white/40"
              }`}
              animate={
                isSelected && stem.isPlaying
                  ? { scale: [1, 1.05, 1] }
                  : {}
              }
              transition={{ duration: 1, repeat: Infinity }}
            >
              {stemNumber}
            </motion.div>
            <div className="flex-1 min-w-0">
              {hasFile ? (
                <div className="flex items-baseline gap-2">
                  <div className="text-xs text-white/70 truncate flex-1">
                    {stem.fileName}
                  </div>
                  <div className="text-xs text-white/30 flex-shrink-0">
                    -
                    {formatTime(
                      stem.duration - stem.currentTime,
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className={`text-xs ${isSelected ? "text-white/90" : "text-white/50"}`}
                >
                  Stem {stemNumber}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {stem.detectedBpm && (
              <div className="text-right">
                <div className="text-[10px] font-mono text-white/50 tabular-nums">
                  {Math.round(stem.detectedBpm * stem.pitch)} <span className="text-white/25">bpm</span>
                </div>
                {stem.pitch !== 1.0 && (
                  <div className="text-[9px] font-mono text-white/25 text-right">
                    {stem.detectedBpm} orig
                  </div>
                )}
              </div>
            )}

            {/* Clear button when file loaded */}
            {hasFile && (
              <motion.button
                className="w-5 h-5 rounded-sm flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </div>
        </div>

        {/* File Uploader or Waveform */}
        {!hasFile ? (
          <div className="mb-3">
            <FileUploader
              onFileSelect={handleFileSelect}
              onClear={handleClear}
              fileName={stem.fileName}
              isLoading={isLoading}
            />
          </div>
        ) : (
          <div className="mb-3">
            <Waveform
              audioBuffer={stem.audioBuffer}
              isPlaying={stem.isPlaying}
              currentTime={stem.currentTime}
              duration={stem.duration}
              pitch={stem.pitch}
              isSelected={isSelected}
              markers={stem.markers}
              onSeek={handleSeek}
              onMarkerClick={() => {}}
            />
          </div>
        )}

        {/* Audio Controls */}
        {hasFile && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <AudioControls
              isPlaying={stem.isPlaying}
              volume={stem.volume}
              pitch={stem.pitch}
              detectedBpm={stem.detectedBpm}
              disabled={!hasFile}
              onPlay={handlePlay}
              onPause={handlePause}
              onVolumeChange={handleVolumeChange}
              onPitchChange={handlePitchChange}
            />

            {/* Marker Buttons */}
            <div className="flex gap-2">
              {[0, 1, 2, 3].map((index) => {
                const marker = stem.markers[index];
                const hasMarker = !!marker;

                return (
                  <div
                    key={index}
                    className="flex flex-col gap-1 flex-1"
                  >
                    <motion.button
                      className={`w-full py-1.5 px-1 rounded-sm flex flex-col items-center justify-center gap-1 text-xs ${
                        hasMarker
                          ? "bg-white/15 text-white/80 hover:bg-white/20"
                          : "bg-white/5 text-white/40 hover:bg-white/10"
                      }`}
                      onClick={() =>
                        hasMarker
                          ? handleMarkerJump(index)
                          : handleAddMarker()
                      }
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {hasMarker ? (
                        <>
                          <SkipForward className="w-3 h-3" />
                          <span className="text-[10px]">
                            {formatTime(marker.time)}
                          </span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3 h-3" />
                          <span className="text-[10px]">
                            {index + 1}
                          </span>
                        </>
                      )}
                    </motion.button>

                    {/* Separate X button below */}
                    {hasMarker && (
                      <motion.button
                        className="w-full py-1 rounded-sm bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white/90"
                        onClick={() =>
                          removeMarker(stemIndex, index)
                        }
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <X className="w-3 h-3" />
                      </motion.button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </GlassContainer>
  );
}