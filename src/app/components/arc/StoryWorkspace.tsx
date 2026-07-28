import { useRef, useState, useCallback, useEffect } from "react";
import type { ArcState, ArcAction, StoryLayerKey, ArcTrack } from "./types";
import type { Dispatch } from "react";

interface StoryWorkspaceProps {
  state: ArcState;
  dispatch: Dispatch<ArcAction>;
}

const LAYER_META: Record<StoryLayerKey, { label: string; color: string }> = {
  energy:   { label: "Energy",   color: "#009DFF" },
  tempo:    { label: "Tempo",    color: "#EB00F7" },
  harmonic: { label: "Harmonic", color: "#60a5fa" },
  sub:      { label: "Sub",      color: "#f87171" },
  bass:     { label: "Bass",     color: "#fb923c" },
  mids:     { label: "Mids",     color: "#fbbf24" },
  highs:    { label: "Highs",    color: "#a78bfa" },
};

const LAYER_KEYS = Object.keys(LAYER_META) as StoryLayerKey[];

function getLayerValue(track: ArcTrack, layer: StoryLayerKey, minBpm: number, maxBpm: number): number {
  if (track.analyzing) return 0.5;
  switch (layer) {
    case "energy": return track.energy;
    case "tempo": {
      if (!track.bpm) return 0.5;
      return maxBpm === minBpm ? 0.5 : (track.bpm - minBpm) / (maxBpm - minBpm);
    }
    case "harmonic": {
      if (!track.camelot) return 0.5;
      const num = parseInt(track.camelot);
      return (num - 1) / 11;
    }
    case "sub":   return track.sub;
    case "bass":  return track.bass;
    case "mids":  return track.mids;
    case "highs": return track.highs;
  }
}

