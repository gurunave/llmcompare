import { describe, expect, it } from "vitest";
import { MODELS_WITH_ARCH } from "@/lib/arch";
import {
  CONTEXT_CHOICES,
  CONTEXT_LABELS,
  MAX_CONTEXT,
  QUANTS,
  effectiveContext,
  fit,
  formatContext,
  kvBytes,
  rigFromDevice,
  DEVICE_BY_ID,
  type Rig,
} from "@/lib/hardware";
import type { DerivedModel } from "@/lib/types";

const RIG: Rig = rigFromDevice(DEVICE_BY_ID.get("rtx-4090")!);
const BIG: Rig = { label: "test", memoryGB: 640, bandwidthGBs: 3000, devices: 1, unified: false };

const sizable = MODELS_WITH_ARCH.filter((m) => m.arch && m.params !== null);
const byId = (id: string) => sizable.find((m) => m.id === id)!;

describe("context choices", () => {
  it("labels every rung", () => {
    for (const c of CONTEXT_CHOICES) expect(CONTEXT_LABELS[c], String(c)).toBeTruthy();
  });

  it("ascends", () => {
    const sorted = [...CONTEXT_CHOICES].sort((a, b) => a - b);
    expect([...CONTEXT_CHOICES]).toEqual(sorted);
  });

  it("writes token counts the way the picker labels them", () => {
    expect(formatContext(131072)).toBe("128K");
    expect(formatContext(1048576)).toBe("1M");
    expect(formatContext(10485760)).toBe("10M");
    // Not every catalog context is a power of two - 128,000 is not 128K exactly,
    // but rounding it to one is what a reader expects to see.
    expect(formatContext(128000)).toBe("125K");
  });
});

describe("effectiveContext", () => {
  it("never exceeds a model's own maximum", () => {
    for (const m of sizable) {
      expect(effectiveContext(m, 1048576), m.id).toBeLessThanOrEqual(m.context);
    }
  });

  it("passes a context the model can serve through untouched", () => {
    const m = byId("qwen3-32b");
    expect(effectiveContext(m, 8192)).toBe(8192);
  });

  it("resolves max to the model's own ceiling", () => {
    for (const m of sizable) expect(effectiveContext(m, MAX_CONTEXT), m.id).toBe(m.context);
  });
});

describe("fit clamps to what a model can serve", () => {
  /**
   * The bug this guards: the requested context used to be applied to every
   * model regardless of its own limit, so a 64K model asked to hold 1M was
   * charged for a 320 GB cache and reported as too big for a rig it runs on.
   */
  it("charges no cache beyond a model's maximum", () => {
    const m = byId("apertus-70b");
    const asked = fit(m, BIG, 1048576, "fp16", "q4");
    const atCeiling = fit(m, BIG, m.context, "fp16", "q4");

    expect(asked.context).toBe(m.context);
    expect(asked.capped).toBe(true);
    expect(asked.best?.kv).toBe(atCeiling.best?.kv);
  });

  it("marks a model that was not capped", () => {
    const m = byId("qwen3-32b");
    expect(fit(m, RIG, 4096, "fp16", "q4").capped).toBe(false);
  });

  it("never reports capped in max mode — the ceiling is what was asked for", () => {
    for (const m of sizable) {
      expect(fit(m, RIG, MAX_CONTEXT, "fp16", "q4").capped, m.id).toBe(false);
    }
  });

  it("sizes the cache at the clamped context, not the requested one", () => {
    const m = byId("gemma-3-1b");
    const f = fit(m, RIG, 1048576, "fp16", "q4");
    expect(f.best!.kv).toBe(kvBytes(m.arch!, m.context, 2));
  });

  it("leaves a long-context model unclamped at the same setting", () => {
    const m = sizable.find((x) => x.context >= 1048576)!;
    const f = fit(m, BIG, 1048576, "fp16", "q4");
    expect(f.capped).toBe(false);
    expect(f.context).toBe(1048576);
  });

  it("keeps a short-context model's verdict independent of a longer request", () => {
    // The whole point of the clamp: raising the ladder must not evict models
    // that were never able to use the extra context in the first place.
    const short = sizable.filter((m) => m.context <= 32768);
    expect(short.length).toBeGreaterThan(0);
    for (const m of short) {
      const at32k = fit(m, RIG, 32768, "fp16", "q4");
      const at1m = fit(m, RIG, 1048576, "fp16", "q4");
      expect(at1m.verdict, m.id).toBe(at32k.verdict);
    }
  });
});

describe("throughput follows the clamped context", () => {
  it("reads the same cache as the model's own ceiling would", () => {
    const m = byId("llama-3-3-70b");
    const asked = fit(m, BIG, 1048576, "fp16", "q4");
    const atCeiling = fit(m, BIG, m.context, "fp16", "q4");
    expect(asked.throughput).toEqual(atCeiling.throughput);
  });
});

describe("unsizable models", () => {
  it("still report the context they would have been sized at", () => {
    const hosted = MODELS_WITH_ARCH.find((m) => !m.arch) as DerivedModel;
    const f = fit(hosted, RIG, 1048576, "fp16", "q4");
    expect(f.verdict).toBe("unsizable");
    expect(f.context).toBe(Math.min(1048576, hosted.context));
    expect(f.ladder).toEqual([]);
  });
});

describe("quant ladder", () => {
  it("descends in bytes per parameter, so the first fit is the best one", () => {
    for (let i = 1; i < QUANTS.length; i++) {
      expect(QUANTS[i].bytesPerParam).toBeLessThan(QUANTS[i - 1].bytesPerParam);
    }
  });
});
