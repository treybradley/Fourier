import { motion } from "motion/react";

interface PageLoaderProps {
  name: string;
  index: string;
  tagline: string;
  accentA: string;
  accentB: string;
  background: string;
  glows: [string, string, string]; // three radial-gradient strings
}

export function PageLoader({ name, index, tagline, accentA, accentB, background, glows }: PageLoaderProps) {
  return (
    <div className="h-screen w-full overflow-hidden relative flex items-center justify-center" style={{ background }}>
      {/* Gradient atmosphere */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: glows.join(", ") }}
      />

      {/* Grain */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0.14,
          mixBlendMode: "screen",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.90' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "160px 160px",
        }}
      />

      {/* Centered content */}
      <div className="relative flex flex-col items-center gap-5">
        {/* Index number */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="text-[10px] font-mono tracking-widest"
          style={{ color: `${accentA}60` }}
        >
          {index}
        </motion.div>

        {/* Name */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05, ease: "easeOut" }}
          className="text-xl font-medium tracking-widest uppercase text-white/80"
        >
          {name}
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.12 }}
          className="text-[10px] font-mono tracking-wider text-white/30"
        >
          {tagline}
        </motion.p>

        {/* Loading bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.18, duration: 0.3 }}
          className="w-32 h-px mt-1 overflow-hidden rounded-full"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${accentA}, ${accentB})` }}
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.1 }}
          />
        </motion.div>
      </div>
    </div>
  );
}

// Pre-built loaders for each mini-app
export function StemCollageLoader() {
  return (
    <PageLoader
      name="Stem Collage"
      index="01"
      tagline="Hand-tracked stem mixer"
      accentA="#0059CE"
      accentB="#FF64E3"
      background="#04060E"
      glows={[
        "radial-gradient(ellipse 65% 55% at 10% 90%, rgba(0,89,206,0.28) 0%, transparent 70%)",
        "radial-gradient(ellipse 50% 55% at 90% 10%, rgba(255,100,227,0.20) 0%, transparent 68%)",
        "radial-gradient(ellipse 45% 40% at 50% 50%, rgba(0,89,206,0.08) 0%, transparent 70%)",
      ]}
    />
  );
}

export function LooperLoader() {
  return (
    <PageLoader
      name="Loop Station"
      index="02"
      tagline="Multi-track looper"
      accentA="#00EBB8"
      accentB="#0030C5"
      background="#04060E"
      glows={[
        "radial-gradient(ellipse 65% 55% at 8% 88%, rgba(0,235,184,0.22) 0%, transparent 68%)",
        "radial-gradient(ellipse 55% 60% at 92% 12%, rgba(0,48,197,0.24) 0%, transparent 65%)",
        "radial-gradient(ellipse 40% 40% at 50% 50%, rgba(0,180,150,0.07) 0%, transparent 70%)",
      ]}
    />
  );
}

export function StemSeparatorLoader() {
  return (
    <PageLoader
      name="Stem Separator"
      index="03"
      tagline="AI-powered source separation"
      accentA="#FFA100"
      accentB="#97FC61"
      background="#06050F"
      glows={[
        "radial-gradient(ellipse 65% 55% at 8% 88%, rgba(255,161,0,0.22) 0%, transparent 68%)",
        "radial-gradient(ellipse 55% 60% at 92% 12%, rgba(151,252,97,0.18) 0%, transparent 65%)",
        "radial-gradient(ellipse 40% 40% at 50% 50%, rgba(220,200,0,0.06) 0%, transparent 70%)",
      ]}
    />
  );
}

export function GridLoader() {
  return (
    <PageLoader
      name="Grid"
      index="05"
      tagline="Sampler & Sequencer"
      accentA="#FFF047"
      accentB="#B5D100"
      background="#0A0509"
      glows={[
        "radial-gradient(ellipse 65% 55% at 8% 88%, rgba(255,240,71,0.26) 0%, transparent 68%)",
        "radial-gradient(ellipse 55% 60% at 92% 12%, rgba(181,209,0,0.20) 0%, transparent 65%)",
        "radial-gradient(ellipse 40% 40% at 50% 50%, rgba(200,190,0,0.06) 0%, transparent 70%)",
      ]}
    />
  );
}

export function ArcLoader() {
  return (
    <PageLoader
      name="Arc"
      index="06"
      tagline="Music planning workspace"
      accentA="#EB00F7"
      accentB="#00DF8B"
      background="#070510"
      glows={[
        "radial-gradient(ellipse 65% 55% at 8% 12%, rgba(235,0,247,0.22) 0%, transparent 68%)",
        "radial-gradient(ellipse 55% 60% at 92% 88%, rgba(0,157,255,0.18) 0%, transparent 65%)",
        "radial-gradient(ellipse 40% 40% at 50% 50%, rgba(100,0,160,0.07) 0%, transparent 70%)",
      ]}
    />
  );
}

export function GatoLoader() {
  return (
    <PageLoader
      name="Gato Cat (Synth)"
      index="04"
      tagline="Concatenative synthesis explorer"
      accentA="#AD1888"
      accentB="#FF6100"
      background="#0D050A"
      glows={[
        "radial-gradient(ellipse 65% 55% at 8% 88%, rgba(173,24,136,0.26) 0%, transparent 68%)",
        "radial-gradient(ellipse 55% 60% at 92% 12%, rgba(255,97,0,0.20) 0%, transparent 65%)",
        "radial-gradient(ellipse 40% 40% at 50% 50%, rgba(200,50,80,0.07) 0%, transparent 70%)",
      ]}
    />
  );
}