// Catmull-Rom spline as SVG cubic bezier path
function catmullRomPath(points: [number, number][]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;

  const path = [`M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    path.push(`C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`);
  }
  return path.join(" ");
}

export function StoryWorkspace({ state, dispatch }: StoryWorkspaceProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [svgWidth, setSvgWidth] = useState(600);
  const [hoveredTrackIdx, setHoveredTrackIdx] = useState<number | null>(null);
  const [mouseX, setMouseX] = useState(0);

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      setSvgWidth(entries[0].contentRect.width);
    });
    if (svgRef.current?.parentElement) obs.observe(svgRef.current.parentElement);
    return () => obs.disconnect();
  }, []);

  const { tracks, storyLayers } = state;
  const svgHeight = 260;
  const padX = 48;
  const padY = 24;
  const plotW = svgWidth - padX * 2;
  const plotH = svgHeight - padY * 2;

  const bpms = tracks.filter((t) => t.bpm).map((t) => t.bpm as number);
  const minBpm = Math.min(...bpms, 120);
  const maxBpm = Math.max(...bpms, 120);

  const xForTrack = (i: number) =>
    tracks.length <= 1
      ? padX + plotW / 2
      : padX + (i / (tracks.length - 1)) * plotW;

  const yForValue = (v: number) => padY + (1 - v) * plotH;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      setMouseX(x);
      if (tracks.length <= 1) {
        setHoveredTrackIdx(tracks.length === 1 ? 0 : null);
        return;
      }
      // Find nearest track
      let minDist = Infinity;
      let nearestIdx = 0;
      for (let i = 0; i < tracks.length; i++) {
        const dist = Math.abs(xForTrack(i) - x);
        if (dist < minDist) { minDist = dist; nearestIdx = i; }
      }
      setHoveredTrackIdx(nearestIdx);
    },
    [tracks, xForTrack]
  );

  const handleClick = useCallback(() => {
    if (hoveredTrackIdx === null) return;
    dispatch({ type: "SET_TAB", tab: "plan" });
    dispatch({ type: "SET_EXPANDED", id: tracks[hoveredTrackIdx]?.id ?? null });
  }, [hoveredTrackIdx, tracks, dispatch]);

  if (tracks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-white/20 text-[10px] font-mono tracking-widest uppercase">
          Import tracks in Plan to visualize the story
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 py-5 space-y-4">
        {/* Layer toggles */}
        <div className="flex flex-wrap gap-1.5">
          {LAYER_KEYS.map((key) => {
            const { label, color } = LAYER_META[key];
            const active = storyLayers[key];
            return (
              <button
                key={key}
                onClick={() => dispatch({ type: "TOGGLE_STORY_LAYER", layer: key })}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-mono tracking-wide uppercase transition-all"
                style={{
                  borderColor: active ? `${color}60` : "rgba(255,255,255,0.08)",
                  color: active ? color : "rgba(255,255,255,0.25)",
                  background: active ? `${color}12` : "transparent",
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: active ? color : "rgba(255,255,255,0.15)" }}
                />
                {label}
              </button>
            );
          })}
        </div>

        {/* SVG visualization */}
        <div className="rounded-sm border border-white/5 overflow-hidden" style={{ background: "rgba(255,255,255,0.015)" }}>
          <svg
            ref={svgRef}
            width="100%"
            height={svgHeight}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredTrackIdx(null)}
            onClick={handleClick}
            className="cursor-pointer"
          >
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((v) => (
              <line
                key={v}
                x1={padX}
                y1={yForValue(v)}
                x2={padX + plotW}
                y2={yForValue(v)}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={1}
              />
            ))}

            {/* Layer fills + strokes */}
            {LAYER_KEYS.filter((k) => storyLayers[k]).map((layerKey) => {
              const { color } = LAYER_META[layerKey];
              const points: [number, number][] = tracks.map((t, i) => [
                xForTrack(i),
                yForValue(getLayerValue(t, layerKey, minBpm, maxBpm)),
              ]);

              const linePath = catmullRomPath(points);
              // Close path for fill: go down to bottom, across, back up
              const firstPt = points[0];
              const lastPt = points[points.length - 1];
              const fillPath = `${linePath} L ${lastPt[0].toFixed(2)} ${(padY + plotH).toFixed(2)} L ${firstPt[0].toFixed(2)} ${(padY + plotH).toFixed(2)} Z`;

              return (
                <g key={layerKey}>
                  <defs>
                    <linearGradient id={`fill-${layerKey}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <path d={fillPath} fill={`url(#fill-${layerKey})`} />
                  <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.7} />
                  {/* Data points */}
                  {points.map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r={3} fill={color} fillOpacity={0.6} />
                  ))}
                </g>
              );
            })}

            {/* Hover crosshair */}
            {hoveredTrackIdx !== null && (
              <line
                x1={xForTrack(hoveredTrackIdx)}
                y1={padY}
                x2={xForTrack(hoveredTrackIdx)}
                y2={padY + plotH}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={1}
                strokeDasharray="3,3"
              />
            )}

            {/* Track labels on X axis */}
            {tracks.map((t, i) => (
              <text
                key={t.id}
                x={xForTrack(i)}
                y={svgHeight - 6}
                textAnchor="middle"
                fontSize={8}
                fontFamily="monospace"
                fill={hoveredTrackIdx === i ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)"}
              >
                {t.title.length > 14 ? t.title.slice(0, 12) + "…" : t.title}
              </text>
            ))}
          </svg>
        </div>

        {/* Hover tooltip */}
        {hoveredTrackIdx !== null && tracks[hoveredTrackIdx] && (
          <div className="rounded-sm border border-white/8 p-3 bg-white/[0.03] space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-white/70 text-sm font-medium">{tracks[hoveredTrackIdx].title}</span>
              {tracks[hoveredTrackIdx].artist && (
                <span className="text-white/30 text-[10px]">{tracks[hoveredTrackIdx].artist}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {LAYER_KEYS.filter((k) => storyLayers[k]).map((k) => {
                const t = tracks[hoveredTrackIdx];
                const v = getLayerValue(t, k, minBpm, maxBpm);
                const { label, color } = LAYER_META[k];
                return (
                  <div key={k} className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                    <span className="text-[9px] font-mono text-white/30">{label}</span>
                    <span className="text-[9px] font-mono tabular-nums" style={{ color }}>
                      {Math.round(v * 100)}%
                    </span>
                  </div>
                );
              })}
              {tracks[hoveredTrackIdx].bpm && (
                <span className="text-[9px] font-mono text-white/30">{tracks[hoveredTrackIdx].bpm} BPM</span>
              )}
              {tracks[hoveredTrackIdx].camelot && (
                <span className="text-[9px] font-mono text-white/30">{tracks[hoveredTrackIdx].camelot}</span>
              )}
            </div>
            <p className="text-[8px] font-mono text-white/15">Click to open track in Plan</p>
          </div>
        )}
      </div>
    </div>
  );
}
