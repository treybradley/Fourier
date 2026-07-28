import { motion } from "motion/react";
import { useStemSeparatorContext } from "../../contexts/StemSeparatorContext";
import { STEM_NAMES, STEM_LABELS, STEM_COLORS } from "../../hooks/useStemSeparator";

export function StemSeparatorProgress() {
  const { stage, modelProgress, modelCached, stemProgress, activeStem, sourceFile } =
    useStemSeparatorContext();

  const isDownloading = stage === "downloading";
  const isSeparating = stage === "separating";

  return (
    <motion.div
      className="flex flex-col gap-6 w-full max-w-lg mx-auto"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* File name */}
      <div className="text-center">
        <p className="text-white/50 text-[10px] font-mono tracking-widest uppercase mb-1">
          {isDownloading ? "Downloading models" : "Separating stems"}
        </p>
        <p className="text-white/30 text-xs font-mono truncate">{sourceFile?.name}</p>
      </div>

      {/* Model download phase */}
      <div className="space-y-3">
        <p className="text-white/20 text-[9px] font-mono tracking-widest uppercase">
          Models {isDownloading ? "(downloading…)" : "(ready)"}
        </p>
        {STEM_NAMES.map(stem => {
          const progress = modelProgress[stem];
          const cached = modelCached[stem];
          const done = progress >= 1;
          return (
            <div key={stem} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: done ? STEM_COLORS[stem] : "rgba(255,255,255,0.15)" }} />
                  <span className="text-white/50 text-[10px] font-mono">{STEM_LABELS[stem]}</span>
                  {cached && done && (
                    <span className="text-[8px] font-mono tracking-wider uppercase" style={{ color: STEM_COLORS[stem], opacity: 0.7 }}>cached</span>
                  )}
                </div>
                <span className="text-white/25 text-[9px] font-mono">
                  {done ? "✓" : progress > 0 ? `${Math.round(progress * 100)}%` : "—"}
                </span>
              </div>
              <div className="h-px bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: STEM_COLORS[stem], opacity: done ? 0.8 : 0.5 }}
                  initial={{ width: "0%" }}
                  animate={{ width: `${Math.round(progress * 100)}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Separation inference phase */}
      {(isSeparating || STEM_NAMES.some(s => stemProgress[s].total > 0)) && (
        <div className="space-y-3">
          <p className="text-white/20 text-[9px] font-mono tracking-widest uppercase">Separation</p>
          {STEM_NAMES.map(stem => {
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
                        style={{ background: STEM_COLORS[stem] }}
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      />
                    )}
                    {!isActive && (
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: isDone ? STEM_COLORS[stem] : "rgba(255,255,255,0.10)" }}
                      />
                    )}
                    <span className="text-white/50 text-[10px] font-mono">{STEM_LABELS[stem]}</span>
                    {isActive && (
                      <span className="text-[8px] font-mono tracking-wider uppercase" style={{ color: STEM_COLORS[stem], opacity: 0.7 }}>
                        processing
                      </span>
                    )}
                  </div>
                  <span className="text-white/25 text-[9px] font-mono">
                    {isDone ? "✓" : total > 0 ? `${done}/${total}` : "—"}
                  </span>
                </div>
                <div className="h-px bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: STEM_COLORS[stem], opacity: isDone ? 0.8 : 0.5 }}
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

      {/* Hint */}
      <p className="text-white/15 text-[9px] font-mono text-center">
        This may take a few minutes · keep this tab active
      </p>
    </motion.div>
  );
}
