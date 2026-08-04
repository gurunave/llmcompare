import {
  BENCHMARKS,
  CATEGORY_BLURBS,
  CATEGORY_LABELS,
  INDEX_CATEGORIES,
  benchmarksIn,
  scoreOf,
} from "./benchmarks";
import { formatElo, formatHours, formatPrice, formatScore, formatTokens } from "./format";
import type { Benchmark, DerivedModel } from "./types";

/**
 * A quantity either axis of the cost/capability scatter can plot. Log metrics
 * span orders of magnitude (prices, context, params); the rest are read on a
 * linear scale.
 */
export interface Metric {
  key: string;
  /** Name in the axis picker. */
  label: string;
  /** Axis title — carries the unit. */
  axisLabel: string;
  value: (m: DerivedModel) => number | null;
  format: (v: number) => string;
  log?: boolean;
  /** Benchmark-style 0-100 scores, so the domain never leaves that range. */
  bounded?: boolean;
  /** Set on the metrics that stand for "how good is it" — see SCORE_METRICS. */
  capabilityLike?: boolean;
  /** What the quantity is, for the info hint next to a picker. */
  hint?: string;
  /** Where the figures come from. Only benchmarks carry one. */
  source?: string;
}

/** One metric per benchmark in the registry, on whatever scale it reports in. */
function benchmarkMetric(b: Benchmark): Metric {
  const common = {
    key: b.id,
    label: b.label,
    value: (m: DerivedModel) => scoreOf(m, b.id),
    hint: `${b.blurb}.`,
    source: b.source,
  };
  if (b.scale === "elo") {
    return { ...common, axisLabel: `${b.label} rating`, format: formatElo };
  }
  if (b.scale === "hours") {
    return { ...common, axisLabel: `${b.label} (hours)`, format: formatHours, log: true };
  }
  return {
    ...common,
    axisLabel: `${b.label} score`,
    format: formatScore,
    bounded: true,
    capabilityLike: true,
  };
}

/** One metric per benchmark category — the aggregate the radar axes plot. */
function categoryMetric(category: (typeof INDEX_CATEGORIES)[number]): Metric {
  const behind = benchmarksIn(category)
    .filter((b) => b.inIndex)
    .map((b) => b.label)
    .join(", ");
  return {
    key: `cat:${category}`,
    label: `${CATEGORY_LABELS[category]} score`,
    axisLabel: `${CATEGORY_LABELS[category]} score`,
    value: (m) => m.categories[category] ?? null,
    format: formatScore,
    bounded: true,
    capabilityLike: true,
    hint: `${CATEGORY_BLURBS[category]}. Averages the benchmarks a model published in this category, each placed against its own useful range first.`,
    source: `Built from: ${behind}`,
  };
}

export const METRICS: Metric[] = [
  {
    key: "price",
    hint: "Input and output list rates blended at a 3:1 token mix, roughly the shape of a typical API workload.",
    label: "Blended price",
    axisLabel: "Blended $ / 1M tokens",
    value: (m) => m.blendedPrice,
    format: formatPrice,
    log: true,
  },
  {
    key: "inputPrice",
    hint: "List rate for prompt tokens, per million.",
    label: "Input price",
    axisLabel: "Input $ / 1M tokens",
    value: (m) => m.pricing.input,
    format: formatPrice,
    log: true,
  },
  {
    key: "outputPrice",
    hint: "List rate for generated tokens, per million. Usually several times the input rate.",
    label: "Output price",
    axisLabel: "Output $ / 1M tokens",
    value: (m) => m.pricing.output,
    format: formatPrice,
    log: true,
  },
  {
    key: "capability",
    hint: "Each published score placed against its own benchmark's useful range, averaged within its category, then averaged across categories with equal weight. Thin records are nudged down so a single result cannot top the catalog.",
    label: "Capability index",
    axisLabel: "Capability index",
    value: (m) => m.capability,
    format: formatScore,
    bounded: true,
    capabilityLike: true,
  },
  ...INDEX_CATEGORIES.map(categoryMetric),
  ...BENCHMARKS.map(benchmarkMetric),
  {
    key: "speed",
    hint: "Output tokens per second at the provider's standard tier, excluding time to first token.",
    label: "Output speed",
    axisLabel: "Output tokens / sec",
    value: (m) => m.speed,
    format: (v) => String(Math.round(v)),
    log: true,
  },
  {
    key: "context",
    hint: "How many tokens of prompt and history the model can attend to at once.",
    label: "Context window",
    axisLabel: "Context window (tokens)",
    value: (m) => m.context,
    format: formatTokens,
    log: true,
  },
  {
    key: "maxOutput",
    hint: "The longest single response the model will generate.",
    label: "Max output",
    axisLabel: "Max output (tokens)",
    value: (m) => m.maxOutput,
    format: formatTokens,
    log: true,
  },
  {
    key: "params",
    hint: "Total parameter count. Published only for open-weight models; a mixture-of-experts runs far fewer per token.",
    label: "Parameters",
    axisLabel: "Parameters (B)",
    value: (m) => m.params,
    format: (v) => (v >= 1000 ? `${(v / 1000).toFixed(1).replace(/\.0$/, "")}T` : `${v}B`),
    log: true,
  },
];

