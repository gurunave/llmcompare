import type { DerivedModel } from "./types";

/**
 * Release dates are `"YYYY-MM"` strings — precise enough for the catalog, not
 * for arithmetic. This turns one into a plain integer (months since year 0)
 * so it can sit on a numeric axis and sort like any other number.
 */
export function monthIndex(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + (m - 1);
}

/** The inverse of `monthIndex` — back to a `"YYYY-MM"` string for `formatMonth`. */
export function indexToMonth(idx: number): string {
  const y = Math.floor(idx / 12);
  const m = (idx % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

const STEP_CHOICES = [1, 2, 3, 6, 12, 24, 36, 48];

/**
 * A calendar-friendly tick step — 1, 2, 3, 6 or 12+ months — so a span of a
 * few months and a span of several years both land around 5-8 ticks instead
 * of the arbitrary spacing a generic numeric axis would pick.
 */
export function monthTicks(minIdx: number, maxIdx: number): number[] {
  if (minIdx >= maxIdx) return [minIdx];
  const span = maxIdx - minIdx;
  const step = STEP_CHOICES.find((s) => span / s <= 7) ?? STEP_CHOICES[STEP_CHOICES.length - 1];
  const start = Math.ceil(minIdx / step) * step;
  const ticks: number[] = [];
  for (let t = start; t <= maxIdx; t += step) ticks.push(t);
  if (ticks[0] !== minIdx) ticks.unshift(minIdx);
  if (ticks[ticks.length - 1] !== maxIdx) ticks.push(maxIdx);
  return ticks;
}

/** Newest first, ties broken by name so the order never depends on catalog insertion order. */
export function byReleaseDesc(a: DerivedModel, b: DerivedModel): number {
  return monthIndex(b.released) - monthIndex(a.released) || a.name.localeCompare(b.name);
}

/** Models bucketed by release month, each bucket newest-first within itself, buckets newest-first. */
export function groupByMonth(models: DerivedModel[]): { month: string; models: DerivedModel[] }[] {
  const buckets = new Map<string, DerivedModel[]>();
  for (const m of models) {
    const list = buckets.get(m.released);
    if (list) list.push(m);
    else buckets.set(m.released, [m]);
  }
  return Array.from(buckets.entries())
    .sort((a, b) => monthIndex(b[0]) - monthIndex(a[0]))
    .map(([month, list]) => ({
      month,
      models: list.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}
