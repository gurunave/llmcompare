import type { Metadata } from "next";
import { CoverageExplorer } from "@/components/CoverageExplorer";
import { PageHeader } from "@/components/PageHeader";
import { BENCHMARKS } from "@/lib/benchmarks";
import { coverageOf, formatShare } from "@/lib/coverage";
import { formatMonth } from "@/lib/format";
import { MODELS, catalog } from "@/lib/models";

export const metadata: Metadata = {
  title: "Data coverage — LLM Compare",
  description:
    "How much of the catalog is actually measured: which benchmarks have results, which models report them, and where the gaps are.",
};

const ALL = coverageOf(MODELS, BENCHMARKS);

export default function CoveragePage() {
  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-6 lg:py-8">
      <PageHeader
        title="Data coverage"
        lead={`${ALL.filled.toLocaleString()} published figures across ${MODELS.length} models and ${
          BENCHMARKS.length
        } benchmarks — ${formatShare(
          ALL.share
        )} of every score that could exist. This page shows which benchmarks have data, which models report them, and what is missing. Last reviewed ${formatMonth(
          catalog.meta.lastReviewed.slice(0, 7)
        )}.`}
      />
      <CoverageExplorer />
    </main>
  );
}
