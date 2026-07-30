/**
 * Series encoding for up to 4 selected models.
 *
 * Colors are slots 1-4 of the validated categorical palette, in the documented
 * order. That order clears the adjacent-pair gates but not the all-pairs gates
 * at four slots, so every chart here pairs color with a second channel:
 * dash pattern on radar strokes, direct labels on scatter points, and the
 * colored chip beside each name in the legend and table headers.
 */
export const SERIES_COLORS = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
] as const;

export const SERIES_DASH = [undefined, "6 3", "2 3", "8 3 2 3"] as const;

export function seriesColor(i: number): string {
  return SERIES_COLORS[i % SERIES_COLORS.length];
}

export function seriesDash(i: number): string | undefined {
  return SERIES_DASH[i % SERIES_DASH.length];
}
