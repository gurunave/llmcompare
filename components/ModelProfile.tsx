"use client";

import Link from "next/link";
import { ChartCard } from "@/components/ChartCard";
import { PageHeader } from "@/components/PageHeader";
import { SpecTable } from "@/components/SpecTable";
import { BenchmarkPanel } from "@/components/charts/BenchmarkPanel";
import { RadarPanel } from "@/components/charts/RadarPanel";
import { formatMonth, formatPrice, formatTokens } from "@/lib/format";
import { MAX_SELECTION } from "@/lib/models";
import { useSelection, withSelection } from "@/lib/selection";
import type { DerivedModel } from "@/lib/types";

export function ModelProfile({
  model,
  peers,
}: {
  model: DerivedModel;
  peers: DerivedModel[];
}) {
  const { ids, toggle, isFull } = useSelection();
  const isSelected = ids.includes(model.id);

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 lg:py-8">
      <PageHeader
        title={model.name}
        lead={`${model.provider} · released ${formatMonth(model.released)} · ${
          model.license === "open" ? "open weights" : "proprietary"
        }`}
        crumbs={[
          { label: "Browse", href: withSelection("/", ids) },
          { label: model.provider },
          { label: model.name },
        ]}
        actions={
          <>
            <button
              type="button"
              className={isSelected ? "btn" : "btn btn-primary"}
              onClick={() => toggle(model.id)}
              disabled={!isSelected && isFull}
              title={
                !isSelected && isFull
                  ? `Remove one of the ${MAX_SELECTION} selected models first`
                  : undefined
              }
            >
              {isSelected ? "Remove from selection" : "Add to selection"}
            </button>
            <Link href={withSelection("/compare", ids)} className="btn">
              Compare
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Context" value={`${formatTokens(model.context)} tok`} />
        <Stat label="Blended price" value={`${formatPrice(model.blendedPrice)} / 1M`} />
        <Stat label="Output speed" value={`${model.speed} tok/s`} />
        <Stat
          label="Mean score"
          value={model.capability === null ? "—" : model.capability.toFixed(0)}
        />
      </div>

      <RadarPanel models={[model]} />
      <BenchmarkPanel selected={[model]} />
      <SpecTable models={[model]} />

      <ChartCard
        title="Closest alternatives"
        subtitle="Nearest neighbours by blended price and mean benchmark score — the models this one actually competes with."
        note="Distance is measured on log price and mean score, the same two axes as the cost-vs-capability chart."
      >
        <ul className="divide-y divide-[var(--border)]">
          {peers.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <Link
                  href={withSelection(`/models/${p.id}`, ids)}
                  className="text-sm font-medium text-ink hover:underline"
                >
                  {p.name}
                </Link>
                <p className="mt-0.5 text-xs text-ink-secondary">
                  {p.provider} · {formatPrice(p.blendedPrice)}/1M ·{" "}
                  {formatTokens(p.context)} ctx
                </p>
              </div>
              <button
                type="button"
                className="btn py-1.5 text-xs"
                onClick={() => toggle(p.id)}
                disabled={!ids.includes(p.id) && isFull}
              >
                {ids.includes(p.id) ? "Remove" : "Add"}
              </button>
            </li>
          ))}
        </ul>
      </ChartCard>

      <p className="text-xs text-ink-muted">
        Provider documentation:{" "}
        <a
          href={model.url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-ink"
        >
          {new URL(model.url).hostname}
        </a>
      </p>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="num mt-1 text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}
