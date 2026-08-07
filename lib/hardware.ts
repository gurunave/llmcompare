import hardwareJson from "@/data/hardware.json";
import type { DerivedModel, ModelArch } from "./types";

/** Memory is binary — a "24 GB" card holds 24 GiB. Bandwidth is decimal GB/s. */
const GIB = 1024 ** 3;

export interface Device {
  id: string;
  label: string;
  group: string;
  memoryGB: number;
  bandwidthGBs: number;
  devices: number;
  unified: boolean;
  note: string | null;
}

interface HardwareFile {
  meta: { lastReviewed: string; note: string };
  devices: Device[];
}

export const hardware = hardwareJson as HardwareFile;
export const DEVICES: Device[] = hardware.devices;
export const DEVICE_BY_ID = new Map(DEVICES.map((d) => [d.id, d]));

/** Preset groups, in the order the file declares them. */
export const DEVICE_GROUPS: { group: string; devices: Device[] }[] = DEVICES.reduce(
  (acc, d) => {
    const bucket = acc.find((g) => g.group === d.group);
    if (bucket) bucket.devices.push(d);
    else acc.push({ group: d.group, devices: [d] });
    return acc;
  },
  [] as { group: string; devices: Device[] }[]
);

export const DEFAULT_DEVICE_ID = "rtx-4090";

/** The one picker entry that is not a preset — whatever the user types in. */
export const CUSTOM_ID = "custom";

/* ------------------------------------------------------------------ quants */

export type QuantKey = "fp16" | "q8" | "q6" | "q5" | "q4" | "q3";

export interface Quant {
  key: QuantKey;
  label: string;
  /**
   * Bytes per parameter of the file on disk, calibrated against real llama.cpp
   * K-quant sizes rather than the nominal bit width — a "4-bit" quant carries
   * scales and zero-points too, and lands nearer 4.8 bits in practice.
   */
  bytesPerParam: number;
  quality: string;
}

export const QUANTS: Quant[] = [
  { key: "fp16", label: "FP16", bytesPerParam: 2.0, quality: "Native precision — no quantization loss" },
  { key: "q8", label: "Q8", bytesPerParam: 1.06, quality: "Indistinguishable from FP16 in practice" },
  { key: "q6", label: "Q6_K", bytesPerParam: 0.82, quality: "Very close to lossless" },
  { key: "q5", label: "Q5_K_M", bytesPerParam: 0.72, quality: "Small, rarely noticeable loss" },
  { key: "q4", label: "Q4_K_M", bytesPerParam: 0.6, quality: "The usual local default — mild loss" },
  { key: "q3", label: "Q3_K_M", bytesPerParam: 0.48, quality: "Visible degradation, last resort" },
];

export const QUANT_BY_KEY = new Map(QUANTS.map((q) => [q.key, q]));
export const DEFAULT_FLOOR: QuantKey = "q4";

export type KvQuantKey = "fp16" | "q8";

export const KV_QUANTS: { key: KvQuantKey; label: string; bytes: number }[] = [
  { key: "fp16", label: "FP16 cache", bytes: 2 },
  { key: "q8", label: "8-bit cache", bytes: 1 },
];

export const CONTEXT_CHOICES = [
  4096, 8192, 32768, 131072, 262144, 524288, 1048576,
] as const;
export const DEFAULT_CONTEXT = 8192;

/**
 * Size every model at its own published ceiling rather than at one shared
 * number. The rungs above answer "can this rig hold N tokens?"; this answers
 * "what does this rig do with each model used to its limit?", which is the
 * question a 1M-context model and a 32K one cannot be asked together.
 */
export const MAX_CONTEXT = "max";

/** A rung on the ladder, or the per-model maximum. */
export type ContextChoice = number | typeof MAX_CONTEXT;

/** Powers of two, so the label says 32K rather than the rounded 33K. */
export const CONTEXT_LABELS: Record<number, string> = {
  4096: "4K",
  8192: "8K",
  32768: "32K",
  131072: "128K",
  262144: "256K",
  524288: "512K",
  1048576: "1M",
};

/**
 * What a model is actually sized at. A context longer than the model's own
 * maximum is not a configuration it can be asked for, so charging it for that
 * cache would rule out models on a setting they never have to meet — a 64K
 * model would be billed for a 1M cache and reported as too big for a rig it
 * runs on comfortably.
 */
export function effectiveContext(model: DerivedModel, choice: ContextChoice): number {
  return choice === MAX_CONTEXT ? model.context : Math.min(choice, model.context);
}

