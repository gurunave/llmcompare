export type License = "proprietary" | "open";
export type LocalTier = "laptop" | "workstation" | "server" | "cluster" | null;
export type Modality = "text" | "image" | "audio" | "video";

export type ScoreKey = "mmluPro" | "gpqa" | "swebench" | "aime" | "mmmu";

export interface Model {
  id: string;
  name: string;
  provider: string;
  released: string;
  license: License;
  params: number | null;
  localTier: LocalTier;
  context: number;
  maxOutput: number;
  modalities: Modality[];
  reasoning: boolean;
  pricing: { input: number; output: number };
  cutoff: string;
  speed: number;
  scores: Record<ScoreKey, number | null>;
  tags: string[];
  url: string;
}

export interface Catalog {
  meta: {
    lastReviewed: string;
    priceUnit: string;
    disclaimer: string;
    benchmarks: Record<ScoreKey, string>;
  };
  models: Model[];
}

/** Radar axes — every value normalized to 0-100 across the whole catalog. */
export type AxisKey =
  | "knowledge"
  | "reasoning"
  | "coding"
  | "math"
  | "speed"
  | "value"
  | "context";

export interface DerivedModel extends Model {
  /** Mean of the published capability benchmarks, 0-100. */
  capability: number | null;
  /** Blended $/1M tokens at a 3:1 input:output mix. */
  blendedPrice: number;
  axes: Record<AxisKey, number | null>;
}
