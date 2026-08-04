import catalogJson from "@/data/models.json";
import {
  BENCHMARKS,
  CATEGORY_LABELS,
  benchmarksIn,
  capabilityIndex,
  categoryScores,
} from "./benchmarks";
import type { AxisKey, BenchmarkCategory, Catalog, DerivedModel, Model } from "./types";

export const catalog = catalogJson as unknown as Catalog;

/** The radar axes that are a benchmark category rather than a derived quantity. */
const CATEGORY_AXES: Record<string, BenchmarkCategory> = {
  agentic: "agentic",
  coding: "coding",
  reasoning: "reasoning",
  math: "math",
  knowledge: "knowledge",
  tooluse: "tooluse",
};

export const AXIS_LABELS: Record<AxisKey, string> = {
  agentic: CATEGORY_LABELS.agentic,
  coding: CATEGORY_LABELS.coding,
  reasoning: CATEGORY_LABELS.reasoning,
  math: CATEGORY_LABELS.math,
  knowledge: CATEGORY_LABELS.knowledge,
  tooluse: CATEGORY_LABELS.tooluse,
  speed: "Speed",
  value: "Value",
  context: "Context",
};

/** Each category axis names the benchmarks behind it, so the shape is auditable. */
function axisHelp(category: BenchmarkCategory): string {
  return benchmarksIn(category)
    .filter((b) => b.inIndex && b.scale === "pct")
    .map((b) => b.short)
    .join(", ");
}

export const AXIS_HELP: Record<AxisKey, string> = {
  agentic: axisHelp("agentic"),
  coding: axisHelp("coding"),
  reasoning: axisHelp("reasoning"),
  math: axisHelp("math"),
  knowledge: axisHelp("knowledge"),
  tooluse: axisHelp("tooluse"),
  speed: "Output tokens/sec, log-scaled",
  value: "Capability per blended dollar, log-scaled",
  context: "Context window, log-scaled",
};

/** Blended price at a 3:1 input:output token mix — the common API workload shape. */
export function blendedPrice(m: Model): number {
  return (m.pricing.input * 3 + m.pricing.output) / 4;
}

/**
 * The capability index: each published score placed on a common scale against
 * its own benchmark's useful span, averaged within its category, then averaged
 * across categories. Deliberately not a mean of raw scores — those are not
 * commensurable once a 35%-at-the-frontier benchmark sits next to a 90% one.
 */
export function capabilityOf(m: Model): number | null {
  return capabilityIndex(categoryScores(m));
}

function logNormalize(value: number, min: number, max: number): number {
  if (max <= min) return 50;
  const t = (Math.log10(value) - Math.log10(min)) / (Math.log10(max) - Math.log10(min));
  return Math.max(0, Math.min(100, t * 100));
}

function derive(models: Model[]): DerivedModel[] {
  const speeds = models.map((m) => m.speed);
  const contexts = models.map((m) => m.context);

  const cats = models.map(categoryScores);

  const valueRaw = models.map((m, i) => {
    const cap = capabilityIndex(cats[i]);
    return cap === null ? null : cap / Math.max(blendedPrice(m), 0.01);
  });
  const valueVals = valueRaw.filter((v): v is number => v !== null);

  const bounds = {
    speed: [Math.min(...speeds), Math.max(...speeds)] as const,
    context: [Math.min(...contexts), Math.max(...contexts)] as const,
    value: [Math.min(...valueVals), Math.max(...valueVals)] as const,
  };

  return models.map((m, i) => {
    const raw = valueRaw[i];
    const categories = cats[i];
    const axes = {
      speed: logNormalize(m.speed, bounds.speed[0], bounds.speed[1]),
      context: logNormalize(m.context, bounds.context[0], bounds.context[1]),
      value: raw === null ? null : logNormalize(raw, bounds.value[0], bounds.value[1]),
    } as Record<AxisKey, number | null>;
    for (const [axis, category] of Object.entries(CATEGORY_AXES)) {
      axes[axis as AxisKey] = categories[category] ?? null;
    }

    return {
      ...m,
      capability: capabilityIndex(categories),
      categories,
      blendedPrice: blendedPrice(m),
      axes,
    };
  });
}

export const MODELS: DerivedModel[] = derive(catalog.models);

export const MODELS_BY_ID = new Map(MODELS.map((m) => [m.id, m]));

export const PROVIDERS = Array.from(new Set(MODELS.map((m) => m.provider))).sort();

export const TAGS = Array.from(new Set(MODELS.flatMap((m) => m.tags))).sort();

export const MAX_SELECTION = 10;

/**
 * Above this many series a chart stops filling shapes and starts leaning on
 * outlines, badges and the legend toggles — everything stays on screen, it just
 * stops pretending overlapping translucent fills are readable.
 */
export const DENSE_SERIES = 4;
