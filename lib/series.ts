/**
 * Series encoding for the selected models.
 *
 * Colors are the eight slots of the validated categorical palette, ordered so
 * the first six are the most separated pairs — slots 6 and 3 (two greens) and
 * slots 8 and 2 (two warm reds) only meet each other once a comparison runs
 * past six models. Past eight the hues repeat outright.
 *
 * So hue is never the identity channel on its own. Every series also carries a
 * number, drawn as a badge on the mark and repeated in the legend, the tray and
 * the table header — a reader who has learned "3 is Gemini" can find 3 anywhere,
 * whatever the palette is doing. Radar strokes add a dash pattern on top.
 */
const SLOT_ORDER = [1, 2, 3, 5, 7, 4, 6, 8];

export const SERIES_COLORS = SLOT_ORDER.map((n) => `var(--series-${n})`);

export const SERIES_DASH = [
  undefined,
  "6 3",
  "2 3",
  "8 3 2 3",
  "1 3",
  "10 4",
  "4 2 1 2",
  "12 4 2 4",
] as const;

/** How many series can be told apart by hue alone. Past this, badges carry it. */
export const DISTINCT_SERIES = SERIES_COLORS.length;

export function seriesColor(i: number): string {
  return SERIES_COLORS[i % SERIES_COLORS.length];
}

export function seriesDash(i: number): string | undefined {
  return SERIES_DASH[i % SERIES_DASH.length];
}

/** 1-based label for a series — the identity channel that survives a hue clash. */
export function seriesBadge(i: number): string {
  return String(i + 1);
}
