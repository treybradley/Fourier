import { useCallback, useEffect, useState } from "react";
import {
  VISUAL_CHANGE_EVENT,
  applyVisualMode,
  readVisualMode,
  type VisualMode,
} from "../utils/visualMode";

export function useVisualMode() {
  const [mode, setModeState] = useState<VisualMode>(readVisualMode);

  useEffect(() => {
    const sync = () => setModeState(readVisualMode());
    window.addEventListener(VISUAL_CHANGE_EVENT, sync);
    return () => window.removeEventListener(VISUAL_CHANGE_EVENT, sync);
  }, []);

  const setMode = useCallback((next: VisualMode) => {
    applyVisualMode(next);
    setModeState(next);
  }, []);

  const mono = mode === "mono";
  const ink = useCallback(
    (alpha: number) =>
      mode === "mono" ? `rgba(17,17,17,${alpha})` : `rgba(255,255,255,${alpha})`,
    [mode],
  );
  const inkFg = useCallback(
    (alpha: number) => {
      const a = mode === "mono" ? Math.max(alpha, 0.68) : alpha;
      return mode === "mono" ? `rgba(17,17,17,${a})` : `rgba(255,255,255,${alpha})`;
    },
    [mode],
  );
  const accent = useCallback(
    (color: string, monoColor = "#111111") =>
      mode === "mono" ? monoColor : color,
    [mode],
  );

  return { mode, setMode, mono, ink, inkFg, accent };
}
