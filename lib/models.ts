import catalogJson from "@/data/models.json";
import type { AxisKey, Catalog, DerivedModel, Model, ScoreKey } from "./types";

export const catalog = catalogJson as unknown as Catalog;

export const CAPABILITY_KEYS: ScoreKey[] = ["mmluPro", "gpqa", "swebench", "aime"];

export const AXIS_LABELS: Record<AxisKey, string> = {
  knowledge: "Knowledge",
  reasoning: "Reasoning",
  coding: "Coding",
  math: "Math",
  speed: "Speed",
  value: "Value",
  context: "Context",
};

export const AXIS_HELP: Record<AxisKey, string> = {
  knowledge: "MMLU-Pro",
  reasoning: "GPQA Diamond",
  coding: "SWE-bench Verified",
  math: "AIME-class math",
  speed: "Output tokens/sec, log-scaled",
  value: "Capability per blended dollar, log-scaled",
  context: "Context window, log-scaled",
};

/** Blended price at a 3:1 input:output token mix — the common API workload shape. */
export function blendedPrice(m: Model): number {
  return (m.pricing.input * 3 + m.pricing.output) / 4;
}

/** Mean of the capability benchmarks a model actually publishes. */
export function capabilityOf(m: Model): number | null {
  const vals = CAPABILITY_KEYS.map((k) => m.scores[k]).filter(
    (v): v is number => typeof v === "number"
  );
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function logNormalize(value: number, min: number, max: number): number {
  if (max <= min) return 50;
  const t = (Math.log10(value) - Math.log10(min)) / (Math.log10(max) - Math.log10(min));
  return Math.max(0, Math.min(100, t * 100));
}

function derive(models: Model[]): DerivedModel[] {
  const speeds = models.map((m) => m.speed);
  const contexts = models.map((m) => m.context);

  const valueRaw = models.map((m) => {
    const cap = capabilityOf(m);
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
    return {
      ...m,
      capability: capabilityOf(m),
      blendedPrice: blendedPrice(m),
      axes: {
        knowledge: m.scores.mmluPro,
        reasoning: m.scores.gpqa,
        coding: m.scores.swebench,
        math: m.scores.aime,
        speed: logNormalize(m.speed, bounds.speed[0], bounds.speed[1]),
        context: logNormalize(m.context, bounds.context[0], bounds.context[1]),
        value: raw === null ? null : logNormalize(raw, bounds.value[0], bounds.value[1]),
      },
    };
  });
}

export const MODELS: DerivedModel[] = derive(catalog.models);

export const MODELS_BY_ID = new Map(MODELS.map((m) => [m.id, m]));

export const PROVIDERS = Array.from(new Set(MODELS.map((m) => m.provider))).sort();

export const TAGS = Array.from(new Set(MODELS.flatMap((m) => m.tags))).sort();

export const MAX_SELECTION = 4;
