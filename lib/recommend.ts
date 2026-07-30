import { MODELS } from "./models";
import type { DerivedModel, ScoreKey } from "./types";

export type TaskKey = "coding" | "research" | "general" | "multimodal" | "volume";
export type BudgetKey = "any" | "moderate" | "cheap";
export type DeployKey = "any" | "open" | "local";
export type ContextKey = "any" | "long" | "huge";
export type SpeedKey = "any" | "fast";

export interface Answers {
  task: TaskKey;
  budget: BudgetKey;
  deploy: DeployKey;
  context: ContextKey;
  latency: SpeedKey;
}

export const DEFAULT_ANSWERS: Answers = {
  task: "coding",
  budget: "any",
  deploy: "any",
  context: "any",
  latency: "any",
};

/** Per-task benchmark weights. Keys not listed contribute nothing. */
const TASK_WEIGHTS: Record<TaskKey, Partial<Record<ScoreKey, number>>> = {
  coding: { swebench: 0.6, mmluPro: 0.2, gpqa: 0.2 },
  research: { gpqa: 0.5, aime: 0.25, mmluPro: 0.25 },
  general: { mmluPro: 0.6, gpqa: 0.2, swebench: 0.2 },
  multimodal: { mmmu: 0.6, mmluPro: 0.25, gpqa: 0.15 },
  volume: { mmluPro: 0.7, swebench: 0.3 },
};

export const TASK_LABELS: Record<TaskKey, string> = {
  coding: "Writing & fixing code",
  research: "Hard reasoning / research",
  general: "General chat & writing",
  multimodal: "Images, video & documents",
  volume: "High-volume extraction",
};

const BUDGET_CEILING: Record<BudgetKey, number> = {
  any: Infinity,
  moderate: 5,
  cheap: 1,
};

const CONTEXT_FLOOR: Record<ContextKey, number> = {
  any: 0,
  long: 200_000,
  huge: 1_000_000,
};

export interface Recommendation {
  model: DerivedModel;
  score: number;
  reasons: string[];
}

/**
 * Hard constraints filter; soft preferences (cost, speed) shape the score.
 * Returns the ranked survivors, best first.
 */
export function recommend(a: Answers, limit = 5): Recommendation[] {
  const weights = TASK_WEIGHTS[a.task];

  const eligible = MODELS.filter((m) => {
    if (m.blendedPrice > BUDGET_CEILING[a.budget]) return false;
    if (m.context < CONTEXT_FLOOR[a.context]) return false;
    if (a.deploy === "open" && m.license !== "open") return false;
    if (a.deploy === "local" && !["laptop", "workstation"].includes(m.localTier ?? ""))
      return false;
    if (a.task === "multimodal" && !m.modalities.includes("image")) return false;
    if (a.latency === "fast" && m.speed < 120) return false;
    return true;
  });

  const ranked = eligible
    .map((m) => {
      let quality = 0;
      let weightUsed = 0;
      for (const [key, w] of Object.entries(weights) as [ScoreKey, number][]) {
        const v = m.scores[key];
        if (typeof v === "number") {
          quality += v * w;
          weightUsed += w;
        }
      }
      // Models that publish fewer of the relevant benchmarks are scored on what
      // they do publish, then nudged down so a thin record can't win on silence.
      const coverage = weightUsed === 0 ? 0 : weightUsed;
      const normalized = coverage === 0 ? 0 : (quality / coverage) * (0.85 + 0.15 * coverage);

      const valueBonus = a.budget === "any" ? 0 : (m.axes.value ?? 0) * 0.15;
      const speedBonus = a.latency === "fast" ? (m.axes.speed ?? 0) * 0.1 : 0;

      const reasons: string[] = [];
      const head = HEADLINE[a.task](m);
      if (head) reasons.push(head);
      if (m.blendedPrice <= 1) reasons.push(`Cheap to run — $${m.blendedPrice.toFixed(2)}/1M blended`);
      if (m.license === "open") reasons.push(`Open weights (${m.localTier ?? "self-host"})`);
      if (m.context >= 1_000_000) reasons.push("1M+ token context");
      if (m.speed >= 180) reasons.push("Fast output");

      return { model: m, score: normalized + valueBonus + speedBonus, reasons: reasons.slice(0, 3) };
    })
    .filter((r) => r.score > 0)
    .sort((x, y) => y.score - x.score);

  return ranked.slice(0, limit);
}

const HEADLINE: Record<TaskKey, (m: DerivedModel) => string | null> = {
  coding: (m) => (m.scores.swebench ? `${m.scores.swebench} on SWE-bench Verified` : null),
  research: (m) => (m.scores.gpqa ? `${m.scores.gpqa} on GPQA Diamond` : null),
  general: (m) => (m.scores.mmluPro ? `${m.scores.mmluPro} on MMLU-Pro` : null),
  multimodal: (m) => (m.scores.mmmu ? `${m.scores.mmmu} on MMMU` : null),
  volume: (m) => (m.scores.mmluPro ? `${m.scores.mmluPro} on MMLU-Pro` : null),
};
