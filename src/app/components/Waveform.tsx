import { useRef, useState } from "react";
import { useWaveform } from "../hooks/useWaveform";
import { Marker } from "../contexts/AudioEngineContext";
import { useVisualMode } from "../hooks/useVisualMode";
import { motion } from "motion/react";

interface WaveformProps {
  audioBuffer: AudioBuffer | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  pitch?: number;
  isSelected: boolean;
  markers: Marker[];
  onSeek: (time: number) => void;
  onMarkerClick: (markerId: string) => void;
}

export function Waveform({
  audioBuffer,
  isPlaying,
  currentTime,
  duration,
  pitch = 1,
  isSelected,
  markers,
  onSeek,
  onMarkerClick,
}: WaveformProps) {
  const { waveformData, progress } = useWaveform({
    audioBuffer,
    isPlaying,
    currentTime,
    duration,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { mono } = useVisualMode();
  const waveStroke = mono
    ? isSelected
      ? "#111111"
      : "#11111199"
    : isSelected
      ? "#ffffff"
      : "#ffffff40";
  const wavePlaceholder = mono ? "#11111140" : "#ffffff20";

  const handleSeek = (clientX: number) => {
    if (!containerRef.current || !audioBuffer) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const clickPercentage = x / rect.width;

    // Playhead is at 50% (center). Calculate what time the click represents
    // If user clicks at 50%, that's the current time (playhead)
    // If user clicks left of playhead, seek backward
    // If user clicks right of playhead, seek forward
    const offsetFromPlayhead = clickPercentage - 0.5; // -0.5 to 0.5
    const timeOffset = offsetFromPlayhead * duration;
    const newTime = currentTime + timeOffset;

    onSeek(newTime);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleSeek(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleSeek(e.clientX);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Generate SVG path from waveform data.
  // Path width = 300/pitch: at high pitch the waveform is compressed (skinnier),
  // at low pitch it is stretched (wider). Visual scroll speed stays constant.
  const generateWaveformPath = () => {
    if (waveformData.length === 0) return "";

    const height = 100;
    const pathWidth = 300 / pitch;
    const centerY = height / 2;
    const amplitude = 40;

    let path = "";
    waveformData.forEach((value, i) => {
      const x = (i / waveformData.length) * pathWidth;
      const y = centerY + value * amplitude * (i % 2 === 0 ? -1 : 1);
      path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    });
    return path;
  };

  // SVG-unit translation to keep the current playback position centred on x=150.
  // viewBox is 0 0 300 100, so centre = 150. Progress point is at x = progress*(300/pitch).
  // translateX = 150 - progress*(300/pitch) keeps it pinned at centre regardless of pitch.
  const gTranslateX = 150 - (progress * 300) / pitch;

  return (
    <div
      ref={containerRef}
      className="relative h-16 bg-black/20 rounded-sm overflow-hidden border border-white/5 cursor-pointer"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Waveform SVG - wider viewBox for more detail */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 300 100"
        preserveAspectRatio="none"
      >
        {waveformData.length > 0 ? (
          // motion.g uses raw SVG user units for x — no % ambiguity.
          // key={pitch} forces path remount on pitch change, preventing Motion from
          // morphing between different-length path strings (which caused the jump).
          <motion.g
            animate={{ x: gTranslateX }}
            transition={{ duration: 0.1, ease: "linear" }}
          >
            <path
              key={pitch}
              d={generateWaveformPath()}
              fill="none"
              stroke={waveStroke}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </motion.g>
        ) : (
          // Placeholder when no audio loaded
          <motion.line
            x1="0"
            y1="50"
            x2="100"
            y2="50"
            stroke={wavePlaceholder}
            strokeWidth="1"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 0.3 }}
            transition={{ duration: 1 }}
          />
        )}
      </svg>

      {/* Markers - visual only, clicking handled by buttons */}
      {markers.map((marker) => {
        // Offset from playhead (centre=50%) in container %, matching the gTranslateX formula.
        const markerPosition = 50 + ((marker.time / duration) - progress) * (100 / pitch);

        return (
          <div
            key={marker.id}
            className="absolute inset-y-0 w-0.5 bg-white/60 pointer-events-none z-10"
            style={{ left: `${markerPosition}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white/80 rounded-full"></div>
          </div>
        );
      })}

      {/* Central Playhead - Purple/Blue */}
      {audioBuffer && (
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 pointer-events-none z-20">
          {/* Subtle glow */}
          <div className={`absolute inset-0 ${mono ? "bg-black/20" : "bg-purple-500/30"} blur-[2px]`}></div>

          {/* Center line */}
          <div className={`absolute inset-0 left-1/2 -translate-x-1/2 w-px ${mono ? "bg-black/80" : "bg-purple-400/80"}`}></div>

          {/* Top indicator */}
          {isPlaying && (
            <motion.div
              className={`absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full ${mono ? "bg-black" : "bg-purple-400"}`}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}
        </div>
      )}
    </div>
  );
}
