import { useCallback, useRef, useState } from "react";
import type { ArcState, ArcAction } from "./types";
import { bridgeId } from "./types";
import type { Dispatch } from "react";
import { TrackCard } from "./TrackCard";
import { BridgeCard } from "./BridgeCard";
import { ImportZone } from "./ImportZone";

interface PlanWorkspaceProps {
  state: ArcState;
  dispatch: Dispatch<ArcAction>;
  onFiles: (files: FileList | File[]) => void;
}

export function PlanWorkspace({ state, dispatch, onFiles }: PlanWorkspaceProps) {
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDropTarget, setIsDropTarget] = useState(false);

  const handleDragStart = useCallback((_e: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault();
      const fromIndex = dragIndexRef.current;
      if (fromIndex !== null && fromIndex !== toIndex) {
        dispatch({ type: "REORDER_TRACKS", fromIndex, toIndex });
      }
      dragIndexRef.current = null;
      setDragOverIndex(null);
    },
    [dispatch]
  );

  // File drop on the whole workspace
  const handleWorkspaceDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDropTarget(false);
      if (dragIndexRef.current !== null) return; // track reorder, not file drop
      if (e.dataTransfer.files.length > 0) onFiles(e.dataTransfer.files);
    },
    [onFiles]
  );

  const handleWorkspaceDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndexRef.current === null) setIsDropTarget(true);
  }, []);

  const handleWorkspaceDragLeave = useCallback(() => {
    setIsDropTarget(false);
    setDragOverIndex(null);
  }, []);

  const { tracks, bridges, expandedTrackId } = state;

  return (
    <div
      className="h-full overflow-y-auto relative"
      onDrop={handleWorkspaceDrop}
      onDragOver={handleWorkspaceDragOver}
      onDragLeave={handleWorkspaceDragLeave}
    >
      {/* Full-workspace drop overlay */}
      {isDropTarget && (
        <div className="absolute inset-0 z-50 pointer-events-none border-2 border-dashed border-[#EB00F7]/40 rounded-sm bg-[#EB00F7]/5 flex items-center justify-center">
          <p className="text-[#EB00F7]/60 text-sm font-mono tracking-widest uppercase">Drop to import</p>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6 mt-6 space-y-1">
        {tracks.length === 0 ? (
          <ImportZone onFiles={onFiles} />
        ) : (
          <>
            {/* Header row with add button */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-[9px] font-mono text-white/20 uppercase tracking-widest">
                {state.projectType === "djset" ? "DJ Set · " : "Mashup · "}
                {tracks.length} track{tracks.length !== 1 ? "s" : ""}
              </span>
              <ImportZone onFiles={onFiles} compact />
            </div>

            {/* Interleaved tracks and bridges */}
            {tracks.map((track, i) => (
              <div key={track.id}>
                <TrackCard
                  track={track}
                  index={i}
                  isExpanded={expandedTrackId === track.id}
                  dispatch={dispatch}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  isDragOver={dragOverIndex === i}
                />
                {i < tracks.length - 1 && (
                  <BridgeCard
                    trackA={track}
                    trackB={tracks[i + 1]}
                    bridge={bridges[bridgeId(track, tracks[i + 1])]}
                    dispatch={dispatch}
                  />
                )}
              </div>
            ))}

            {/* Bottom spacer */}
            <div className="h-10" />
          </>
        )}
      </div>
    </div>
  );
}