export const METRIC_BY_KEY = new Map(METRICS.map((m) => [m.key, m]));

/**
 * The 0-100 capability metrics: the index, each category, and each benchmark
 * behind them. These are the quantities that can stand in for "how good is it"
 * on an axis, which is what makes them interchangeable in a picker. Elo and
 * time horizons are excluded — they are not on this scale and cannot share it.
 */
export const SCORE_METRICS: Metric[] = METRICS.filter((m) => m.capabilityLike);

export const DEFAULT_X = "price";
export const DEFAULT_Y = "capability";
export const DEFAULT_SCORE = "capability";

export function metricOf(key: string, fallback: string): Metric {
  return METRIC_BY_KEY.get(key) ?? (METRIC_BY_KEY.get(fallback) as Metric);
}

export interface AxisScale {
  domain: [number, number];
  ticks: number[];
  log: boolean;
}

const LOG_MANTISSAS = [1, 2, 3, 5];

/** Domain and ticks that cover the plotted values without clipping any point. */
export function axisScale(metric: Metric, values: number[]): AxisScale {
  if (!values.length) {
    return { domain: metric.log ? [0.1, 10] : [0, 100], ticks: [], log: !!metric.log };
  }
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (metric.log) {
    const lo = logStep(Math.max(min, 1e-6), "down");
    const hi = logStep(Math.max(max, lo * 1.0001), "up");
    return { domain: [lo, hi], ticks: logTicks(lo, hi), log: true };
  }

  const step = niceStep((max - min) / 5 || Math.max(max, 1) / 5);
  let lo = Math.floor(min / step) * step;
  let hi = Math.ceil(max / step) * step;
  if (metric.bounded) {
    lo = Math.max(0, lo);
    hi = Math.min(100, hi);
  }
  if (hi <= lo) hi = lo + step;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(round(t));
  return { domain: [round(lo), round(hi)], ticks, log: false };
}

/** Snap to the nearest 1/2/3/5 × 10^k boundary at or beyond `value`. */
function logStep(value: number, dir: "up" | "down"): number {
  const decade = Math.floor(Math.log10(value));
  const candidates: number[] = [];
  for (const d of [decade - 1, decade, decade + 1]) {
    for (const m of LOG_MANTISSAS) candidates.push(round(m * 10 ** d));
  }
  candidates.sort((a, b) => a - b);
  if (dir === "down") {
    const under = candidates.filter((c) => c <= value * 1.0001);
    return under.length ? under[under.length - 1] : candidates[0];
  }
  const over = candidates.filter((c) => c >= value * 0.9999);
  return over.length ? over[0] : candidates[candidates.length - 1];
}

/** Powers of ten, thinned to 1/3 steps when the span is short enough to fit them. */
function logTicks(lo: number, hi: number): number[] {
  const span = Math.log10(hi) - Math.log10(lo);
  const mantissas = span <= 3 ? [1, 3] : [1];
  const ticks: number[] = [];
  for (let d = Math.floor(Math.log10(lo)); d <= Math.ceil(Math.log10(hi)); d += 1) {
    for (const m of mantissas) {
      const t = round(m * 10 ** d);
      if (t >= lo * 0.999 && t <= hi * 1.001) ticks.push(t);
    }
  }
  return ticks;
}

function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const decade = 10 ** Math.floor(Math.log10(raw));
  const scaled = raw / decade;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 2.5 ? 2.5 : scaled <= 5 ? 5 : 10;
  return step * decade;
}

function round(n: number): number {
  return Number(n.toPrecision(12));
}
