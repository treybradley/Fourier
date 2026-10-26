import { Link } from "react-router";
import { motion } from "motion/react";

interface MiniAppHeaderProps {
  title: string;
  subtitle: string;
  /** Extra classes for the h1 (e.g. gradient text). */
  titleClassName?: string;
  subtitleClassName?: string;
  /** Right-side slot (BPM, spacer content, etc.). */
  right?: React.ReactNode;
  className?: string;
  yOffset?: number;
  /**
   * When false, the ← Fourier control is a static mark (design-system demos)
   * instead of a link back to the hub.
   */
  interactive?: boolean;
}

const backClass =
  "relative z-10 inline-flex items-center justify-center gap-1.5 w-8 h-8 sm:w-auto sm:h-auto sm:px-2 sm:py-1.5 rounded-sm border border-white/20 text-white/55 bg-white/[0.04] text-[10px] font-mono tracking-widest uppercase";

function BackMark() {
  return (
    <>
      <svg
        className="w-3.5 h-3.5 sm:w-3 sm:h-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19l-7-7 7-7"
        />
      </svg>
      <span className="hidden sm:inline">Fourier</span>
    </>
  );
}

export function MiniAppHeader({
  title,
  subtitle,
  titleClassName = "text-white/90",
  subtitleClassName = "text-white/45 text-[10px]",
  right,
  className = "",
  yOffset = -16,
  interactive = true,
}: MiniAppHeaderProps) {
  return (
    <motion.div
      className={`relative flex items-center justify-between flex-shrink-0 ${className}`}
      initial={{ opacity: 0, y: yOffset }}
      animate={{ opacity: 1, y: 0 }}
    >
      {interactive ? (
        <Link
          to="/"
          aria-label="Back to Fourier"
          className={`${backClass} hover:border-white/35 hover:text-white/85 transition-colors`}
        >
          <BackMark />
        </Link>
      ) : (
        <span
          className={`${backClass} pointer-events-none select-none`}
          aria-hidden
        >
          <BackMark />
        </span>
      )}

      <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none max-w-[min(100%,calc(100%-5.5rem))]">
        <h1
          className={`text-sm font-medium tracking-widest uppercase whitespace-nowrap ${titleClassName}`}
        >
          {title}
        </h1>
        <p
          className={`font-mono tracking-wider whitespace-nowrap ${subtitleClassName}`}
        >
          {subtitle}
        </p>
      </div>

      <div className="relative z-10 flex items-center justify-end gap-3 min-h-8 min-w-8 sm:min-w-16">
        {right}
      </div>
    </motion.div>
  );
}