/** Token counts as the picker writes them — 128K, 1M — for use mid-sentence. */
export function formatContext(tokens: number): string {
  if (tokens >= 1024 * 1024) {
    const m = tokens / (1024 * 1024);
    return `${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  if (tokens >= 1024) {
    const k = tokens / 1024;
    return `${Number.isInteger(k) ? k : Math.round(k)}K`;
  }
  return String(tokens);
}

/** 1-2-5 decade ticks — the only readable way to label three decades of log axis. */
export function logTicks(lo: number, hi: number): number[] {
  const ticks: number[] = [];
  for (let exp = Math.floor(Math.log10(lo)); exp <= Math.ceil(Math.log10(hi)); exp++) {
    for (const mult of [1, 2, 5]) {
      const v = mult * 10 ** exp;
      if (v >= lo && v <= hi) ticks.push(v);
    }
  }
  return ticks;
}

/* ------------------------------------------------------------------- rigs */

/** A resolved piece of hardware — a preset, or whatever the user typed in. */
export interface Rig {
  label: string;
  memoryGB: number;
  bandwidthGBs: number;
  devices: number;
  unified: boolean;
}

export function rigFromDevice(d: Device): Rig {
  return {
    label: d.label,
    memoryGB: d.memoryGB,
    bandwidthGBs: d.bandwidthGBs,
    devices: d.devices,
    unified: d.unified,
  };
}

/**
 * What a model can actually have. A discrete card loses a slice to the driver
 * and the display; a unified pool has an OS living in it, and macOS hands the
 * GPU about three quarters of RAM by default.
 */
export function usableBytes(rig: Rig): number {
  const fraction = rig.unified ? 0.75 : 0.94;
  return rig.memoryGB * GIB * fraction;
}

/* ----------------------------------------------------------------- memory */

export function weightBytes(params: number, quant: Quant): number {
  return params * 1e9 * quant.bytesPerParam;
}

/**
 * KV cache for a whole context, not per token — models that interleave a small
 * sliding window with occasional full-attention layers pay a flat rate on most
 * layers once the context passes the window, and a per-token rate on the rest.
 */
export function kvBytes(arch: ModelArch, context: number, bytesPerElem: number): number {
  const perTokenPerLayer = arch.kvLatentDim
    ? arch.kvLatentDim * bytesPerElem
    : 2 * (arch.kvHeads ?? 0) * (arch.headDim ?? 0) * bytesPerElem;

  if (arch.slidingWindow && arch.globalEvery) {
    const globalLayers = Math.ceil(arch.kvLayers / arch.globalEvery);
    const localLayers = arch.kvLayers - globalLayers;
    const tokenLayers =
      globalLayers * context + localLayers * Math.min(context, arch.slidingWindow);
    return perTokenPerLayer * tokenLayers;
  }

  return perTokenPerLayer * arch.kvLayers * context;
}

/** Runtime context, activations and fragmentation — small, but not nothing. */
export function overheadBytes(weights: number): number {
  return Math.max(0.8 * GIB, weights * 0.05);
}

export type Verdict = "comfortable" | "tight" | "no-fit" | "unsizable";

export interface Footprint {
  quant: Quant;
  weights: number;
  kv: number;
  overhead: number;
  total: number;
  /** Share of usable memory consumed. Above 1 it does not fit. */
  load: number;
  verdict: Verdict;
}

export function footprint(
  model: DerivedModel,
  quant: Quant,
  rig: Rig,
  context: number,
  kvBytesPerElem: number
): Footprint | null {
  if (!model.arch || model.params === null) return null;

  const weights = weightBytes(model.params, quant);
  const kv = kvBytes(model.arch, context, kvBytesPerElem);
  const overhead = overheadBytes(weights);
  const total = weights + kv + overhead;
  const load = total / usableBytes(rig);

  return {
    quant,
    weights,
    kv,
    overhead,
    total,
    load,
    // A rig loaded past ~90% will fit the weights and then stall the first time
    // anything else wants memory, so "tight" is a real state, not a rounding of
    // "fits".
    verdict: load > 1 ? "no-fit" : load > 0.9 ? "tight" : "comfortable",
  };
}

export interface Fit {
  model: DerivedModel;
  /** Tokens this model was actually sized at — its own maximum, when that is lower. */
  context: number;
  /** Whether that is the model's ceiling rather than the context that was asked for. */
  capped: boolean;
  /** One entry per quant, best precision first. Empty when the model is unsizable. */
  ladder: Footprint[];
  /** Highest-precision quant that fits at or above the quality floor. */
  best: Footprint | null;
  /** Fits, but only by dropping below the floor the user asked for. */
  belowFloor: Footprint | null;
  verdict: Verdict;
  throughput: { low: number; high: number } | null;
}

/**
 * Single-stream decode is bounded by how fast the active weights can be read
 * once per token. Tensor parallelism splits that read, but the per-layer syncs
 * eat most of the gain — past a couple of devices you are buying capacity, not
 * speed, which is what the efficiency term encodes.
 *
 * This is peak bandwidth: the achievable fraction of it is the range the caller
 * puts around the result, not a second discount applied here.
 */
function effectiveBandwidth(rig: Rig): number {
  const tensorParallel = 1 / (1 + 0.6 * (rig.devices - 1));
  return rig.bandwidthGBs * 1e9 * rig.devices * tensorParallel;
}

export function throughput(
  model: DerivedModel,
  fp: Footprint,
  rig: Rig,
  context: number,
  kvBytesPerElem: number
): { low: number; high: number } | null {
  if (!model.arch || model.params === null) return null;

  // A mixture-of-experts reads only its active parameters per token, which is
  // the whole reason a 235B MoE decodes like a 22B dense model.
  const active = model.arch.activeParams ?? model.params;
  const activeWeights = weightBytes(active, fp.quant);
  // Half the context is a fair average for the cache actually walked per token.
  const cacheRead = kvBytes(model.arch, Math.round(context / 2), kvBytesPerElem);
  const perToken = activeWeights + cacheRead;
  if (perToken <= 0) return null;

  // Real runtimes reach 55-85% of peak bandwidth on a decode loop. The band is
  // the honest width of the answer — and it stays an upper bound: a large MoE
  // sharded over many devices loses more to expert dispatch than to memory.
  const roofline = effectiveBandwidth(rig) / perToken;
  return { low: roofline * 0.55, high: roofline * 0.85 };
}

export function fit(
  model: DerivedModel,
  rig: Rig,
  context: ContextChoice,
  kvQuant: KvQuantKey,
  floor: QuantKey
): Fit {
  const bytesPerElem = KV_QUANTS.find((k) => k.key === kvQuant)?.bytes ?? 2;
  const ctx = effectiveContext(model, context);
  const capped = context !== MAX_CONTEXT && ctx < context;

  if (!model.arch || model.params === null) {
    return {
      model,
      context: ctx,
      capped,
      ladder: [],
      best: null,
      belowFloor: null,
      verdict: "unsizable",
      throughput: null,
    };
  }

  const ladder = QUANTS.map((q) =>
    footprint(model, q, rig, ctx, bytesPerElem)
  ).filter((f): f is Footprint => f !== null);

  const floorIndex = QUANTS.findIndex((q) => q.key === floor);
  const best = ladder.find((f, i) => i <= floorIndex && f.verdict !== "no-fit") ?? null;
  const belowFloor = best
    ? null
    : (ladder.find((f, i) => i > floorIndex && f.verdict !== "no-fit") ?? null);

  return {
    model,
    context: ctx,
    capped,
    ladder,
    best,
    belowFloor,
    verdict: best ? best.verdict : "no-fit",
    throughput: best ? throughput(model, best, rig, ctx, bytesPerElem) : null,
  };
}

/** Every model sized against one rig, best capability first among those that fit. */
export function fitCatalog(
  models: DerivedModel[],
  rig: Rig,
  context: ContextChoice,
  kvQuant: KvQuantKey,
  floor: QuantKey
): Fit[] {
  // Fits or does not — "tight" is a caveat on a model that runs, not a rank
  // below one that does, and the headline count treats it the same way.
  const RANK: Record<Verdict, number> = {
    comfortable: 0,
    tight: 0,
    "no-fit": 1,
    unsizable: 2,
  };

  return models
    .map((m) => fit(m, rig, context, kvQuant, floor))
    .sort((a, b) => {
      const byVerdict = RANK[a.verdict] - RANK[b.verdict];
      if (byVerdict !== 0) return byVerdict;
      return (b.model.capability ?? -1) - (a.model.capability ?? -1);
    });
}

/* --------------------------------------------------------------- formatting */

export function formatGiB(bytes: number): string {
  const gib = bytes / GIB;
  if (gib >= 100) return `${Math.round(gib)} GB`;
  if (gib >= 10) return `${gib.toFixed(1)} GB`;
  return `${gib.toFixed(2)} GB`;
}

export function formatTokPerSec(range: { low: number; high: number }): string {
  const round = (v: number) => (v >= 100 ? Math.round(v / 5) * 5 : v >= 10 ? Math.round(v) : v.toFixed(1));
  return `${round(range.low)}–${round(range.high)}`;
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  comfortable: "Fits",
  tight: "Tight",
  "no-fit": "Too big",
  unsizable: "Hosted only",
};

/** Fit state never rests on color — each one carries a glyph and a word. */
export const VERDICT_GLYPH: Record<Verdict, string> = {
  comfortable: "●",
  tight: "◐",
  "no-fit": "○",
  unsizable: "—",
};

export const VERDICT_TINT: Record<Verdict, string> = {
  comfortable: "var(--status-good)",
  tight: "var(--status-warning)",
  "no-fit": "var(--text-muted)",
  unsizable: "var(--text-muted)",
};
