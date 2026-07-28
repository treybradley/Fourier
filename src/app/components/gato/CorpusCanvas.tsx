import { useEffect, useRef, useCallback } from "react";
import type { Grain, FeatureKey } from "./featureExtraction";
import { getNormKey } from "./featureExtraction";

interface Props {
  grains: Grain[];
  xAxis: FeatureKey;
  yAxis: FeatureKey;
  activeGrainId: number | null;
  cursorPos: { x: number; y: number } | null;
  onGrainHover: (grain: Grain | null) => void;
  onGrainClick: (grain: Grain) => void;
  appState: "idle" | "analyzing" | "ready";
  analysisProgress: number;
}

const MARGIN = 0.075;

function grainToCanvas(
  grain: Grain,
  xAxis: FeatureKey,
  yAxis: FeatureKey,
  W: number,
  H: number,
): { x: number; y: number } {
  const nx = grain[getNormKey(xAxis)] as number;
  const ny = grain[getNormKey(yAxis)] as number;
  return {
    x: nx * W * (1 - 2 * MARGIN) + W * MARGIN,
    y: (1 - ny) * H * (1 - 2 * MARGIN) + H * MARGIN,
  };
}

export function CorpusCanvas({
  grains,
  xAxis,
  yAxis,
  activeGrainId,
  cursorPos,
  onGrainHover,
  onGrainClick,
  appState,
  analysisProgress,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Refs for rAF — avoid stale closures
  const grainsRef = useRef(grains);
  const xAxisRef = useRef(xAxis);
  const yAxisRef = useRef(yAxis);
  const activeIdRef = useRef(activeGrainId);
  const cursorRef = useRef(cursorPos);
  const hoveredGrainRef = useRef<Grain | null>(null);

  useEffect(() => { grainsRef.current = grains; }, [grains]);
  useEffect(() => { xAxisRef.current = xAxis; }, [xAxis]);
  useEffect(() => { yAxisRef.current = yAxis; }, [yAxis]);
  useEffect(() => { activeIdRef.current = activeGrainId; }, [activeGrainId]);
  useEffect(() => { cursorRef.current = cursorPos; }, [cursorPos]);

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d")!;
    let rafId: number;

    const resizeObs = new ResizeObserver(() => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    });
    resizeObs.observe(container);
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    function draw() {
      const W = canvas!.width;
      const H = canvas!.height;
      const gs = grainsRef.current;
      const ax = xAxisRef.current;
      const ay = yAxisRef.current;
      const activeId = activeIdRef.current;
      const cursor = cursorRef.current;

      // Background
      ctx.fillStyle = "#050410";
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = "#1a1a2e";
      ctx.lineWidth = 0.5;
      for (let i = 1; i < 10; i++) {
        const gx = (i / 10) * W * (1 - 2 * MARGIN) + W * MARGIN;
        const gy = (i / 10) * H * (1 - 2 * MARGIN) + H * MARGIN;
        ctx.beginPath(); ctx.moveTo(gx, H * MARGIN); ctx.lineTo(gx, H * (1 - MARGIN)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(W * MARGIN, gy); ctx.lineTo(W * (1 - MARGIN), gy); ctx.stroke();
      }

      // Grains
      for (const g of gs) {
        const { x, y } = grainToCanvas(g, ax, ay, W, H);
        const isActive = g.id === activeId;

        if (isActive) {
          ctx.shadowBlur = 14;
          ctx.shadowColor = "#FF6100";
          ctx.fillStyle = "#ffffff";
        } else {
          ctx.shadowBlur = 0;
          const hue = g.normPitch * 240;
          const light = 30 + g.normRms * 40;
          ctx.fillStyle = `hsl(${hue}, 70%, ${light}%)`;
        }
        const r = isActive ? 5 : 2 + g.normRms * 3;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // Crosshair
      if (cursor) {
        ctx.strokeStyle = "rgba(0,232,212,0.8)";
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.moveTo(cursor.x - 10, cursor.y); ctx.lineTo(cursor.x + 10, cursor.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cursor.x, cursor.y - 10); ctx.lineTo(cursor.x, cursor.y + 10); ctx.stroke();
        ctx.beginPath(); ctx.arc(cursor.x, cursor.y, 16, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }

      rafId = requestAnimationFrame(draw);
    }

    rafId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafId);
      resizeObs.disconnect();
    };
  }, []);

  // Mouse handlers
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const tooltip = tooltipRef.current;
    const container = containerRef.current;
    if (!canvas || !tooltip || !container) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const W = canvas.width;
    const H = canvas.height;

    let best: Grain | null = null;
    let bestDist = 30;
    for (const g of grainsRef.current) {
      const { x, y } = grainToCanvas(g, xAxisRef.current, yAxisRef.current, W, H);
      const d = Math.sqrt((x - mx) ** 2 + (y - my) ** 2);
      if (d < bestDist) { bestDist = d; best = g; }
    }

    cursorRef.current = { x: mx, y: my };

    if (best !== hoveredGrainRef.current) {
      hoveredGrainRef.current = best;
      onGrainHover(best);
    }

    // Tooltip
    if (best) {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      tooltip.style.display = "block";
      tooltip.style.left = `${Math.min(mx + 12, cw - 160)}px`;
      tooltip.style.top = `${Math.min(my + 12, ch - 108)}px`;
      tooltip.innerHTML = `
        <div class="flex justify-between gap-3"><span>grain</span><span class="tabular-nums">#${best.id}</span></div>
        <div class="flex justify-between gap-3"><span>energy</span><span class="tabular-nums">${best.rms.toFixed(4)}</span></div>
        <div class="flex justify-between gap-3"><span>centroid</span><span class="tabular-nums">${best.spectralCentroid.toFixed(0)} Hz</span></div>
        <div class="flex justify-between gap-3"><span>pitch</span><span class="tabular-nums">${best.pitch > 0 ? best.pitch.toFixed(0) + " Hz" : "—"}</span></div>
        <div class="flex justify-between gap-3"><span>zcr</span><span class="tabular-nums">${best.zcr.toFixed(3)}</span></div>
      `;
    } else {
      tooltip.style.display = "none";
    }
  }, [onGrainHover]);

  const handleMouseLeave = useCallback(() => {
    cursorRef.current = null;
    hoveredGrainRef.current = null;
    onGrainHover(null);
    const tooltip = tooltipRef.current;
    if (tooltip) tooltip.style.display = "none";
  }, [onGrainHover]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const W = canvas.width;
    const H = canvas.height;
    let best: Grain | null = null;
    let bestDist = 30;
    for (const g of grainsRef.current) {
      const { x, y } = grainToCanvas(g, xAxisRef.current, yAxisRef.current, W, H);
      const d = Math.sqrt((x - mx) ** 2 + (y - my) ** 2);
      if (d < bestDist) { bestDist = d; best = g; }
    }
    if (best) onGrainClick(best);
  }, [onGrainClick]);

  return (
    <div ref={containerRef} className="size-full overflow-hidden relative bg-[#050410]">
      <canvas
        ref={canvasRef}
        className="size-full cursor-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
      />

      {/* Grain info tooltip */}
      <div
        ref={tooltipRef}
        className="absolute hidden pointer-events-none text-[10px] text-white/60 font-mono rounded-sm px-2.5 py-2 border border-white/10 space-y-0.5"
        style={{ background: "rgba(5,4,16,0.92)", minWidth: 148, backdropFilter: "blur(8px)" }}
      />

      {/* Idle overlay */}
      {appState === "idle" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="opacity-20">
            {[8, 18, 30, 22, 38, 14, 40, 32].map((cx, i) =>
              i % 2 === 0 ? (
                <circle key={i} cx={cx} cy={[12, 28, 20, 36][i / 2]} r="3" fill="white" />
              ) : null
            )}
          </svg>
          <p className="text-white/20 text-[11px] font-mono tracking-wider text-center">
            Upload an audio file to generate corpus
          </p>
        </div>
      )}

      {/* Analyzing overlay */}
      {appState === "analyzing" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
          <div className="w-48 h-0.5 bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{ width: `${analysisProgress * 100}%`, background: "linear-gradient(90deg, #AD1888, #FF6100)" }}
            />
          </div>
          <p className="text-white/30 text-[10px] font-mono tracking-widest">
            {Math.round(analysisProgress * 100)}% analyzed
          </p>
        </div>
      )}
    </div>
  );
}
