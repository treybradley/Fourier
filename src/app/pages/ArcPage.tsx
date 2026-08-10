import { motion } from "motion/react";
import { ArcApp } from "../components/arc/ArcApp";
import { MiniAppHeader } from "../components/MiniAppHeader";

export function ArcPage() {
  return (
    <div
      className="h-screen w-full overflow-hidden relative"
      style={{ background: "#070510" }}
    >
      {/* Gradient atmosphere */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 65% 55% at 8% 12%, rgba(0,157,255,0.18) 0%, transparent 68%)",
            "radial-gradient(ellipse 55% 60% at 92% 88%, rgba(235,0,247,0.22) 0%, transparent 65%)",
            "radial-gradient(ellipse 40% 40% at 50% 50%, rgba(100,0,160,0.07) 0%, transparent 70%)",
          ].join(", "),
        }}
      />
      {/* Grain */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "300px 300px",
        }}
      />

      <div className="relative h-full flex flex-col">
        <MiniAppHeader
          title="Arc"
          subtitle="music planning workspace"
          titleClassName="text-white/90 tracking-[0.25em]"
          subtitleClassName="text-white/25 text-[9px]"
          className="px-4 py-3"
        />

        {/* App */}
        <motion.div
          className="flex-1 min-h-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <ArcApp />
        </motion.div>
      </div>
    </div>
  );
}
