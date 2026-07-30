import { MODELS } from "./models";
import type { DerivedModel } from "./types";

/**
 * Nearest neighbours in (log price, capability) space — the two axes of the
 * cost-vs-capability chart. Price is logged so "twice as expensive" counts the
 * same whether it is $0.10 or $10, and capability is scaled to a comparable
 * range so neither axis dominates the distance.
 */
export function similarModels(target: DerivedModel, limit = 4): DerivedModel[] {
  if (target.capability === null) {
    // Nothing to measure against — fall back to same-provider siblings.
    return MODELS.filter((m) => m.id !== target.id && m.provider === target.provider).slice(
      0,
      limit
    );
  }

  const price = (m: DerivedModel) => Math.log10(Math.max(m.blendedPrice, 0.01));
  const targetPrice = price(target);

  return MODELS.filter((m) => m.id !== target.id && m.capability !== null)
    .map((m) => {
      const dPrice = price(m) - targetPrice;
      const dCap = ((m.capability as number) - (target.capability as number)) / 20;
      return { model: m, distance: Math.hypot(dPrice, dCap) };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((r) => r.model);
}
