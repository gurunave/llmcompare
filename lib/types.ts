export type License = "proprietary" | "open";
export type LocalTier = "laptop" | "workstation" | "server" | "cluster" | null;
export type Modality = "text" | "image" | "audio" | "video";

export type BenchmarkId = string;

/**
 * What a benchmark is trying to measure. The capability index averages one
 * score per category rather than one per benchmark, so a family that ships six
 * agentic evals does not outvote a category that only has one.
 */
export type BenchmarkCategory =
  | "agentic"
  | "coding"
  | "reasoning"
  | "math"
  | "knowledge"
  | "tooluse"
  | "multimodal"
  | "composite"
  | "scale";

/**
 * The unit a benchmark reports in. Only `pct` can be compared against another
 * benchmark; `elo` is a relative rating with no fixed ceiling and `hours` is a
 * duration, so both stay out of every mean and get their own axis instead.
 */
export type BenchmarkScale = "pct" | "elo" | "hours";

/**
 * `headline` benchmarks still separate frontier models. `floor` ones are at or
 * near their ceiling — kept because they establish a capability floor and
 * because most of the catalog has no headline data, but demoted in the UI.
 */
export type BenchmarkTier = "headline" | "floor";

export interface Benchmark {
  id: BenchmarkId;
  /** Full name, as the benchmark's own authors write it. */
  label: string;
  /** Short form for chips and table headers. */
  short: string;
  blurb: string;
  category: BenchmarkCategory;
  scale: BenchmarkScale;
  tier: BenchmarkTier;
  /**
   * The span a raw score is read against when it is normalized for the
   * capability index. A fixed span rather than the catalog's own min and max:
   * with eight published results, min-max would hand the lowest of the eight a
   * zero and move every score each time a ninth model appeared. Ignored for
   * `elo` and `hours`, which are never normalized.
   */
  range: [number, number];
  /** Composites are built from other benchmarks; counting them again double-weights. */
  inIndex: boolean;
  /** Where these figures were read from, named on the methodology page. */
  source: string;
}

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
  /**
   * Sparse: a benchmark a model has no published result for is absent, not
   * null. Adding a benchmark to the registry therefore costs no edit here.
   */
  scores: Record<BenchmarkId, number>;
  tags: string[];
  url: string;
}

export interface Catalog {
  meta: {
    lastReviewed: string;
    priceUnit: string;
    disclaimer: string;
    benchmarks: Benchmark[];
  };
  models: Model[];
}

/** Radar axes — every value normalized to 0-100. */
export type AxisKey =
  | "agentic"
  | "coding"
  | "reasoning"
  | "math"
  | "knowledge"
  | "tooluse"
  | "speed"
  | "value"
  | "context";

export interface DerivedModel extends Model {
  /**
   * Equal-weight mean of the category scores a model has data for, 0-100. Not
   * a mean of raw benchmark scores — see `lib/benchmarks.ts`.
   */
  capability: number | null;
  /** Per-category means of the normalized scores, for the categories with data. */
  categories: Partial<Record<BenchmarkCategory, number>>;
  /** Blended $/1M tokens at a 3:1 input:output mix. */
  blendedPrice: number;
  axes: Record<AxisKey, number | null>;
}
