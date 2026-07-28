import { Play, Pause, Volume2, Music } from "lucide-react";
import { motion } from "motion/react";
import * as Slider from "@radix-ui/react-slider";

interface AudioControlsProps {
  isPlaying: boolean;
  volume: number; // 0-2
  pitch: number; // 0.5-2
  detectedBpm?: number | null;
  disabled?: boolean;
  onPlay: () => void;
  onPause: () => void;
  onVolumeChange: (volume: number) => void;
  onPitchChange: (pitch: number) => void;
}

export function AudioControls({
  isPlaying,
  volume,
  pitch,
  detectedBpm,
  disabled = false,
  onPlay,
  onPause,
  onVolumeChange,
  onPitchChange,
}: AudioControlsProps) {
  return (
    <div className="space-y-3">
      {/* Play/Pause Button */}
      <motion.button
        className={`w-full py-2 px-4 rounded-sm flex items-center justify-center gap-2 text-sm ${
          disabled
            ? "bg-white/5 text-white/20 cursor-not-allowed"
            : isPlaying
            ? "bg-white/15 text-white/90"
            : "bg-white/10 text-white/70 hover:bg-white/15"
        }`}
        onClick={isPlaying ? onPause : onPlay}
        disabled={disabled}
        whileHover={disabled ? {} : { scale: 1.02 }}
        whileTap={disabled ? {} : { scale: 0.98 }}
      >
        {isPlaying ? (
          <>
            <Pause className="w-4 h-4" />
            Pause
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Play
          </>
        )}
      </motion.button>

      {/* Volume Control */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-white/50">
            <Volume2 className="w-3 h-3" />
            <span>Volume</span>
          </div>
          <span className="text-white/40">{Math.round(volume * 100)}%</span>
        </div>

        <Slider.Root
          className="relative flex items-center select-none touch-none w-full h-5"
          value={[volume]}
          onValueChange={(values) => onVolumeChange(values[0])}
          max={2}
          min={0}
          step={0.01}
          disabled={disabled}
        >
          <Slider.Track className="bg-white/10 relative grow rounded-full h-1">
            <Slider.Range className="absolute bg-white/40 rounded-full h-full" />
          </Slider.Track>
          <Slider.Thumb
            className="block w-3 h-3 bg-white rounded-full hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Volume"
          />
        </Slider.Root>
      </div>

      {/* Pitch Control */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-white/50">
            <Music className="w-3 h-3" />
            <span>Pitch</span>
          </div>
          <span className="text-white/40">
            {detectedBpm ? `${Math.round(detectedBpm * pitch)} BPM` : `${Math.round(pitch * 100)}%`}
          </span>
        </div>

        <Slider.Root
          className="relative flex items-center select-none touch-none w-full h-5"
          value={[pitch]}
          onValueChange={(values) => onPitchChange(values[0])}
          max={2}
          min={0.5}
          step={0.01}
          disabled={disabled}
        >
          <Slider.Track className="bg-white/10 relative grow rounded-full h-1">
            <Slider.Range className="absolute bg-white/40 rounded-full h-full" />
          </Slider.Track>
          <Slider.Thumb
            className="block w-3 h-3 bg-white rounded-full hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Pitch"
          />
        </Slider.Root>
      </div>
    </div>
  );
}
