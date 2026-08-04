import { formatPrice, formatScore, formatTokens } from "./format";
import type { DerivedModel } from "./types";

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
}

export const METRICS: Metric[] = [
  {
    key: "price",
    label: "Blended price",
    axisLabel: "Blended $ / 1M tokens",
    value: (m) => m.blendedPrice,
    format: formatPrice,
    log: true,
  },
  {
    key: "inputPrice",
    label: "Input price",
    axisLabel: "Input $ / 1M tokens",
    value: (m) => m.pricing.input,
    format: formatPrice,
    log: true,
  },
  {
    key: "outputPrice",
    label: "Output price",
    axisLabel: "Output $ / 1M tokens",
    value: (m) => m.pricing.output,
    format: formatPrice,
    log: true,
  },
  {
    key: "capability",
    label: "Mean benchmark score",
    axisLabel: "Mean benchmark score",
    value: (m) => m.capability,
    format: formatScore,
    bounded: true,
  },
  {
    key: "mmluPro",
    label: "MMLU-Pro",
    axisLabel: "MMLU-Pro score",
    value: (m) => m.scores.mmluPro,
    format: formatScore,
    bounded: true,
  },
  {
    key: "gpqa",
    label: "GPQA Diamond",
    axisLabel: "GPQA Diamond score",
    value: (m) => m.scores.gpqa,
    format: formatScore,
    bounded: true,
  },
  {
    key: "swebench",
    label: "SWE-bench Verified",
    axisLabel: "SWE-bench Verified score",
    value: (m) => m.scores.swebench,
    format: formatScore,
    bounded: true,
  },
  {
    key: "aime",
    label: "AIME-class math",
    axisLabel: "AIME-class math score",
    value: (m) => m.scores.aime,
    format: formatScore,
    bounded: true,
  },
  {
    key: "mmmu",
    label: "MMMU (multimodal)",
    axisLabel: "MMMU score",
    value: (m) => m.scores.mmmu,
    format: formatScore,
    bounded: true,
  },
  {
    key: "speed",
    label: "Output speed",
    axisLabel: "Output tokens / sec",
    value: (m) => m.speed,
    format: (v) => String(Math.round(v)),
    log: true,
  },
  {
    key: "context",
    label: "Context window",
    axisLabel: "Context window (tokens)",
    value: (m) => m.context,
    format: formatTokens,
    log: true,
  },
  {
    key: "maxOutput",
    label: "Max output",
    axisLabel: "Max output (tokens)",
    value: (m) => m.maxOutput,
    format: formatTokens,
    log: true,
  },
  {
    key: "params",
    label: "Parameters",
    axisLabel: "Parameters (B)",
    value: (m) => m.params,
    format: (v) => (v >= 1000 ? `${(v / 1000).toFixed(1).replace(/\.0$/, "")}T` : `${v}B`),
    log: true,
  },
];

export const METRIC_BY_KEY = new Map(METRICS.map((m) => [m.key, m]));

/**
 * The 0-100 capability metrics: the mean, plus each benchmark behind it. These
 * are the quantities that can stand in for "how good is it" on an axis, which
 * is what makes them interchangeable in a picker.
 */
export const SCORE_METRICS: Metric[] = METRICS.filter((m) => m.bounded);

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
