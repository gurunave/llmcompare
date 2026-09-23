import type { DerivedModel } from "./types";

export type LicenseFilter = "all" | "open" | "proprietary";

export interface BrowseFilters {
  query: string;
  provider: string;
  license: LicenseFilter;
  localOnly: boolean;
  multimodal: boolean;
  reasoning: boolean;
  fast: boolean;
  minContext: number;
  maxPrice: number;
  releasedYear: string;
}

export const DEFAULT_FILTERS: BrowseFilters = {
  query: "",
  provider: "all",
  license: "all",
  localOnly: false,
  multimodal: false,
  reasoning: false,
  fast: false,
  minContext: 0,
  maxPrice: Infinity,
  releasedYear: "all",
};

/** Floors in decimal thousands, so a 131,072-token window counts as 128K. */
export const CONTEXT_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Any context" },
  { value: 128_000, label: "128K+ context" },
  { value: 200_000, label: "200K+ context" },
  { value: 1_000_000, label: "1M+ context" },
];

/** Ceilings on the blended 3:1 price, the figure the table's $ / 1M column shows. */
export const PRICE_OPTIONS: { value: number; label: string }[] = [
  { value: Infinity, label: "Any price" },
  { value: 0.5, label: "≤ $0.50 / 1M" },
  { value: 1, label: "≤ $1 / 1M" },
  { value: 5, label: "≤ $5 / 1M" },
];

/** Same cut-off the recommender uses for "fast". */
export const FAST_TOKENS_PER_SEC = 120;

export function releaseYears(models: DerivedModel[]): string[] {
  return Array.from(new Set(models.map((m) => m.released.slice(0, 4)))).sort().reverse();
}

export function isFiltered(f: BrowseFilters): boolean {
  return (Object.keys(DEFAULT_FILTERS) as (keyof BrowseFilters)[]).some(
    (k) => f[k] !== DEFAULT_FILTERS[k]
  );
}

export function filterModels(models: DerivedModel[], f: BrowseFilters): DerivedModel[] {
  const q = f.query.trim().toLowerCase();
  return models.filter((m) => {
    if (q && !`${m.name} ${m.provider} ${m.tags.join(" ")}`.toLowerCase().includes(q)) return false;
    if (f.provider !== "all" && m.provider !== f.provider) return false;
    if (f.license !== "all" && m.license !== f.license) return false;
    if (f.localOnly && !["laptop", "workstation"].includes(m.localTier ?? "")) return false;
    if (f.multimodal && !m.modalities.includes("image")) return false;
    if (f.reasoning && !m.reasoning) return false;
    if (f.fast && m.speed < FAST_TOKENS_PER_SEC) return false;
    if (m.context < f.minContext) return false;
    if (m.blendedPrice > f.maxPrice) return false;
    if (f.releasedYear !== "all" && !m.released.startsWith(f.releasedYear)) return false;
    return true;
  });
}
