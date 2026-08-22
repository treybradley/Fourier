import { EXPORT_HEIGHT, EXPORT_WIDTH } from "../../utils/exportFormat";
import { useVisualMode } from "../../hooks/useVisualMode";

interface HarmonizerMediaPanelProps {
  cameraVideoRef: React.RefObject<HTMLVideoElement | null>;
  clipVideoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  mode: "clip" | "camera" | "idle";
  cameraLive: boolean;
  isCapturing?: boolean;
  onStartCamera: () => void;
  onStopCamera: () => void;
  error?: string | null;
}

export function HarmonizerMediaPanel({
  cameraVideoRef,
  clipVideoRef,
  canvasRef,
  mode,
  isCapturing,
  onStartCamera,
  onStopCamera,
  error,
}: HarmonizerMediaPanelProps) {
  const aspectRatio = `${EXPORT_WIDTH} / ${EXPORT_HEIGHT}`;
  const { mono } = useVisualMode();

  return (
    <div className="h-full flex flex-col min-h-0 gap-2">
      <div className="relative flex-1 min-h-0 flex items-center justify-center rounded-sm border border-white/8 bg-black/60 overflow-hidden p-2">
        <video
          ref={cameraVideoRef as React.RefObject<HTMLVideoElement>}
          className="absolute w-px h-px opacity-0 pointer-events-none"
          autoPlay
          muted
          playsInline
        />
        <video
          ref={clipVideoRef as React.RefObject<HTMLVideoElement>}
          className="absolute w-px h-px opacity-0 pointer-events-none"
          muted
          playsInline
          loop
        />
        <div
          className="relative w-full max-h-full"
          style={{ aspectRatio, maxWidth: "100%" }}
        >
          <canvas
            ref={canvasRef as React.RefObject<HTMLCanvasElement>}
            className="absolute inset-0 w-full h-full object-contain rounded-sm"
          />
          {mode === "idle" && (
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-4 ${
                mono ? "bg-white/90" : "bg-black/40"
              }`}
            >
              <p
                className={`font-mono text-[10px] tracking-widest uppercase ${
                  mono ? "text-black/80" : "text-white/70"
                }`}
              >
                Preview off
              </p>
              <p
                className={`font-mono text-[9px] leading-relaxed max-w-[14rem] ${
                  mono ? "text-black/70" : "text-white/50"
                }`}
              >
                Upload a Track 1 video or enable camera for 9:16 export
              </p>
              <button
                type="button"
                onClick={onStartCamera}
                className={`px-3 py-1.5 rounded-sm border font-mono text-[10px] tracking-widest uppercase transition-colors ${
                  mono
                    ? "border-black/35 bg-black hover:bg-black/85"
                    : "border-white/20 text-white/70 hover:text-white/90 hover:border-white/40"
                }`}
                style={mono ? { color: "#ffffff" } : undefined}
              >
                Start camera
              </button>
            </div>
          )}
          {mode === "camera" && (
            <button
              type="button"
              onClick={onStopCamera}
              className="absolute top-2 right-2 z-10 px-2 py-1 rounded-sm border border-white/15 bg-black/50 font-mono text-[9px] tracking-widest uppercase text-white/70 hover:text-white"
            >
              Stop camera
            </button>
          )}
          {isCapturing && (
            <div className="absolute top-2 left-2 font-mono text-[9px] tracking-widest uppercase text-red-300/90">
              Rec
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="font-mono text-[10px] text-red-300/80">{error}</p>
      )}
    </div>
  );
}
