import { EXPORT_HEIGHT, EXPORT_WIDTH } from "../../utils/exportFormat";

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
  cameraLive,
  isCapturing,
  onStartCamera,
  onStopCamera,
  error,
}: HarmonizerMediaPanelProps) {
  const aspectRatio = `${EXPORT_WIDTH} / ${EXPORT_HEIGHT}`;

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
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-4">
              <p className="font-mono text-[10px] tracking-widest uppercase text-white/40">
                Preview off
              </p>
              <p className="font-mono text-[9px] text-white/25 leading-relaxed">
                Upload a Track 1 video or enable camera for 9:16 export
              </p>
            </div>
          )}
          {isCapturing && (
            <div className="absolute top-2 right-2 font-mono text-[9px] tracking-widest uppercase text-red-300/90">
              Rec
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="font-mono text-[10px] text-red-300/80">{error}</p>
      )}

      {mode !== "clip" && (
        <button
          type="button"
          onClick={() => (cameraLive ? onStopCamera() : onStartCamera())}
          className="self-start px-3 py-1.5 rounded-sm border border-white/12 font-mono text-[10px] tracking-widest uppercase text-white/50 hover:text-white/80"
        >
          {cameraLive ? "Stop camera" : "Start camera"}
        </button>
      )}
    </div>
  );
}
