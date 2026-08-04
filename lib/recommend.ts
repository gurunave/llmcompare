import { BENCHMARK_BY_ID, scoreOf } from "./benchmarks";
import { MODELS } from "./models";
import type { BenchmarkCategory, BenchmarkId, DerivedModel } from "./types";

export type TaskKey = "agentic" | "coding" | "research" | "general" | "multimodal" | "volume";
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

/**
 * Per-task weights over benchmark *categories*, not individual benchmarks. A
 * category score already blends whatever a model published in it and falls back
 * to the retired benchmarks when there is no newer data, so weighting here
 * keeps the recommender working for the bulk of the catalog — which has no
 * GDPval or Terminal-Bench result at all. Categories not listed contribute
 * nothing.
 */
const TASK_WEIGHTS: Record<TaskKey, Partial<Record<BenchmarkCategory, number>>> = {
  agentic: { agentic: 0.5, tooluse: 0.2, coding: 0.3 },
  coding: { coding: 0.6, agentic: 0.2, reasoning: 0.2 },
  research: { reasoning: 0.5, math: 0.25, knowledge: 0.25 },
  general: { knowledge: 0.5, reasoning: 0.3, coding: 0.2 },
  multimodal: { multimodal: 0.6, knowledge: 0.25, reasoning: 0.15 },
  volume: { knowledge: 0.7, coding: 0.3 },
};

export const TASK_LABELS: Record<TaskKey, string> = {
  agentic: "Agentic / real work",
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
      for (const [key, w] of Object.entries(weights) as [BenchmarkCategory, number][]) {
        const v = m.categories[key];
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
      const head = headline(a.task, m);
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

/**
 * Benchmarks worth quoting for each task, best evidence first. The headline
 * falls through to an older benchmark when the model has no newer result, so a
 * recommendation always says what it is based on.
 */
const HEADLINE_BENCHMARKS: Record<TaskKey, BenchmarkId[]> = {
  agentic: ["gdpval", "terminalBench2", "tauBench", "osworld", "bfclV4", "swebench"],
  coding: ["swebenchPro", "livecodebench", "terminalBench2", "swebench"],
  research: ["hle", "arcAgi2", "frontierMath", "gpqa"],
  general: ["aaIndex", "lmarenaElo", "mmluPro"],
  multimodal: ["mmmu", "osworld"],
  volume: ["mmluPro", "livecodebench"],
};

function headline(task: TaskKey, m: DerivedModel): string | null {
  for (const id of HEADLINE_BENCHMARKS[task]) {
    const v = scoreOf(m, id);
    const b = BENCHMARK_BY_ID.get(id);
    if (v === null || !b) continue;
    return b.scale === "pct" ? `${v} on ${b.label}` : `${v} ${b.label}`;
  }
  return null;
}
