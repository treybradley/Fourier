import { useEffect, useMemo, useRef, useState } from "react";
import { useVisualMode } from "../../hooks/useVisualMode";
import {
  ONE_SHOT_CATEGORIES,
  fetchOneShotBuffer,
  loadOneShotManifest,
  type OneShotCategory,
  type OneShotSample,
} from "./oneshots";

type Props = {
  padId: number;
  ensureAudioCtx: () => Promise<AudioContext | null>;
  onLoad: (padId: number, buffer: AudioBuffer, fileName: string) => void;
  onBack: () => void;
};

export function OneShotBrowser({
  padId,
  ensureAudioCtx,
  onLoad,
  onBack,
}: Props) {
  const { accent, ink, inkFg, mono } = useVisualMode();
  const accentA = accent("#62FF00");

  const [samples, setSamples] = useState<OneShotSample[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<OneShotCategory | "all">("kick");
  const [query, setQuery] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const previewSrcRef = useRef<AudioBufferSourceNode | null>(null);
  const bufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadOneShotManifest()
      .then((m) => {
        if (!cancelled) {
          setSamples(m.samples);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load pack");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      stopPreview();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return samples.filter((s) => {
      if (category !== "all" && s.category !== category) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.category.includes(q)
      );
    });
  }, [samples, category, query]);

  function stopPreview() {
    try {
      previewSrcRef.current?.stop();
    } catch {
      /* already stopped */
    }
    previewSrcRef.current = null;
    setPreviewId(null);
  }

  async function getBuffer(
    sample: OneShotSample,
    ctx: AudioContext,
  ): Promise<AudioBuffer> {
    const cached = bufferCacheRef.current.get(sample.id);
    if (cached) return cached;
    const buf = await fetchOneShotBuffer(sample.path, ctx);
    bufferCacheRef.current.set(sample.id, buf);
    return buf;
  }

  async function handlePreview(sample: OneShotSample) {
    const ctx = await ensureAudioCtx();
    if (!ctx) return;
    stopPreview();
    try {
      const buf = await getBuffer(sample, ctx);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.onended = () => {
        if (previewSrcRef.current === src) {
          previewSrcRef.current = null;
          setPreviewId(null);
        }
      };
      previewSrcRef.current = src;
      setPreviewId(sample.id);
      src.start(0);
    } catch (e) {
      console.error("Preview failed", e);
      setPreviewId(null);
    }
  }

  async function handleLoad(sample: OneShotSample) {
    const ctx = await ensureAudioCtx();
    if (!ctx) return;
    stopPreview();
    setLoadingId(sample.id);
    try {
      const buf = await getBuffer(sample, ctx);
      const fileName = `${sample.name}.mp3`;
      onLoad(padId, buf, fileName);
    } catch (e) {
      console.error("Load failed", e);
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="h-full flex flex-col gap-2 min-h-0">
      <div className="flex items-center justify-between flex-shrink-0">
        <button
          onClick={() => {
            stopPreview();
            onBack();
          }}
          className="text-[9px] font-mono tracking-wider text-white/40 hover:text-white/70 transition-colors"
        >
          ← Back
        </button>
        <span className="text-[9px] font-mono tracking-widest uppercase text-white/35">
          One-shots · Pad {padId + 1}
        </span>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search…"
        className="flex-shrink-0 w-full bg-black/25 border border-white/10 rounded-sm px-2 py-1.5 text-[10px] font-mono text-white/70 placeholder:text-white/25 outline-none focus:border-white/25"
      />

      <div className="flex flex-wrap gap-1 flex-shrink-0">
        <CatChip
          active={category === "all"}
          label="All"
          onClick={() => setCategory("all")}
          accentA={accentA}
          ink={ink}
          inkFg={inkFg}
          mono={mono}
        />
        {ONE_SHOT_CATEGORIES.map((c) => (
          <CatChip
            key={c.id}
            active={category === c.id}
            label={c.label}
            onClick={() => setCategory(c.id)}
            accentA={accentA}
            ink={ink}
            inkFg={inkFg}
            mono={mono}
          />
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden space-y-0.5">
        {loading && (
          <p className="text-[9px] font-mono text-white/30 py-4 text-center">
            Loading pack…
          </p>
        )}
        {error && (
          <p className="text-[9px] font-mono text-red-400/70 py-4 text-center">
            {error}
          </p>
        )}
        {!loading && !error && filtered.length === 0 && (
          <p className="text-[9px] font-mono text-white/30 py-4 text-center">
            No samples
          </p>
        )}
        {filtered.map((s) => {
          const isPreview = previewId === s.id;
          const isLoading = loadingId === s.id;
          return (
            <div
              key={s.id}
              className="flex items-center gap-1 rounded-sm px-1.5 py-1 hover:bg-white/[0.04] group"
            >
              <button
                type="button"
                onClick={() => void handlePreview(s)}
                className="w-6 h-6 flex-shrink-0 rounded-sm border text-[9px] font-mono flex items-center justify-center transition-colors"
                style={{
                  borderColor: isPreview ? `${accentA}70` : "rgba(255,255,255,0.12)",
                  color: isPreview ? accentA : "rgba(255,255,255,0.45)",
                  background: isPreview ? `${accentA}15` : "transparent",
                }}
                title="Preview"
                aria-label={`Preview ${s.name}`}
              >
                {isPreview ? "■" : "▶"}
              </button>
              <button
                type="button"
                onClick={() => void handleLoad(s)}
                disabled={isLoading}
                className="flex-1 min-w-0 text-left"
                title="Load onto pad"
              >
                <div className="text-[10px] text-white/70 truncate leading-tight">
                  {s.name}
                </div>
                <div className="text-[8px] font-mono text-white/25 uppercase tracking-wider">
                  {s.category}
                  {isLoading ? " · loading…" : ""}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      <p className="flex-shrink-0 text-[8px] font-mono text-white/20 tracking-wider">
        ▶ preview · tap name to load · {filtered.length} shown
      </p>
    </div>
  );
}

function CatChip({
  active,
  label,
  onClick,
  accentA,
  ink,
  inkFg,
  mono,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  accentA: string;
  ink: (a: number) => string;
  inkFg: (a: number) => string;
  mono: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2 py-0.5 text-[8px] font-mono tracking-widest uppercase rounded-sm border transition-colors"
      style={
        active
          ? {
              color: accentA,
              borderColor: `${accentA}55`,
              background: `${accentA}14`,
            }
          : {
              color: inkFg(0.45),
              borderColor: ink(0.18),
              background: mono ? "rgba(0,0,0,0.04)" : "transparent",
            }
      }
    >
      {label}
    </button>
  );
}
