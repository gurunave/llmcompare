import { describe, expect, it } from "vitest";
import { BENCHMARKS, BENCHMARK_BY_ID } from "@/lib/benchmarks";
import { MODELS, catalog } from "@/lib/models";

/**
 * Integrity checks on data/models.json. Nothing here tests behaviour — these
 * exist because the catalog is hand-edited, and a stale copy of an entry sat in
 * it undetected until it was found by eye. A duplicate, a typo'd benchmark id
 * or a score outside its own range should fail the build, not render a blank.
 */
describe("catalog integrity", () => {
  it("has no duplicate model ids", () => {
    const seen = new Map<string, number>();
    for (const m of catalog.models) seen.set(m.id, (seen.get(m.id) ?? 0) + 1);
    expect([...seen].filter(([, n]) => n > 1)).toEqual([]);
  });

  it("has no two models sharing a name", () => {
    // kimi-k2 and kimi-k2-thinking were both "Kimi K2 Thinking" with the same
    // release, size, context and price - one was a stale copy of the other.
    const seen = new Map<string, string[]>();
    for (const m of catalog.models) seen.set(m.name, [...(seen.get(m.name) ?? []), m.id]);
    expect([...seen].filter(([, ids]) => ids.length > 1)).toEqual([]);
  });

  it("scores every model only against benchmarks in the registry", () => {
    const unknown: string[] = [];
    for (const m of catalog.models) {
      for (const id of Object.keys(m.scores)) {
        if (!BENCHMARK_BY_ID.has(id)) unknown.push(`${m.id}.${id}`);
      }
    }
    expect(unknown).toEqual([]);
  });

  it("stores scores sparsely — an absent result, never a null", () => {
    const nulls: string[] = [];
    for (const m of catalog.models) {
      for (const [id, v] of Object.entries(m.scores)) {
        if (typeof v !== "number" || !Number.isFinite(v)) nulls.push(`${m.id}.${id}`);
      }
    }
    expect(nulls).toEqual([]);
  });

  it("keeps every published score inside its benchmark's range", () => {
    // A value outside the range is silently clamped to 0 or 100 when it is
    // normalized, which hides both a data-entry slip and a range that has been
    // overtaken by the field.
    const outside: string[] = [];
    for (const m of catalog.models) {
      for (const [id, v] of Object.entries(m.scores)) {
        const b = BENCHMARK_BY_ID.get(id);
        if (!b) continue;
        if (v < b.range[0] || v > b.range[1]) outside.push(`${m.id}.${id}=${v} vs ${b.range}`);
      }
    }
    expect(outside).toEqual([]);
  });
});

describe("benchmark registry", () => {
  it("has no duplicate benchmark ids", () => {
    expect(BENCHMARK_BY_ID.size).toBe(BENCHMARKS.length);
  });

  it("gives every benchmark an ascending, non-empty range", () => {
    for (const b of BENCHMARKS) {
      expect(b.range[1], `${b.id} range`).toBeGreaterThan(b.range[0]);
    }
  });

  it("describes every benchmark and names where its figures came from", () => {
    for (const b of BENCHMARKS) {
      expect(b.blurb.length, `${b.id} blurb`).toBeGreaterThan(0);
      expect(b.source.length, `${b.id} source`).toBeGreaterThan(0);
    }
  });

  it("keeps composites and non-percentage scales out of the index", () => {
    expect(BENCHMARK_BY_ID.get("aaIndex")!.inIndex).toBe(false);
    expect(BENCHMARK_BY_ID.get("lmarenaElo")!.inIndex).toBe(false);
    expect(BENCHMARK_BY_ID.get("metrHorizon")!.inIndex).toBe(false);
  });
});

describe("derived models", () => {
  it("derives one entry per catalog model", () => {
    expect(MODELS.length).toBe(catalog.models.length);
  });

  it("keeps every capability index within 0-100", () => {
    for (const m of MODELS) {
      if (m.capability === null) continue;
      expect(m.capability, m.id).toBeGreaterThanOrEqual(0);
      expect(m.capability, m.id).toBeLessThanOrEqual(100);
    }
  });

  it("gives a model with no scores no index rather than a zero", () => {
    for (const m of MODELS) {
      if (Object.keys(m.scores).length === 0) expect(m.capability, m.id).toBeNull();
    }
  });
});
