import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { motion } from "motion/react";
import { useVisualMode } from "../hooks/useVisualMode";
import { applyVisualMode, type VisualMode } from "../utils/visualMode";
import { OverviewSection } from "./design-system/Overview";
import { FoundationsSection } from "./design-system/Foundations";
import { ComponentsSection } from "./design-system/Components";
import { SignalSection } from "./design-system/Signal";
import { ArchitectureSection } from "./design-system/SystemArchitecture";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "foundations", label: "Foundations" },
  { id: "components", label: "Components & patterns" },
  { id: "signal", label: "Signal" },
  { id: "architecture", label: "Architecture" },
] as const;

/** Old ?tab=patterns iframes land on the merged Components & patterns tab. */
const TAB_ALIASES: Record<string, (typeof TABS)[number]["id"]> = {
  patterns: "components",
};

type TabId = (typeof TABS)[number]["id"];

function isTabId(value: string | null): value is TabId {
  return TABS.some((t) => t.id === value);
}

export function DesignSystemPage() {
  const [params, setParams] = useSearchParams();
  const { mode, setMode } = useVisualMode();

  const embed = params.get("embed") === "1";
  const rawTab = params.get("tab");
  const tab: TabId = isTabId(rawTab)
    ? (rawTab as TabId)
    : rawTab && TAB_ALIASES[rawTab]
      ? TAB_ALIASES[rawTab]
      : "overview";

  // Apply theme from query (portfolio iframes).
  useEffect(() => {
    const theme = params.get("theme");
    if (theme === "color" || theme === "mono") {
      applyVisualMode(theme);
    }
  }, [params]);

  useEffect(() => {
    document.title = "Design System — Fourier";
    return () => {
      document.title = "Fourier";
    };
  }, []);

  // Tab-only deep links: always open at top of the tab (no section= scroll —
  // scrollIntoView would also scroll ancestor frames / portfolio pages).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  const setTab = (next: TabId) => {
    const nextParams = new URLSearchParams(params);
    nextParams.set("tab", next);
    setParams(nextParams, { replace: true });
  };

  const setTheme = (next: VisualMode) => {
    setMode(next);
    const nextParams = new URLSearchParams(params);
    nextParams.set("theme", next);
    setParams(nextParams, { replace: true });
  };

  const body = useMemo(() => {
    switch (tab) {
      case "foundations":
        return <FoundationsSection />;
      case "components":
        return <ComponentsSection />;
      case "signal":
        return <SignalSection />;
      case "architecture":
        return <ArchitectureSection />;
      default:
        return <OverviewSection />;
    }
  }, [tab]);

  return (
    <div
      className="app-page min-h-screen w-full"
      style={{ background: "#04060E" }}
    >
      <div
        className="app-atmosphere pointer-events-none fixed inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 65% 55% at 10% 90%, rgba(0,100,186,0.32) 0%, transparent 70%)",
            "radial-gradient(ellipse 50% 55% at 90% 10%, rgba(0,172,223,0.26) 0%, transparent 68%)",
            "radial-gradient(ellipse 45% 40% at 50% 50%, rgba(0,134,203,0.10) 0%, transparent 70%)",
          ].join(", "),
        }}
      />
      <div
        className="app-grain pointer-events-none fixed inset-0"
        style={{
          opacity: 0.12,
          mixBlendMode: "screen",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.30' numOctaves='9' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "160px 160px",
        }}
      />

      <div
        className={`relative min-h-screen flex flex-col mx-auto w-full ${
          embed ? "px-4 py-6 max-w-5xl" : "px-6 md:px-12 py-10 max-w-5xl"
        }`}
      >
        {!embed ? (
          <motion.header
            className="flex items-start justify-between gap-4 mb-8"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="space-y-1">
              <Link
                to="/"
                className="text-white/90 text-lg font-medium tracking-[0.2em] uppercase hover:text-white transition-colors"
              >
                Fourier
              </Link>
              <div className="text-white/30 text-[10px] tracking-widest uppercase">
                Design system
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 mt-1">
              <div className="flex rounded-sm overflow-hidden border border-white/15">
                {(["color", "mono"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTheme(m)}
                    className={`px-2.5 py-1 text-[10px] font-mono tracking-widest uppercase transition-colors ${
                      mode === m
                        ? "bg-white/15 text-white/90"
                        : "text-white/30 hover:text-white/60"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <Link
                to="/"
                className="text-white/25 hover:text-white/55 text-[10px] font-mono tracking-widest uppercase transition-colors"
              >
                ← Hub
              </Link>
            </div>
          </motion.header>
        ) : (
          <div className="flex items-center justify-between mb-6">
            <div className="text-[10px] font-mono tracking-widest uppercase text-white/40">
              Fourier · Design system
            </div>
            <div className="flex rounded-sm overflow-hidden border border-white/15">
              {(["color", "mono"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTheme(m)}
                  className={`px-2 py-0.5 text-[9px] font-mono tracking-widest uppercase transition-colors ${
                    mode === m
                      ? "bg-white/15 text-white/90"
                      : "text-white/30 hover:text-white/60"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        <nav
          aria-label="Design system sections"
          className="mb-10 flex flex-wrap gap-1 border-b border-white/10 pb-px"
        >
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-[11px] font-mono tracking-widest uppercase transition-colors border-b-2 -mb-px ${
                  active
                    ? "border-white/70 text-white/90"
                    : "border-transparent text-white/35 hover:text-white/65"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </nav>

        <motion.main
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex-1 pb-16"
        >
          {body}
        </motion.main>

        {!embed ? (
          <footer className="pt-6 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-white/20 text-[10px] tracking-widest uppercase font-mono">
              Design System — Fourier
            </span>
            <span className="text-white/20 text-[10px] font-mono tracking-wider">
              ?embed=1&amp;theme=color&amp;tab=foundations
            </span>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
