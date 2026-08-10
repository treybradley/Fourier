import { motion } from "motion/react";
import { Square, Play, Trash2, Volume2, VolumeX } from "lucide-react";
import type { LoopTrack as LoopTrackType, TrackStatus } from "../../contexts/LooperContext";
import { useLooper } from "../../contexts/LooperContext";

interface LoopTrackProps {
  track: LoopTrackType;
  isSelected: boolean;
  onSelect: () => void;
}

const STATUS_LABEL: Record<TrackStatus, string> = {
  empty: "EMPTY",
  recording: "REC",
  playing: "PLAY",
  overdubbing: "DUB",
  stopped: "STOP",
  pending: "WAIT",
};

const STATUS_COLOR: Record<TrackStatus, string> = {
  empty: "text-white/20",
  recording: "text-red-400",
  playing: "text-emerald-400",
  overdubbing: "text-amber-400",
  stopped: "text-white/40",
  pending: "text-sky-300",
};

const STATUS_DOT: Record<TrackStatus, string> = {
  empty: "bg-white/15",
  recording: "bg-red-400",
  playing: "bg-emerald-400",
  overdubbing: "bg-amber-400",
  stopped: "bg-white/25",
  pending: "bg-sky-400",
};

// Colors pulled from the Surge gradient palette (teal → deep blue) + complementary cyans
const TRACK_ACCENT = [
  "border-l-[#00EBB8]/60",  // electric teal  — Surge start
  "border-l-[#00ACDF]/60",  // cerulean sky   — Cerulean mid
  "border-l-[#0086CB]/60",  // ocean blue     — Cerulean mid-dark
  "border-l-[#6EE7D0]/55",  // soft mint      — Surge teal tint
  "border-l-[#0059CE]/65",  // Lunar Sky blue — links to stem collage
];

const TRACK_GLOW = [
  "shadow-[#00EBB8]/12",
  "shadow-[#00ACDF]/12",
  "shadow-[#0086CB]/12",
  "shadow-[#6EE7D0]/10",
  "shadow-[#0059CE]/12",
];

