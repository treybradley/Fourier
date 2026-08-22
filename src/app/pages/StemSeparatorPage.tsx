import { motion } from "motion/react";
import { StemSeparatorProvider, useStemSeparatorContext } from "../contexts/StemSeparatorContext";
import { StemSeparatorUpload } from "../components/separator/StemSeparatorUpload";
import { StemSeparatorProgress } from "../components/separator/StemSeparatorProgress";
import { StemSeparatorResults } from "../components/separator/StemSeparatorResults";
import { MiniAppHeader } from "../components/MiniAppHeader";

function StemSeparatorInner() {
  const { stage } = useStemSeparatorContext();
  const isProcessing = stage === "downloading" || stage === "separating";
  const isDone = stage === "done";

  return (
    <div className="app-page h-screen w-full overflow-hidden relative" style={{ background: "#06050F" }}>
      {/* Citrus gradient atmosphere — #FFA100 → #97FC61 */}
      <div
        className="app-atmosphere pointer-events-none absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 65% 55% at 8% 88%, rgba(255,161,0,0.22) 0%, transparent 68%)",
            "radial-gradient(ellipse 55% 60% at 92% 12%, rgba(151,252,97,0.18) 0%, transparent 65%)",
            "radial-gradient(ellipse 40% 40% at 50% 50%, rgba(220,200,0,0.06) 0%, transparent 70%)",
          ].join(", "),
        }}
      />
      {/* Grain noise */}
      <div
        className="app-grain pointer-events-none absolute inset-0"
        style={{
          opacity: 0.16,
          mixBlendMode: "screen",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.90' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "160px 160px",
        }}
      />

      <div className="relative h-full flex flex-col p-4 gap-4">
        <MiniAppHeader
          title="Stem Separator"
          subtitle="AI-powered source separation"
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 px-4">
          {!isProcessing && !isDone && <StemSeparatorUpload />}
          {isProcessing && <StemSeparatorProgress />}
          {isDone && (
            <div className="w-full max-w-2xl">
              <StemSeparatorResults />
            </div>
          )}
        </div>

        {/* Footer hint */}
        <motion.div
          className="flex-shrink-0 flex items-center justify-center pb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-4 text-white/45 text-[9px] font-mono tracking-widest">
            <span>Open source stem separation</span>
            <span>·</span>
            <span>runs locally</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function StemSeparatorPage() {
  return (
    <StemSeparatorProvider>
      <StemSeparatorInner />
    </StemSeparatorProvider>
  );
}
