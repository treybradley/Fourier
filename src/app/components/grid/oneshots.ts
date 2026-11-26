export type OneShotCategory =
  | "kick"
  | "snare"
  | "percussion"
  | "cymbals";

export type OneShotSample = {
  id: string;
  name: string;
  category: OneShotCategory;
  path: string;
  bytes: number;
};

export type OneShotManifest = {
  version: number;
  categories: OneShotCategory[];
  count: number;
  samples: OneShotSample[];
};

export const ONE_SHOT_CATEGORIES: {
  id: OneShotCategory;
  label: string;
}[] = [
  { id: "kick", label: "Kick" },
  { id: "snare", label: "Snare" },
  { id: "percussion", label: "Perc" },
  { id: "cymbals", label: "Cymbals" },
];

let manifestPromise: Promise<OneShotManifest> | null = null;

export function loadOneShotManifest(): Promise<OneShotManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch("/oneshots/manifest.json")
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load oneshots (${r.status})`);
        return r.json() as Promise<OneShotManifest>;
      })
      .catch((err) => {
        manifestPromise = null;
        throw err;
      });
  }
  return manifestPromise;
}

export async function fetchOneShotBuffer(
  path: string,
  ctx: AudioContext,
): Promise<AudioBuffer> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to fetch sample (${res.status})`);
  const ab = await res.arrayBuffer();
  return ctx.decodeAudioData(ab.slice(0));
}
