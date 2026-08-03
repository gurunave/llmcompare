"use client";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { SpecTable } from "@/components/SpecTable";
import { BenchmarkPanel } from "@/components/charts/BenchmarkPanel";
import { RadarPanel } from "@/components/charts/RadarPanel";
import { MAX_SELECTION } from "@/lib/models";
import { useSelection } from "@/lib/selection";

export default function ComparePage() {
  const { models, hidden, toggleVisible, solo, showAll } = useSelection();
  const visibility = { hidden, onToggle: toggleVisible, onSolo: solo, onShowAll: showAll };

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 lg:py-8">
      <PageHeader
        title="Compare"
        lead={
          models.length
            ? `${models.length} of ${MAX_SELECTION} models, side by side. The selection rail keeps this in sync across pages.`
            : "Pick models to compare."
        }
      />

      {models.length === 0 ? (
        <section className="card p-6 text-center">
          <h2 className="text-base font-semibold text-ink">Nothing selected</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-secondary">
            Choose up to {MAX_SELECTION} models and this page fills in with a capability radar,
            benchmark bars and a full spec table.
          </p>
          <Link href="/" className="btn btn-primary mt-4">
            Browse models
          </Link>
        </section>
      ) : (
        <>
          <RadarPanel models={models} {...visibility} />
          <BenchmarkPanel selected={models} {...visibility} />
          {/* The table is a data table, not a series view — it always shows
              every selected model, whatever the charts are hiding. */}
          <SpecTable models={models} />
        </>
      )}
    </main>
  );
}
