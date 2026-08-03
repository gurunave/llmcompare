export type License = "proprietary" | "open";
export type LocalTier = "laptop" | "workstation" | "server" | "cluster" | null;
export type Modality = "text" | "image" | "audio" | "video";

export type ScoreKey = "mmluPro" | "gpqa" | "swebench" | "aime" | "mmmu";

export type AttentionKind = "mha" | "gqa" | "mla" | "hybrid";

/**
 * What it takes to size a model in memory. Only open-weight entries carry one —
 * a hosted model publishes no architecture, and guessing one would be inventing
 * a number the catalog does not have.
 */
export interface ModelArch {
  layers: number;
  /** Blocks that actually hold a KV cache — fewer than `layers` for SSM hybrids. */
  kvLayers: number;
  /** Key/value heads after GQA grouping. Null on MLA, where the latent replaces them. */
  kvHeads: number | null;
  headDim: number | null;
  attn: AttentionKind;
  /** MLA's compressed cache width (latent + RoPE), cached once rather than as K and V. */
  kvLatentDim: number | null;
  /** Billions active per token. Null means dense — every parameter runs every token. */
  activeParams: number | null;
  /** Local-attention window, when the model interleaves windowed and full layers. */
  slidingWindow: number | null;
  /** One in every N layers is full-attention; the rest use `slidingWindow`. */
  globalEvery: number | null;
  /** Whether these came from a published config or were scaled from a sibling. */
  source: "config" | "estimated";
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  released: string;
  license: License;
  params: number | null;
  localTier: LocalTier;
  arch?: ModelArch;
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
