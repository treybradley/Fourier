import { motion } from "motion/react";
import { useStemSeparatorContext } from "../../contexts/StemSeparatorContext";
import { STEM_LABELS } from "../../hooks/useStemSeparator";
import { useVisualMode } from "../../hooks/useVisualMode";

export function StemSeparatorProgress() {
  const {
    stage,
    runStems,
    modelProgress,
    modelCached,
    stemProgress,
    activeStem,
    sourceFile,
  } = useStemSeparatorContext();
  const { mono, ink, inkFg } = useVisualMode();

  const isDownloading = stage === "downloading";
  const isSeparating = stage === "separating";
  const accent = mono ? "#111111" : "#00FDD9";
  const dotIdle = mono ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)";
  const barTrack = mono ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.05)";

  return (
    <motion.div
      className="flex flex-col gap-6 w-full max-w-lg mx-auto"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="text-center">
        <p
          className="text-[10px] font-mono tracking-widest uppercase mb-1"
          style={{ color: mono ? "#111111" : ink(0.5) }}
        >
          {isDownloading ? "Downloading models" : "Separating stems"}
        </p>
        <p className="text-xs font-mono truncate" style={{ color: mono ? "rgba(0,0,0,0.55)" : ink(0.3) }}>
          {sourceFile?.name}
        </p>
      </div>

      <div className="space-y-3">
        <p
          className="text-[9px] font-mono tracking-widest uppercase"
          style={{ color: mono ? "#111111" : ink(0.2) }}
        >
          Models {isDownloading ? "(downloading…)" : "(ready)"}
        </p>
        {runStems.map(stem => {
          const progress = modelProgress[stem];
          const cached = modelCached[stem];
          const done = progress >= 1;
          return (
            <div key={stem} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: done ? accent : dotIdle }}
                  />
                  <span className="text-[10px] font-mono" style={{ color: ink(0.5) }}>{STEM_LABELS[stem]}</span>
                  {cached && done && (
                    <span className="text-[8px] font-mono tracking-wider uppercase" style={{ color: inkFg(0.55) }}>
                      cached
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-mono" style={{ color: ink(0.25) }}>
                  {done ? "✓" : progress > 0 ? `${Math.round(progress * 100)}%` : "—"}
                </span>
              </div>
              <div className="h-px rounded-full overflow-hidden" style={{ background: barTrack }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: accent, opacity: done ? 0.8 : 0.5 }}
                  initial={{ width: "0%" }}
                  animate={{ width: `${Math.round(progress * 100)}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {(isSeparating || runStems.some(s => stemProgress[s].total > 0)) && (
        <div className="space-y-3">
          <p className="text-[9px] font-mono tracking-widest uppercase" style={{ color: mono ? "#111111" : ink(0.2) }}>
            Separation
          </p>
          {runStems.map(stem => {
            const { done, total } = stemProgress[stem];
            const pct = total > 0 ? done / total : 0;
            const isActive = activeStem === stem;
            const isDone = total > 0 && done >= total;
            return (
              <div key={stem} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isActive && (
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: accent }}
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      />
                    )}
                    {!isActive && (
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: isDone ? accent : dotIdle }}
                      />
                    )}
                    <span className="text-[10px] font-mono" style={{ color: ink(0.5) }}>{STEM_LABELS[stem]}</span>
                    {isActive && (
                      <span className="text-[8px] font-mono tracking-wider uppercase" style={{ color: inkFg(0.55) }}>
                        processing
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-mono" style={{ color: ink(0.25) }}>
                    {isDone ? "✓" : total > 0 ? `${done}/${total}` : "—"}
                  </span>
                </div>
                <div className="h-px rounded-full overflow-hidden" style={{ background: barTrack }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: accent, opacity: isDone ? 0.8 : 0.5 }}
                    initial={{ width: "0%" }}
                    animate={{ width: `${Math.round(pct * 100)}%` }}
                    transition={{ duration: 0.2, ease: "linear" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[9px] font-mono text-center" style={{ color: ink(0.15) }}>
        This may take a few minutes · keep this tab active
      </p>
    </motion.div>
  );
}
