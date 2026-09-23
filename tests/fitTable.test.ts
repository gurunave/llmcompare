import { describe, expect, it } from "vitest";
import { MODELS_WITH_ARCH } from "@/lib/arch";
import { DEFAULT_FIT_FILTERS, filterFits, isFitFiltered, sortFits } from "@/lib/fitTable";
import { DEVICE_BY_ID, fitCatalog, rigFromDevice } from "@/lib/hardware";

const fits = fitCatalog(MODELS_WITH_ARCH, rigFromDevice(DEVICE_BY_ID.get("dgx-spark")!), 8192, "fp16", "q4");
const fitting = fits.filter((f) => f.best);

describe("fit table filters", () => {
  it("keeps everything under the defaults", () => {
    expect(filterFits(fits, DEFAULT_FIT_FILTERS)).toHaveLength(fits.length);
    expect(isFitFiltered(DEFAULT_FIT_FILTERS)).toBe(false);
  });

  it("drops rows slower than the floor, and rows with no speed at all", () => {
    const rows = filterFits(fits, { ...DEFAULT_FIT_FILTERS, minSpeed: 20 });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(fitting.length);
    expect(rows.every((f) => f.throughput && f.throughput.low >= 20)).toBe(true);
  });

  it("keeps only comfortable fits when asked", () => {
    const rows = filterFits(fits, { ...DEFAULT_FIT_FILTERS, comfortableOnly: true });
    expect(rows.every((f) => f.verdict === "comfortable")).toBe(true);
  });
});

describe("fit table sorting", () => {
  it("puts the fastest first and speedless rows last", () => {
    const rows = sortFits(fits, "speed");
    const speeds = rows.map((f) => f.throughput?.high ?? null);
    const known = speeds.filter((v): v is number => v !== null);
    expect(known).toEqual([...known].sort((a, b) => b - a));
    expect(speeds.slice(known.length).every((v) => v === null)).toBe(true);
  });

  it("puts the smallest footprint first", () => {
    const rows = sortFits(fitting, "footprint").map((f) => f.best!.total);
    expect(rows).toEqual([...rows].sort((a, b) => a - b));
  });

  it("does not mutate its input", () => {
    const before = fits.map((f) => f.model.id);
    sortFits(fits, "name");
    expect(fits.map((f) => f.model.id)).toEqual(before);
  });
});
