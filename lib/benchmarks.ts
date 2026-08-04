import catalogJson from "@/data/models.json";
import type {
  Benchmark,
  BenchmarkCategory,
  BenchmarkId,
  Catalog,
  Model,
} from "./types";

/**
 * The benchmark registry. It lives in `data/models.json` rather than here so a
 * benchmark can be added, retired or re-ranged without touching code — the
 * metric pickers, table rows, leaderboards, radar axes and capability index are
 * all generated from this list.
 */
export const BENCHMARKS: Benchmark[] = (catalogJson as unknown as Catalog).meta.benchmarks;

export const BENCHMARK_BY_ID = new Map(BENCHMARKS.map((b) => [b.id, b]));

/** Benchmarks that still separate frontier models — the default UI surface. */
export const HEADLINE = BENCHMARKS.filter((b) => b.tier === "headline");

/**
 * Saturated benchmarks. They stay in the catalog because most models have no
 * headline result and a floor is better than a blank, but they are collapsed by
 * default and never lead a picker.
 */
export const FLOOR = BENCHMARKS.filter((b) => b.tier === "floor");

/** Benchmarks reported in something other than a percentage. */
export const SCALAR = BENCHMARKS.filter((b) => b.scale !== "pct");

export const CATEGORY_LABELS: Record<BenchmarkCategory, string> = {
  agentic: "Agentic work",
  coding: "Coding",
  reasoning: "Reasoning",
  math: "Math",
  knowledge: "Knowledge",
  tooluse: "Tool use",
  multimodal: "Multimodal",
  composite: "Composite",
  scale: "Other scales",
};

export const CATEGORY_BLURBS: Record<BenchmarkCategory, string> = {
  agentic: "Long-horizon work in a real environment — a shell, a desktop, a business system",
  coding: "Writing and repairing code against tests the model has not seen",
  reasoning: "Problems that resist retrieval and pattern-matching",
  math: "Competition and research mathematics",
  knowledge: "Breadth of factual and applied knowledge",
  tooluse: "Calling functions correctly, in the right order, with the right arguments",
  multimodal: "Understanding across images, documents and video",
  composite: "Indices built from other benchmarks",
  scale: "Measures that are not a percentage — ratings and durations",
};

export const CATEGORY_ORDER: BenchmarkCategory[] = [
  "agentic",
  "coding",
  "reasoning",
  "math",
  "knowledge",
  "tooluse",
  "multimodal",
  "composite",
  "scale",
];

/**
 * The categories the capability index averages. Multimodal is excluded because
 * a text-only model would be penalized for a modality it never claimed;
 * composite and scale are excluded because they either restate other
 * benchmarks or are not on a 0-100 scale at all.
 */
export const INDEX_CATEGORIES: BenchmarkCategory[] = [
  "agentic",
  "coding",
  "reasoning",
  "math",
  "knowledge",
  "tooluse",
];

export const CATEGORIES_PRESENT: BenchmarkCategory[] = CATEGORY_ORDER.filter((c) =>
  BENCHMARKS.some((b) => b.category === c)
);

export function benchmarksIn(category: BenchmarkCategory): Benchmark[] {
  return BENCHMARKS.filter((b) => b.category === category);
}

export function scoreOf(m: Model, id: BenchmarkId): number | null {
  const v = m.scores[id];
  return typeof v === "number" ? v : null;
}

/**
 * A raw score placed on a common 0-100 scale by where it sits in the
 * benchmark's own useful span. This is what makes an ARC-AGI-2 result and an
 * MMLU-Pro result addable: without it, publishing a hard benchmark would drag a
 * frontier model's mean below a mid-tier model that only published an easy one.
 *
 * The same mechanism is what lets GDPval into the index despite being reported
 * as an Elo: its range is anchored at the human baseline, so the normalized
 * value still means "how far above a professional's work", which is the thing
 * the other agentic benchmarks are measuring too.
 */
export function normalize(b: Benchmark, raw: number): number {
  const [lo, hi] = b.range;
  if (hi <= lo) return 0;
  return Math.max(0, Math.min(100, ((raw - lo) / (hi - lo)) * 100));
}

/** Mean of the normalized scores a model has in one category, or null. */
export function categoryScore(m: Model, category: BenchmarkCategory): number | null {
  const vals: number[] = [];
  for (const b of BENCHMARKS) {
    if (b.category !== category || !b.inIndex) continue;
    const raw = scoreOf(m, b.id);
    if (raw !== null) vals.push(normalize(b, raw));
  }
  if (!vals.length) return null;
  return vals.reduce((a, v) => a + v, 0) / vals.length;
}

export function categoryScores(m: Model): Partial<Record<BenchmarkCategory, number>> {
  const out: Partial<Record<BenchmarkCategory, number>> = {};
  for (const c of CATEGORIES_PRESENT) {
    const v = categoryScore(m, c);
    if (v !== null) out[c] = v;
  }
  return out;
}

/**
 * Equal weight per category, over the categories a model has any data for. One
 * benchmark in a category counts as much as six, which is the point: the number
 * tracks how broadly a model is good rather than how much its vendor published.
 */
export function capabilityIndex(cats: Partial<Record<BenchmarkCategory, number>>): number | null {
  const vals = INDEX_CATEGORIES.map((c) => cats[c]).filter((v): v is number => v !== undefined);
  if (!vals.length) return null;
  const mean = vals.reduce((a, v) => a + v, 0) / vals.length;
  // A model measured in one category is not thereby a broad model. Coverage on
  // the newer benchmarks is thin enough that a single strong agentic result
  // would otherwise top the catalog, so the mean is discounted by how much of
  // the field a model has actually been measured on. This reads as missing
  // evidence, not as evidence of weakness — which is why the index is shown
  // next to the per-category scores rather than on its own.
  return mean * (0.6 + 0.4 * coverage(cats));
}

/** How many of the indexed categories a model actually has data for, 0-1. */
export function coverage(cats: Partial<Record<BenchmarkCategory, number>>): number {
  const have = INDEX_CATEGORIES.filter((c) => cats[c] !== undefined).length;
  return have / INDEX_CATEGORIES.length;
}

/** Benchmarks a given model has a published figure for, in registry order. */
export function publishedFor(m: Model): Benchmark[] {
  return BENCHMARKS.filter((b) => scoreOf(m, b.id) !== null);
}
