/**
 * Identity colors for providers and licences.
 *
 * These are decorative accents, never the sole carrier of meaning: every dot
 * and badge sits beside the text it belongs to. Hues are the eight slots of the
 * validated categorical palette, assigned to a provider by a stable hash so a
 * provider keeps its color as the catalog grows — color follows the entity, not
 * its rank in the current sort.
 */

const SLOTS = 8;

export function providerColor(provider: string): string {
  let h = 0;
  for (let i = 0; i < provider.length; i++) {
    h = (h * 31 + provider.charCodeAt(i)) >>> 0;
  }
  return `var(--series-${(h % SLOTS) + 1})`;
}

export function tagColor(tag: string): string {
  return providerColor(tag);
}

export function licenceColor(license: "open" | "proprietary"): string {
  return license === "open" ? "var(--open)" : "var(--proprietary)";
}

export function licenceLabel(license: "open" | "proprietary"): string {
  return license === "open" ? "Open weights" : "Proprietary";
}
