export const VISUAL_STORAGE_KEY = "fourier-visual";
export const VISUAL_CHANGE_EVENT = "fourier-visual-change";

export type VisualMode = "color" | "mono";

export function readVisualMode(): VisualMode {
  if (typeof document !== "undefined") {
    const fromDom = document.documentElement.dataset.visual;
    if (fromDom === "mono" || fromDom === "color") return fromDom;
  }
  try {
    const stored = localStorage.getItem(VISUAL_STORAGE_KEY);
    if (stored === "mono" || stored === "color") return stored;
  } catch {
    /* ignore */
  }
  return "color";
}

export function applyVisualMode(mode: VisualMode) {
  document.documentElement.dataset.visual = mode;
  try {
    localStorage.setItem(VISUAL_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(VISUAL_CHANGE_EVENT));
}

export function uiAccent(color: string, monoColor = "#111111"): string {
  return readVisualMode() === "mono" ? monoColor : color;
}
