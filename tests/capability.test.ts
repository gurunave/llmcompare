import { describe, expect, it } from "vitest";
import {
  BENCHMARK_BY_ID,
  capabilityIndex,
  categoryScore,
  categoryScores,
  coverage,
  normalize,
} from "@/lib/benchmarks";
import type { Benchmark, Model } from "@/lib/types";

/** A model is only ever read for its scores here, so the rest is scaffolding. */
function model(scores: Record<string, number>): Model {
  return {
    id: "test",
    name: "Test",
    provider: "Test",
    released: "2026-01",
    license: "proprietary",
    params: null,
    localTier: null,
    context: 128000,
    maxOutput: 8192,
    modalities: ["text"],
    reasoning: false,
    pricing: { input: 1, output: 1 },
    cutoff: "2026-01",
    speed: 100,
    scores,
    tags: [],
    url: "https://example.com",
  };
}

function benchmark(range: [number, number]): Benchmark {
  return {
    id: "x",
    label: "X",
    short: "X",
    blurb: "",
    category: "coding",
    scale: "pct",
    tier: "headline",
    range,
    inIndex: true,
    source: "",
  };
}

describe("normalize", () => {
  it("maps the range endpoints to 0 and 100", () => {
    const b = benchmark([10, 90]);
    expect(normalize(b, 10)).toBe(0);
    expect(normalize(b, 90)).toBe(100);
    expect(normalize(b, 50)).toBe(50);
  });

  it("clamps rather than returning a value outside 0-100", () => {
    const b = benchmark([10, 90]);
    expect(normalize(b, 0)).toBe(0);
    expect(normalize(b, 200)).toBe(100);
  });

  it("does not divide by zero on a degenerate range", () => {
    expect(normalize(benchmark([50, 50]), 50)).toBe(0);
  });
});

describe("categoryScore", () => {
  it("is null when the model has no benchmark in that category", () => {
    expect(categoryScore(model({}), "coding")).toBeNull();
  });

  it("averages the normalized scores, not the raw ones", () => {
    // swebenchPro 10-85 and swebench 0-120: raw 85 and raw 120 are both the top
    // of their own range, so the average is 100 even though the raws differ.
    const m = model({ swebenchPro: 85, swebench: 120 });
    expect(categoryScore(m, "coding")).toBe(100);
  });

  it("ignores benchmarks marked out of the index", () => {
    // aaIndex is composite and inIndex:false, so it must not create a score.
    expect(categoryScore(model({ aaIndex: 60 }), "composite")).toBeNull();
  });
});

describe("capabilityIndex", () => {
  it("is null with no category data at all", () => {
    expect(capabilityIndex({})).toBeNull();
  });

  it("weights each category equally, however many benchmarks are behind it", () => {
    expect(capabilityIndex({ coding: 100, knowledge: 0 })).toBe(
      capabilityIndex({ knowledge: 100, coding: 0 })
    );
  });

  it("discounts a thin record against a broad one at the same level", () => {
    const thin = capabilityIndex({ agentic: 90 })!;
    const broad = capabilityIndex({
      agentic: 90,
      coding: 90,
      reasoning: 90,
      math: 90,
      knowledge: 90,
      tooluse: 90,
    })!;
    expect(thin).toBeLessThan(broad);
  });
});

describe("coverage", () => {
  it("counts only the indexed categories", () => {
    expect(coverage({})).toBe(0);
    expect(coverage({ multimodal: 80 })).toBe(0);
    expect(coverage({ agentic: 80, coding: 80, reasoning: 80 })).toBeCloseTo(0.5);
  });
});

/**
 * The three ways this index has actually been wrong. Each of these failed at
 * some point during the benchmark migration and was caught by eye; they are
 * here so the next regression is caught by the suite instead.
 */
describe("regressions", () => {
  it("does not punish a model for publishing a hard benchmark", () => {
    // Reporting HLE (frontier ~61, on a range that runs to 70) alongside GPQA
    // must not score below reporting GPQA alone. Averaging raw scores inverted
    // exactly here.
    const withHard = categoryScore(model({ gpqa: 92, hle: 61 }), "reasoning")!;
    const easyOnly = categoryScore(model({ gpqa: 92 }), "reasoning")!;
    expect(withHard).toBeGreaterThanOrEqual(easyOnly);
  });

  it("does not let a saturated retired benchmark read as frontier ability", () => {
    // A perfect GPQA is a floor, not a ceiling: its range runs past the
    // attainable maximum so 100 raw lands well short of 100 normalized.
    const gpqa = BENCHMARK_BY_ID.get("gpqa")!;
    expect(gpqa.tier).toBe("floor");
    expect(normalize(gpqa, 100)).toBeLessThan(90);
  });

  it("does not let one published benchmark top a broadly measured model", () => {
    // Qwen3.8-Max held a single OSWorld result and led the whole catalog.
    const oneResult = capabilityIndex(categoryScores(model({ osworld: 86 })))!;
    const measured = capabilityIndex(
      categoryScores(model({ gdpval: 1750, swebenchPro: 70, hle: 45, aime: 95, mmluPro: 88 }))
    )!;
    expect(oneResult).toBeLessThan(measured);
  });
});
