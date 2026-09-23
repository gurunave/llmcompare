import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  FAST_TOKENS_PER_SEC,
  filterModels,
  isFiltered,
  releaseYears,
} from "@/lib/browse";
import { MODELS } from "@/lib/models";

describe("browse filters", () => {
  it("keeps every model under the defaults", () => {
    expect(filterModels(MODELS, DEFAULT_FILTERS)).toHaveLength(MODELS.length);
    expect(isFiltered(DEFAULT_FILTERS)).toBe(false);
  });

  it("counts a 131,072-token window as 128K+", () => {
    const rows = filterModels(MODELS, { ...DEFAULT_FILTERS, minContext: 128_000 });
    expect(rows.some((m) => m.context === 131_072)).toBe(true);
    expect(rows.every((m) => m.context >= 128_000)).toBe(true);
    expect(rows.length).toBeLessThan(MODELS.length);
  });

  it("caps the blended price", () => {
    const rows = filterModels(MODELS, { ...DEFAULT_FILTERS, maxPrice: 1 });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((m) => m.blendedPrice <= 1)).toBe(true);
  });

  it("filters by release year, reasoning and speed together", () => {
    const f = { ...DEFAULT_FILTERS, releasedYear: "2026", reasoning: true, fast: true };
    const rows = filterModels(MODELS, f);
    expect(rows.length).toBeGreaterThan(0);
    expect(
      rows.every((m) => m.released.startsWith("2026") && m.reasoning && m.speed >= FAST_TOKENS_PER_SEC)
    ).toBe(true);
    expect(isFiltered(f)).toBe(true);
  });

  it("lists release years newest first", () => {
    const years = releaseYears(MODELS);
    expect(years).toEqual([...years].sort().reverse());
  });
});
