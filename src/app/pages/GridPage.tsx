import { Link } from "react-router";
import { motion } from "motion/react";
import { GridApp } from "../components/grid/GridApp";

export function GridPage() {
  return (
    <div
      className="h-screen w-full overflow-hidden relative"
      style={{ background: "#0A0509" }}
    >
      {/* Flash gradient atmosphere — #FFF047 → #B5D100 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 65% 55% at 8% 88%, rgba(98,255,0,0.20) 0%, transparent 68%)",
            "radial-gradient(ellipse 55% 60% at 92% 12%, rgba(98,255,0,0.20) 0%, transparent 65%)",
            "radial-gradient(ellipse 40% 40% at 50% 50%, rgba(0,177,0,0.06) 0%, transparent 70%)",
          ].join(", "),
        }}
      />
      {/* Grain noise */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0.16,
          mixBlendMode: "screen",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.90' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "160px 160px",
        }}
      />

      <div className="relative h-full flex flex-col p-4 gap-4">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between flex-shrink-0"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link
            to="/"
            className="text-white/30 hover:text-white/60 text-[10px] font-mono tracking-widest uppercase transition-colors flex items-center gap-1.5"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Fourier
          </Link>

          <div className="text-center">
            <h1 className="text-sm font-medium text-white/90 tracking-widest uppercase">
              Grid
            </h1>
            <p className="text-white/30 text-[9px] font-mono tracking-wider">
              browser-native sampler and sequencer
            </p>
          </div>

          <div className="w-16" />
        </motion.div>

        {/* Main app */}
        <motion.div
          className="flex-1 min-h-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <GridApp />
        </motion.div>
      </div>
    </div>
  );
}