/** Axis-domain arithmetic for zooming a chart. Pure — the React side is in components/charts/zoom.tsx. */

export type Domain = [number, number];

/** Zooming past this share of the full span stops being useful and starts losing the plot. */
const MIN_SPAN_SHARE = 0.01;
/** A drag shorter than this share of the current span on an axis leaves that axis alone. */
const MIN_DRAG_SHARE = 0.03;

const toSpace = (v: number, log: boolean) => (log ? Math.log10(v) : v);
const fromSpace = (v: number, log: boolean) => (log ? 10 ** v : v);

export function ordered(a: number, b: number): Domain {
  return a <= b ? [a, b] : [b, a];
}

/**
 * Scale a domain about its centre — in log space on a log axis, so a zoom
 * keeps the same number of decades either side. The result is shifted back
 * inside `base` rather than cut, so zooming out near an edge keeps its width.
 */
export function zoomDomain(d: Domain, base: Domain, factor: number, log: boolean): Domain {
  const [a, b] = [toSpace(d[0], log), toSpace(d[1], log)];
  const [ba, bb] = [toSpace(base[0], log), toSpace(base[1], log)];
  const full = bb - ba;
  const half = Math.min(Math.max(((b - a) / 2) * factor, (full * MIN_SPAN_SHARE) / 2), full / 2);
  const centre = (a + b) / 2;
  let lo = centre - half;
  let hi = centre + half;
  if (lo < ba) [lo, hi] = [ba, ba + 2 * half];
  if (hi > bb) [lo, hi] = [bb - 2 * half, bb];
  return [fromSpace(lo, log), fromSpace(hi, log)];
}

/** Whether `d` is (to rounding) the whole of `base` — i.e. not zoomed at all. */
export function covers(d: Domain, base: Domain, log: boolean): boolean {
  const eps = (toSpace(base[1], log) - toSpace(base[0], log)) * 1e-6;
  return (
    toSpace(d[0], log) <= toSpace(base[0], log) + eps &&
    toSpace(d[1], log) >= toSpace(base[1], log) - eps
  );
}

/** The part of `d` inside `base`, or null when they do not overlap. */
export function intersect(d: Domain, base: Domain): Domain | null {
  const lo = Math.max(d[0], base[0]);
  const hi = Math.min(d[1], base[1]);
  return hi > lo ? [lo, hi] : null;
}

/**
 * The domain a dragged box asks for on one axis: the box, clamped to the full
 * range and widened to the minimum span — or the current domain unchanged when
 * the drag along this axis was too short to mean anything.
 */
export function dragDomain(a: number, b: number, current: Domain, base: Domain, log: boolean): Domain {
  const [lo, hi] = ordered(a, b);
  const span = (x: Domain) => toSpace(x[1], log) - toSpace(x[0], log);
  if (span([lo, hi]) < span(current) * MIN_DRAG_SHARE) return current;
  const clamped = intersect([lo, hi], base) ?? current;
  return zoomDomain(clamped, base, 1, log);
}

function niceStep(raw: number): number {
  const exp = Math.floor(Math.log10(raw));
  const f = raw / 10 ** exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nice * 10 ** exp;
}

/** Evenly spaced round numbers inside a domain. `integer` keeps month indices whole. */
export function linearTicks(d: Domain, count = 5, integer = false): number[] {
  const span = d[1] - d[0];
  if (!(span > 0)) return [d[0]];
  let step = niceStep(span / count);
  if (integer) step = Math.max(1, Math.round(step));
  const ticks: number[] = [];
  for (let t = Math.ceil(d[0] / step) * step; t <= d[1] + step * 1e-9; t += step) {
    ticks.push(Number(t.toPrecision(12)));
  }
  return ticks;
}

/** 1-2-5 ticks per decade, falling back to linear ones once the view is under a decade wide. */
export function logTicks(d: Domain): number[] {
  const ticks: number[] = [];
  for (let exp = Math.floor(Math.log10(d[0])); exp <= Math.ceil(Math.log10(d[1])); exp++) {
    for (const m of [1, 2, 5]) {
      const v = Number((m * 10 ** exp).toPrecision(12));
      if (v >= d[0] && v <= d[1]) ticks.push(v);
    }
  }
  return ticks.length >= 3 ? ticks : linearTicks(d, 4);
}

export function inDomain(v: number, d: Domain): boolean {
  return v >= d[0] && v <= d[1];
}
