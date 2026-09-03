import { BENCHMARKS, CATEGORY_ORDER, scoreOf } from "./benchmarks";
import { MODELS } from "./models";
import type { Benchmark, BenchmarkCategory, DerivedModel } from "./types";

/**
 * How much of the catalog is actually measured.
 *
 * The scores are sparse by design — a benchmark a model has no published
 * result for is absent rather than zero — which is right for every chart but
 * leaves one question unanswered everywhere else: how much data is there, and
 * where are the holes? Everything here answers that and nothing else. It reads
 * the same registry the rest of the app does, so a benchmark added to
 * `data/models.json` shows up here with no edit.
 */

/** One benchmark, and which of the models in the pool report it. */
export interface BenchmarkCoverage {
  benchmark: Benchmark;
  /** Models with a published figure, newest release first. */
  reported: DerivedModel[];
  /** Models with no published figure, newest release first. */
  missing: DerivedModel[];
  /** Providers with at least one model reporting it, alphabetical. */
  providers: string[];
  /** Reported ÷ pool size, 0–1. Zero when the pool is empty. */
  share: number;
}

/** One model, and which of the benchmarks in the pool it reports. */
export interface ModelCoverage {
  model: DerivedModel;
  reported: Benchmark[];
  missing: Benchmark[];
  share: number;
}

/** One category, aggregated over every benchmark in it. */
export interface CategoryCoverage {
  category: BenchmarkCategory;
  benchmarks: Benchmark[];
  /** Published figures across the category — cells, not models. */
  filled: number;
  /** Benchmarks × models: how many figures the category could hold. */
  cells: number;
  share: number;
  /** Models reporting at least one benchmark in the category. */
  modelsWithAny: number;
}

export interface Coverage {
  models: DerivedModel[];
  benchmarks: Benchmark[];
  /** Published figures in the pool. */
  filled: number;
  /** Models × benchmarks — every figure that could exist. */
  cells: number;
  /** Filled ÷ cells, 0–1. The headline density number. */
  share: number;
  byBenchmark: BenchmarkCoverage[];
  byModel: ModelCoverage[];
  byCategory: CategoryCoverage[];
  /** Models with no published figure at all against this benchmark pool. */
  unmeasured: DerivedModel[];
}

function newestFirst(a: DerivedModel, b: DerivedModel): number {
  return b.released.localeCompare(a.released) || a.name.localeCompare(b.name);
}

/**
 * Coverage over an arbitrary pool. Both arguments are narrowed by the page's
 * filters, so the density shown always describes the rows on screen rather
 * than the whole catalog — filtering to one provider answers "how well is
 * *this* provider measured", which the catalog-wide number cannot.
 */
export function coverageOf(
  models: DerivedModel[] = MODELS,
  benchmarks: Benchmark[] = BENCHMARKS
): Coverage {
  const sorted = [...models].sort(newestFirst);

  const byBenchmark: BenchmarkCoverage[] = benchmarks.map((benchmark) => {
    const reported: DerivedModel[] = [];
    const missing: DerivedModel[] = [];
    for (const m of sorted) {
      (scoreOf(m, benchmark.id) !== null ? reported : missing).push(m);
    }
    return {
      benchmark,
      reported,
      missing,
      providers: Array.from(new Set(reported.map((m) => m.provider))).sort(),
      share: sorted.length ? reported.length / sorted.length : 0,
    };
  });

  const byModel: ModelCoverage[] = sorted.map((model) => {
    const reported = benchmarks.filter((b) => scoreOf(model, b.id) !== null);
    const missing = benchmarks.filter((b) => scoreOf(model, b.id) === null);
    return {
      model,
      reported,
      missing,
      share: benchmarks.length ? reported.length / benchmarks.length : 0,
    };
  });

  const byCategory: CategoryCoverage[] = CATEGORY_ORDER.map((category) => {
    const inCategory = benchmarks.filter((b) => b.category === category);
    const filled = byBenchmark
      .filter((c) => c.benchmark.category === category)
      .reduce((n, c) => n + c.reported.length, 0);
    return {
      category,
      benchmarks: inCategory,
      filled,
      cells: inCategory.length * sorted.length,
      share: inCategory.length && sorted.length ? filled / (inCategory.length * sorted.length) : 0,
      modelsWithAny: sorted.filter((m) => inCategory.some((b) => scoreOf(m, b.id) !== null)).length,
    };
  }).filter((c) => c.benchmarks.length > 0);

  const filled = byModel.reduce((n, c) => n + c.reported.length, 0);
  const cells = sorted.length * benchmarks.length;

  return {
    models: sorted,
    benchmarks,
    filled,
    cells,
    share: cells ? filled / cells : 0,
    byBenchmark,
    byModel,
    byCategory,
    unmeasured: byModel.filter((c) => c.reported.length === 0).map((c) => c.model),
  };
}

/** `0.179` → `18%`. Rounded to a whole point above 1%, one decimal below it. */
export function formatShare(share: number): string {
  const pct = share * 100;
  if (pct > 0 && pct < 1) return `${pct.toFixed(1)}%`;
  return `${Math.round(pct)}%`;
}

/**
 * A density read as a word. The thresholds are deliberately generous: with the
 * whole catalog at 18% filled, calling a benchmark with a fifth of the field
 * "thin" would label almost everything thin and say nothing.
 */
export type CoverageBand = "none" | "sparse" | "partial" | "broad";

export function bandOf(share: number): CoverageBand {
  if (share <= 0) return "none";
  if (share < 0.15) return "sparse";
  if (share < 0.5) return "partial";
  return "broad";
}

export const BAND_LABELS: Record<CoverageBand, string> = {
  none: "No data",
  sparse: "Sparse",
  partial: "Partial",
  broad: "Broad",
};

/** Muted through to full accent — the bar's fill carries the same reading. */
export const BAND_TINTS: Record<CoverageBand, string> = {
  none: "var(--text-muted)",
  sparse: "var(--series-5)",
  partial: "var(--series-3)",
  broad: "var(--series-1)",
};