export function LoopTrack({ track, isSelected, onSelect }: LoopTrackProps) {
  const { tracks, recordStop, stopTrack, playTrack, clearTrack, clearAll, setTrackVolume, toggleMute } = useLooper();

  // If this is the last track with content, clearing it resets everything (BPM, loop length, etc.)
  const nonEmptyCount = tracks.filter((t) => t.status !== "empty").length;
  const handleClear = () => {
    if (nonEmptyCount <= 1) clearAll();
    else clearTrack(track.id);
  };
  const isActive = track.status === "recording" || track.status === "overdubbing";
  const isPending = track.status === "pending";
  const hasAudio = !!track.audioBuffer;

  return (
    <motion.div
      className={`
        relative rounded-sm border border-white/8 border-l-2 ${TRACK_ACCENT[track.id]}
        bg-white/[0.03] backdrop-blur-sm transition-all duration-200
        ${isSelected ? `shadow-lg ${TRACK_GLOW[track.id]} bg-white/[0.05]` : ""}
        ${isActive ? "border-white/15" : ""}
      `}
      onClick={onSelect}
      animate={isActive ? { boxShadow: ["0 0 0px rgba(255,0,0,0)", "0 0 12px rgba(255,80,80,0.15)", "0 0 0px rgba(255,0,0,0)"] } : {}}
      transition={isActive ? { duration: 1, repeat: Infinity } : {}}
    >
      <div className="flex items-center gap-1.5 sm:gap-3 px-2 sm:px-4 py-3">

        {/* Track number + status */}
        <div className="flex flex-col items-center gap-1 w-6 sm:w-8 flex-shrink-0">
          <div
            className={`text-[10px] font-mono font-medium ${
              isSelected ? "text-white/80" : "text-white/30"
            }`}
          >
            {track.id + 1}
          </div>
          <div
            className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[track.status]} ${
              isActive || isPending ? "animate-pulse" : ""
            }`}
          />
        </div>

        {/* Waveform — desktop only (mobile needs the horizontal room) */}
        <div className="hidden sm:block flex-1 min-w-0 h-10 relative">
          {hasAudio ? (
            <WaveformDisplay buffer={track.audioBuffer!} status={track.status} trackId={track.id} />
          ) : (
            <div className="h-full flex items-center">
              <div className="w-full h-px bg-white/8" />
            </div>
          )}
        </div>

        {/* Status label — grows on mobile to fill leftover width */}
        <div
          className={`text-[10px] font-mono tracking-wider flex-1 min-w-[2.5rem] truncate text-left sm:flex-none sm:w-10 sm:max-w-none sm:text-right flex-shrink-0 ${STATUS_COLOR[track.status]}`}
          title={STATUS_LABEL[track.status]}
        >
          {STATUS_LABEL[track.status]}
        </div>

        {/* Duration — desktop only */}
        <div className="hidden sm:block text-[10px] font-mono text-white/25 w-12 text-right flex-shrink-0">
          {hasAudio ? `${track.duration.toFixed(1)}s` : "—"}
        </div>

        {/* Volume slider */}
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={track.volume}
          onChange={(e) => {
            e.stopPropagation();
            setTrackVolume(track.id, parseFloat(e.target.value));
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-14 min-w-[3.5rem] sm:w-16 flex-shrink-0 accent-white/60 h-1 cursor-pointer"
          style={{ accentColor: "rgba(255,255,255,0.5)" }}
        />

        {/* Controls */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Mute */}
          <ControlBtn
            onClick={() => toggleMute(track.id)}
            active={track.isMuted}
            title={track.isMuted ? "Unmute" : "Mute"}
          >
            {track.isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
          </ControlBtn>

          {/* Play / Stop / Cancel wait */}
          {track.status === "playing" ||
          track.status === "overdubbing" ||
          track.status === "pending" ? (
            <ControlBtn
              onClick={() => stopTrack(track.id)}
              title={track.status === "pending" ? "Cancel wait" : "Stop"}
            >
              <Square className="w-3 h-3" />
            </ControlBtn>
          ) : (
            <ControlBtn
              onClick={() => playTrack(track.id)}
              disabled={!hasAudio}
              title="Play (quantized to loop)"
            >
              <Play className="w-3 h-3" />
            </ControlBtn>
          )}

          {/* Clear */}
          <ControlBtn
            onClick={handleClear}
            disabled={track.status === "empty"}
            title={nonEmptyCount <= 1 ? "Clear all" : "Clear track"}
            danger
          >
            <Trash2 className="w-3 h-3" />
          </ControlBtn>
        </div>

        {/* Record button */}
        <motion.button
          className={`
            w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
            border transition-all duration-150
            ${track.status === "recording"
              ? "bg-red-500/80 border-red-400/80 text-white"
              : track.status === "overdubbing"
              ? "bg-amber-500/80 border-amber-400/80 text-white"
              : isSelected
              ? "bg-white/10 border-white/25 text-white/70 hover:bg-white/15 hover:border-white/40"
              : "bg-white/5 border-white/10 text-white/30"
            }
          `}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
            recordStop(track.id);
          }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          title="Record / Stop recording"
        >
          <div
            className={`rounded-full ${
              isActive ? "w-3 h-3 rounded-sm bg-white" : "w-3 h-3 bg-current rounded-full"
            }`}
          />
        </motion.button>
      </div>
    </motion.div>
  );
}

function ControlBtn({
  children,
  onClick,
  disabled,
  active,
  danger,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
  title?: string;
}) {
  return (
    <motion.button
      className={`
        w-6 h-6 rounded-sm flex items-center justify-center transition-colors
        ${disabled
          ? "text-white/15 cursor-not-allowed"
          : danger
          ? "text-white/30 hover:text-red-400 hover:bg-red-500/10"
          : active
          ? "text-white/80 bg-white/15"
          : "text-white/40 hover:text-white/70 hover:bg-white/8"
        }
      `}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.1 }}
      whileTap={disabled ? {} : { scale: 0.9 }}
      title={title}
    >
      {children}
    </motion.button>
  );
}

function WaveformDisplay({
  buffer,
  status,
  trackId,
}: {
  buffer: AudioBuffer;
  status: TrackStatus;
  trackId: number;
}) {
  const data = buffer.getChannelData(0);
  const samples = 80;
  const blockSize = Math.floor(data.length / samples);
  const points: number[] = [];

  for (let i = 0; i < samples; i++) {
    let max = 0;
    for (let j = 0; j < blockSize; j++) {
      max = Math.max(max, Math.abs(data[i * blockSize + j] ?? 0));
    }
    points.push(max);
  }

  const COLORS = ["#8b5cf6", "#38bdf8", "#34d399", "#fbbf24", "#fb7185"];
  const color = COLORS[trackId] ?? "#ffffff";
  const isActive = status === "playing" || status === "overdubbing" || status === "pending";
  const opacity = status === "pending" ? 0.5 : isActive ? 0.7 : 0.35;

  return (
    <svg viewBox={`0 0 ${samples} 1`} preserveAspectRatio="none" className="w-full h-full">
      {points.map((v, i) => (
        <rect
          key={i}
          x={i}
          y={(1 - v) / 2}
          width={0.7}
          height={v}
          fill={color}
          opacity={opacity}
        />
      ))}
    </svg>
  );
}
