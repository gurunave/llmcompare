import type { Fit } from "./hardware";

export type FitSortKey = "capability" | "speed" | "footprint" | "params" | "name";

export const FIT_SORTS: { key: FitSortKey; label: string }[] = [
  { key: "capability", label: "Most capable" },
  { key: "speed", label: "Fastest" },
  { key: "footprint", label: "Smallest footprint" },
  { key: "params", label: "Largest model" },
  { key: "name", label: "Name" },
];

export interface FitFilters {
  query: string;
  provider: string;
  /** Floor on the low end of the per-user speed range. */
  minSpeed: number;
  comfortableOnly: boolean;
  reasoning: boolean;
  multimodal: boolean;
}

export const DEFAULT_FIT_FILTERS: FitFilters = {
  query: "",
  provider: "all",
  minSpeed: 0,
  comfortableOnly: false,
  reasoning: false,
  multimodal: false,
};

export const SPEED_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Any speed" },
  { value: 5, label: "5+ tok/s" },
  { value: 10, label: "10+ tok/s" },
  { value: 20, label: "20+ tok/s" },
  { value: 50, label: "50+ tok/s" },
];

export function isFitFiltered(f: FitFilters): boolean {
  return (Object.keys(DEFAULT_FIT_FILTERS) as (keyof FitFilters)[]).some(
    (k) => f[k] !== DEFAULT_FIT_FILTERS[k]
  );
}

/**
 * Speed and headroom only describe a model that fits, so those two filters
 * drop every row that does not; the rest apply to any row.
 */
export function filterFits(fits: Fit[], f: FitFilters): Fit[] {
  const q = f.query.trim().toLowerCase();
  return fits.filter(({ model: m, best, verdict, throughput }) => {
    if (q && !`${m.name} ${m.provider} ${m.tags.join(" ")}`.toLowerCase().includes(q)) return false;
    if (f.provider !== "all" && m.provider !== f.provider) return false;
    if (f.reasoning && !m.reasoning) return false;
    if (f.multimodal && !m.modalities.includes("image")) return false;
    if (f.comfortableOnly && (!best || verdict !== "comfortable")) return false;
    if (f.minSpeed > 0 && (!throughput || throughput.low < f.minSpeed)) return false;
    return true;
  });
}

/** Memory the row is judged on: its best fit, or the smallest build when nothing fits. */
function footprintOf(f: Fit): number {
  return f.best?.total ?? f.ladder[f.ladder.length - 1]?.total ?? Infinity;
}

/** Missing values sort last whichever way the key runs. */
export function sortFits(fits: Fit[], key: FitSortKey): Fit[] {
  const value = (f: Fit): number | string | null => {
    switch (key) {
      case "capability":
        return f.model.capability;
      case "speed":
        return f.throughput?.high ?? null;
      case "footprint":
        return footprintOf(f);
      case "params":
        return f.model.params;
      case "name":
        return f.model.name.toLowerCase();
    }
  };
  const ascending = key === "footprint" || key === "name";

  return [...fits].sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    if (av === null || bv === null) return av === bv ? 0 : av === null ? 1 : -1;
    const cmp = typeof av === "string" ? av.localeCompare(bv as string) : av - (bv as number);
    return ascending ? cmp : -cmp;
  });
}
