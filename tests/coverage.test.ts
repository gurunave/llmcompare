import { describe, expect, it } from "vitest";
import { BENCHMARKS, scoreOf } from "@/lib/benchmarks";
import { bandOf, coverageOf, formatShare } from "@/lib/coverage";
import { MODELS } from "@/lib/models";

/**
 * The coverage page is the one surface that reports on absence, so its counts
 * have to agree with the sparse catalog exactly: an off-by-one here reads as a
 * benchmark nobody measured rather than a bug.
 */
describe("coverage", () => {
  const all = coverageOf();

  it("counts every published figure once", () => {
    const direct = MODELS.reduce(
      (n, m) => n + BENCHMARKS.filter((b) => scoreOf(m, b.id) !== null).length,
      0
    );
    expect(all.filled).toBe(direct);
    expect(all.cells).toBe(MODELS.length * BENCHMARKS.length);
    expect(all.share).toBeCloseTo(direct / (MODELS.length * BENCHMARKS.length));
  });

  it("agrees between the per-benchmark and per-model views", () => {
    const fromBenchmarks = all.byBenchmark.reduce((n, c) => n + c.reported.length, 0);
    const fromModels = all.byModel.reduce((n, c) => n + c.reported.length, 0);
    const fromCategories = all.byCategory.reduce((n, c) => n + c.filled, 0);
    expect(fromBenchmarks).toBe(all.filled);
    expect(fromModels).toBe(all.filled);
    expect(fromCategories).toBe(all.filled);
  });

  it("splits every model into reported or missing, never both", () => {
    for (const c of all.byBenchmark) {
      expect(c.reported.length + c.missing.length).toBe(MODELS.length);
      const ids = new Set([...c.reported, ...c.missing].map((m) => m.id));
      expect(ids.size).toBe(MODELS.length);
    }
  });

  it("narrows to the pool it is given", () => {
    const one = MODELS[0];
    const narrowed = coverageOf([one], BENCHMARKS);
    expect(narrowed.models).toHaveLength(1);
    expect(narrowed.cells).toBe(BENCHMARKS.length);
    expect(narrowed.filled).toBe(BENCHMARKS.filter((b) => scoreOf(one, b.id) !== null).length);
  });

  it("survives an empty pool rather than dividing by zero", () => {
    const none = coverageOf([], BENCHMARKS);
    expect(none.share).toBe(0);
    expect(none.filled).toBe(0);
    expect(none.byBenchmark.every((c) => c.share === 0)).toBe(true);

    const noBenchmarks = coverageOf(MODELS, []);
    expect(noBenchmarks.share).toBe(0);
    expect(noBenchmarks.byModel.every((c) => c.share === 0)).toBe(true);
  });

  it("lists a model as unmeasured only when it has no score at all", () => {
    for (const m of all.unmeasured) {
      expect(BENCHMARKS.some((b) => scoreOf(m, b.id) !== null)).toBe(false);
    }
    const measured = all.byModel.filter((c) => c.reported.length > 0).length;
    expect(measured + all.unmeasured.length).toBe(MODELS.length);
  });

  it("reads a share as a band and a percentage", () => {
    expect(bandOf(0)).toBe("none");
    expect(bandOf(0.05)).toBe("sparse");
    expect(bandOf(0.3)).toBe("partial");
    expect(bandOf(0.9)).toBe("broad");
    expect(formatShare(0)).toBe("0%");
    expect(formatShare(0.005)).toBe("0.5%");
    expect(formatShare(0.179)).toBe("18%");
    expect(formatShare(1)).toBe("100%");
  });
});
