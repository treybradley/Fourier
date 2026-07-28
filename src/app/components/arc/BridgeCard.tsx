import { useState } from "react";
import type { ArcTrack, Bridge, ArcAction } from "./types";
import { bridgeId, bridgeCompat } from "./types";
import type { Dispatch } from "react";

interface BridgeCardProps {
  trackA: ArcTrack;
  trackB: ArcTrack;
  bridge: Bridge | undefined;
  dispatch: Dispatch<ArcAction>;
}

const ACCENT = "#EB00F7";
const ACCENT2 = "#009DFF";

function compatColor(score: number): string {
  if (score >= 0.7) return ACCENT2;
  if (score >= 0.4) return "#fbbf24";
  return "#f87171";
}

function CompatBar({ label, value }: { label: string; value: number }) {
  const color = compatColor(value);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[8px] font-mono text-white/25 uppercase tracking-wide w-14 flex-shrink-0">{label}</span>
      <div className="flex-1 h-0.5 rounded-full bg-white/8 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value * 100}%`, background: color }} />
      </div>
      <span className="text-[8px] font-mono tabular-nums w-7 text-right" style={{ color }}>{Math.round(value * 100)}%</span>
    </div>
  );
}

const BRIDGE_FIELDS: Array<{ key: keyof Bridge; label: string; placeholder: string }> = [
  { key: "transitionNotes", label: "Transition", placeholder: "How to transition between these tracks…" },
  { key: "loopIdeas", label: "Loop ideas", placeholder: "Loops, edits, chops…" },
  { key: "fxIdeas", label: "FX ideas", placeholder: "Filter, reverb, echo…" },
  { key: "cueReminders", label: "Cue notes", placeholder: "Entry/exit cue points…" },
  { key: "mashupIdeas", label: "Mashup", placeholder: "Acapella swaps, instrumental blends…" },
];

export function BridgeCard({ trackA, trackB, bridge, dispatch }: BridgeCardProps) {
  const [open, setOpen] = useState(false);
  const compat = bridgeCompat(trackA, trackB);
  const bid = bridgeId(trackA, trackB);
  const hasNotes = bridge && BRIDGE_FIELDS.some((f) => bridge[f.key as keyof Bridge]);
  const overall = compat.overall;

  const updateBridge = (key: string, value: string) => {
    dispatch({ type: "UPDATE_BRIDGE", id: bid, updates: { [key]: value } });
  };

  return (
    <div className="relative flex flex-col items-center py-1">
      {/* Vertical line */}
      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-white/5" />

      {/* Bridge pill */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative z-10 flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all"
        style={{
          borderColor: open ? `${ACCENT}30` : "rgba(255,255,255,0.08)",
          background: open ? `${ACCENT}08` : "rgba(10,5,16,0.95)",
        }}
      >
        {/* Overall score indicator */}
        <div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: compatColor(overall) }}
        />

        <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">bridge</span>

        {/* Score */}
        <span className="text-[8px] font-mono tabular-nums" style={{ color: compatColor(overall) }}>
          {Math.round(overall * 100)}%
        </span>

        {/* Note indicator */}
        {hasNotes && (
          <span className="text-[7px] font-mono text-white/20">·</span>
        )}

        {/* Chevron */}
        <svg
          className="w-2.5 h-2.5 text-white/25 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded panel */}
      {open && (
        <div
          className="relative z-10 w-full max-w-lg mt-1.5 rounded-sm border p-3 space-y-3"
          style={{ borderColor: `${ACCENT}20`, background: "rgba(10,5,16,0.97)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Compat bars */}
          <div className="space-y-1.5">
            <CompatBar label="BPM" value={compat.bpm} />
            <CompatBar label="Key" value={compat.harmonic} />
            <CompatBar label="Energy" value={compat.energy} />
            <div className="pt-0.5 border-t border-white/5">
              <CompatBar label="Overall" value={overall} />
            </div>
          </div>

          {/* Key metadata row */}
          {(trackA.bpm || trackB.bpm || trackA.camelot || trackB.camelot) && (
            <div className="flex items-center gap-3 text-[8px] font-mono text-white/30">
              <span>{trackA.bpm ? `${trackA.bpm} BPM` : "—"}</span>
              <span className="text-white/10">→</span>
              <span>{trackB.bpm ? `${trackB.bpm} BPM` : "—"}</span>
              {trackA.camelot && trackB.camelot && (
                <>
                  <span className="text-white/10 ml-2">|</span>
                  <span style={{ color: ACCENT }}>{trackA.camelot}</span>
                  <span className="text-white/10">→</span>
                  <span style={{ color: ACCENT }}>{trackB.camelot}</span>
                </>
              )}
            </div>
          )}

          {/* Editable fields */}
          <div className="space-y-2">
            {BRIDGE_FIELDS.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-[8px] font-mono text-white/25 uppercase tracking-widest block mb-1">
                  {label}
                </label>
                <textarea
                  className="w-full bg-white/[0.04] border border-white/8 rounded-sm px-2.5 py-2 text-[11px] text-white/70 placeholder:text-white/20 resize-none outline-none focus:border-white/20 transition-colors"
                  rows={1}
                  placeholder={placeholder}
                  value={(bridge?.[key as keyof Bridge] as string) ?? ""}
                  onChange={(e) => updateBridge(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
