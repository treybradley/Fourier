import { useReducer, useCallback } from "react";
import type { ArcState, ArcAction, ArcTrack } from "./types";
import { bridgeId, makeBridge } from "./types";
import { PlanWorkspace } from "./PlanWorkspace";
import { StoryWorkspace } from "./StoryWorkspace";
import { useArcAnalyzer } from "../../hooks/useArcAnalyzer";
import { useVisualMode } from "../../hooks/useVisualMode";

const INITIAL_STATE: ArcState = {
  projectTitle: "Untitled Project (edit)",
  projectType: "djset",
  tracks: [],
  bridges: {},
  activeTab: "plan",
  expandedTrackId: null,
  storyLayers: {
    energy: true,
    tempo: true,
    harmonic: false,
    sub: false,
    bass: false,
    mids: false,
    highs: false,
  },
};

function reducer(state: ArcState, action: ArcAction): ArcState {
  switch (action.type) {
    case "ADD_TRACKS": {
      const newTracks = [...state.tracks, ...action.tracks];
      const newBridges = { ...state.bridges };
      for (let i = 0; i < newTracks.length - 1; i++) {
        const id = bridgeId(newTracks[i], newTracks[i + 1]);
        if (!newBridges[id]) newBridges[id] = makeBridge(id);
      }
      return {
        ...state,
        tracks: newTracks,
        bridges: newBridges,
      };
    }
    case "UPDATE_TRACK":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.id ? { ...t, ...action.updates } : t,
        ),
      };
    case "REMOVE_TRACK":
      return {
        ...state,
        tracks: state.tracks.filter((t) => t.id !== action.id),
      };
    case "REORDER_TRACKS": {
      const tracks = [...state.tracks];
      const [moved] = tracks.splice(action.fromIndex, 1);
      tracks.splice(action.toIndex, 0, moved);
      const newBridges = { ...state.bridges };
      for (let i = 0; i < tracks.length - 1; i++) {
        const id = bridgeId(tracks[i], tracks[i + 1]);
        if (!newBridges[id]) newBridges[id] = makeBridge(id);
      }
      return { ...state, tracks, bridges: newBridges };
    }
    case "UPDATE_BRIDGE": {
      const existing =
        state.bridges[action.id] ?? makeBridge(action.id);
      return {
        ...state,
        bridges: {
          ...state.bridges,
          [action.id]: { ...existing, ...action.updates },
        },
      };
    }
    case "SET_TAB":
      return { ...state, activeTab: action.tab };
    case "SET_EXPANDED":
      return { ...state, expandedTrackId: action.id };
    case "TOGGLE_STORY_LAYER":
      return {
        ...state,
        storyLayers: {
          ...state.storyLayers,
          [action.layer]: !state.storyLayers[action.layer],
        },
      };
    case "SET_PROJECT_TITLE":
      return { ...state, projectTitle: action.title };
    case "SET_PROJECT_TYPE":
      return { ...state, projectType: action.projectType };
    default:
      return state;
  }
}

export function ArcApp() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const { analyzeFile } = useArcAnalyzer();
  const { mono } = useVisualMode();

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).filter(
        (f) =>
          f.type.startsWith("audio/") ||
          /\.(mp3|wav|flac|aac|ogg|m4a)$/i.test(f.name),
      );
      if (fileArray.length === 0) return;

      // Add placeholder tracks immediately
      const placeholders: ArcTrack[] = fileArray.map(
        (f) => ({
          id: crypto.randomUUID(),
          title: f.name.replace(/\.[^.]+$/, "").trim(),
          artist: "",
          duration: 0,
          bpm: null,
          key: null,
          camelot: null,
          chroma: null,
          chromaFrames: null,
          waveform: null,
          fileUrl: URL.createObjectURL(f),
          energy: 0.5,
          sub: 0.5,
          bass: 0.5,
          mids: 0.5,
          highs: 0.5,
          notes: "",
          analyzing: true,
        }),
      );

      dispatch({ type: "ADD_TRACKS", tracks: placeholders });

      // Analyze each file
      for (let i = 0; i < fileArray.length; i++) {
        try {
          const results = await analyzeFile(fileArray[i]);
          dispatch({
            type: "UPDATE_TRACK",
            id: placeholders[i].id,
            updates: { ...results, analyzing: false },
          });
        } catch (err) {
          console.error(
            "Analysis failed for",
            fileArray[i].name,
            err,
          );
          dispatch({
            type: "UPDATE_TRACK",
            id: placeholders[i].id,
            updates: { analyzing: false },
          });
        }
      }
    },
    [analyzeFile],
  );

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 flex-shrink-0">
        {/* Tab toggle */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-sm border border-white/10 bg-white/[0.03]">
          {(["plan", "story"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => dispatch({ type: "SET_TAB", tab })}
              className={`px-3 py-1 text-[10px] font-mono tracking-widest uppercase rounded-sm transition-all ${
                state.activeTab === tab
                  ? mono
                    ? "text-white"
                    : "text-white/90"
                  : "text-white/30 hover:text-white/55"
              }`}
              style={
                state.activeTab === tab
                  ? mono
                    ? {
                        background: "#111111",
                        color: "#ffffff",
                        borderRadius: "2px",
                      }
                    : {
                        background: "rgba(0,157,255,0.20)",
                        borderRadius: "2px",
                      }
                  : {}
              }
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Project title */}
        <input
          className="flex-1 bg-transparent border-none outline-none text-white/70 text-sm font-medium placeholder:text-white/20 min-w-0"
          value={state.projectTitle}
          onChange={(e) =>
            dispatch({
              type: "SET_PROJECT_TITLE",
              title: e.target.value,
            })
          }
          placeholder="Project title…"
        />

        {/* Project type */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-sm border border-white/10 bg-white/[0.03]">
          {(
            [
              ["djset", "DJ Set"],
              ["mashup", "Mashup"],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              onClick={() =>
                dispatch({
                  type: "SET_PROJECT_TYPE",
                  projectType: val,
                })
              }
              className={`px-2.5 py-1 text-[9px] font-mono tracking-widest uppercase rounded-sm transition-all ${
                state.projectType === val
                  ? "text-white/80 bg-white/10"
                  : "text-white/25 hover:text-white/45"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Track count */}
        {state.tracks.length > 0 && (
          <span className="text-white/20 text-[9px] font-mono tabular-nums flex-shrink-0">
            {state.tracks.length} track
            {state.tracks.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Workspace */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {state.activeTab === "plan" ? (
          <PlanWorkspace
            state={state}
            dispatch={dispatch}
            onFiles={handleFiles}
          />
        ) : (
          <StoryWorkspace state={state} dispatch={dispatch} />
        )}
      </div>
    </div>
  );
}