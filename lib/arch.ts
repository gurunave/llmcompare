import archJson from "@/data/arch.json";
import { MODELS } from "./models";
import type { DerivedModel, ModelArch } from "./types";

/**
 * Architecture blocks live in their own file rather than inside each model.
 *
 * Only the hardware page needs them — sizing weights and a KV cache is the one
 * thing that cares how many layers a model has — but every page that touched
 * the catalog was shipping them to the browser, roughly a fifth of its bytes,
 * to render a price and a benchmark score. Keeping them separate means the
 * browse, compare and model pages never load them at all.
 */
export const ARCH_BY_ID = new Map<string, ModelArch>(
  Object.entries(archJson as Record<string, ModelArch>)
);

/** The catalog with architecture attached — what the hardware page sizes against. */
export const MODELS_WITH_ARCH: DerivedModel[] = MODELS.map((m) => {
  const arch = ARCH_BY_ID.get(m.id);
  return arch ? { ...m, arch } : m;
});
