import type { Dispatch } from "react";
import type { Pad, GridAction } from "./types";
import { PadCard } from "./PadCard";

interface PadGridProps {
  pads: Pad[];
  selectedPadId: number | null;
  activePadIds: ReadonlySet<number>;
  dispatch: Dispatch<GridAction>;
  onTrigger: (padId: number) => void;
  onDropFile: (padId: number, file: File) => void;
}

export function PadGrid({ pads, selectedPadId, activePadIds, dispatch, onTrigger, onDropFile }: PadGridProps) {
  return (
    <div className="grid grid-cols-3 gap-2 w-full h-full" style={{ gridTemplateRows: "repeat(3, 1fr)" }}>
      {pads.map((pad) => (
        <PadCard
          key={pad.id}
          pad={pad}
          isSelected={selectedPadId === pad.id}
          isActive={activePadIds.has(pad.id)}
          dispatch={dispatch}
          onTrigger={onTrigger}
          onDropFile={onDropFile}
        />
      ))}
    </div>
  );
}
