import { useMemo, useRef } from "react";
import { useHarmonizer } from "../../contexts/HarmonizerContext";
import { useVisualMode } from "../../hooks/useVisualMode";

function peaksFromBuffer(buffer: AudioBuffer, bars = 48): number[] {
  const data = buffer.getChannelData(0);
  const block = Math.max(1, Math.floor(data.length / bars));
  const peaks: number[] = [];
  for (let i = 0; i < bars; i++) {
    let max = 0;
    const start = i * block;
    for (let j = 0; j < block && start + j < data.length; j++) {
      max = Math.max(max, Math.abs(data[start + j]));
    }
    peaks.push(max);
  }
  return peaks;
}

interface HarmonizerTrackCardProps {
  trackId: 0 | 1 | 2;
  selected: boolean;
  onSelect: () => void;
}

export function HarmonizerTrackCard({
  trackId,
  selected,
  onSelect,
}: HarmonizerTrackCardProps) {
  const {
    tracks,
    recordingTrack,
    startMicRecord,
    stopMicRecord,
    loadAudioFile,
    loadVideoFile,
    setTrackVolume,
    setHarmonyMix,
    toggleMute,
    clearTrack,
  } = useHarmonizer();
  const { mono, ink } = useVisualMode();

  const track = tracks[trackId];
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const isRecording = recordingTrack === trackId;

  const peaks = useMemo(
    () => (track.rootBuffer ? peaksFromBuffer(track.rootBuffer) : []),
    [track.rootBuffer],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className="rounded-sm border p-3 flex flex-col gap-2 text-left transition-colors cursor-pointer"
      style={
        selected
          ? {
              borderColor: mono ? "rgba(0,0,0,0.4)" : "rgba(255,77,109,0.45)",
              background: mono ? "rgba(0,0,0,0.06)" : "rgba(255,77,109,0.08)",
            }
          : {
              borderColor: ink(0.1),
              background: ink(0.03),
            }
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] tracking-widest uppercase text-white/70">
          Track {trackId + 1}
        </span>
        <span className="font-mono text-[9px] tracking-wider uppercase text-white/30">
          {track.source === "empty" ? "empty" : track.source}
        </span>
      </div>

      <div className="h-8 flex items-end gap-px">
        {peaks.length === 0 ? (
          <div className="w-full h-px bg-white/10 self-center" />
        ) : (
          peaks.map((p, i) => (
            <div
              key={i}
              className="flex-1 rounded-[1px]"
              style={{
                height: `${Math.max(8, p * 100)}%`,
                background: selected
                  ? mono
                    ? "rgba(0,0,0,0.75)"
                    : "rgba(255,77,109,0.75)"
                  : ink(0.35),
              }}
            />
          ))
        )}
      </div>

      {track.rootBuffer && (
        <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
          <label className="flex items-center gap-2 font-mono text-[9px] tracking-wider uppercase text-white/35">
            Vol
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={track.volume}
              onChange={(e) => setTrackVolume(trackId, Number(e.target.value))}
              className={`flex-1 ${mono ? "accent-black" : "accent-[#FF4D6D]"}`}
            />
          </label>
          <label className="flex items-center gap-2 font-mono text-[9px] tracking-wider uppercase text-white/35">
            Mix
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={track.harmonyMix}
              onChange={(e) => setHarmonyMix(trackId, Number(e.target.value))}
              className={`flex-1 ${mono ? "accent-black" : "accent-[#F59E0B]"}`}
            />
          </label>
        </div>
      )}

      <div
        className="flex flex-wrap gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="px-2 py-1 rounded-sm border border-white/12 font-mono text-[9px] tracking-wider uppercase text-white/50 hover:text-white/80"
          onClick={() =>
            isRecording ? void stopMicRecord() : void startMicRecord(trackId)
          }
        >
          {isRecording ? "Stop rec" : "Record"}
        </button>
        <button
          type="button"
          className="px-2 py-1 rounded-sm border border-white/12 font-mono text-[9px] tracking-wider uppercase text-white/50 hover:text-white/80"
          onClick={() => audioInputRef.current?.click()}
        >
          Upload audio
        </button>
        {trackId === 0 && (
          <button
            type="button"
            className="px-2 py-1 rounded-sm border border-white/12 font-mono text-[9px] tracking-wider uppercase text-white/50 hover:text-white/80"
            onClick={() => videoInputRef.current?.click()}
          >
            Upload video
          </button>
        )}
        {track.rootBuffer && (
          <>
            <button
              type="button"
              className="px-2 py-1 rounded-sm border border-white/12 font-mono text-[9px] tracking-wider uppercase text-white/50 hover:text-white/80"
              onClick={() => toggleMute(trackId)}
            >
              {track.isMuted ? "Unmute" : "Mute"}
            </button>
            <button
              type="button"
              className="px-2 py-1 rounded-sm border border-white/12 font-mono text-[9px] tracking-wider uppercase text-white/50 hover:text-white/80"
              onClick={() => clearTrack(trackId)}
            >
              Clear
            </button>
          </>
        )}
      </div>

      {trackId === 0 && track.source === "empty" && (
        <p className="font-mono text-[9px] leading-relaxed text-white/30">
          Upload a clip already cut to your loop — its audio sets the master
          timeline.
        </p>
      )}

      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.ogg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void loadAudioFile(trackId, file);
        }}
      />
      {trackId === 0 && (
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*,.mp4,.webm,.mov"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void loadVideoFile(file);
          }}
        />
      )}
    </div>
  );
}
