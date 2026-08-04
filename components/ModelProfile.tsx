"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { licenceColor, licenceLabel, providerColor, tagColor } from "@/lib/accent";
import { ChartCard } from "@/components/ChartCard";
import { InfoHint } from "@/components/InfoHint";
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
        lead={`Released ${formatMonth(model.released)} · knowledge cutoff ${formatMonth(model.cutoff)}`}
        badges={
          <>
            <span
              className="badge"
              style={{ "--tint": providerColor(model.provider) } as CSSProperties}
            >
              <span className="dot" aria-hidden />
              {model.provider}
            </span>
            <span
              className="badge"
              style={{ "--tint": licenceColor(model.license) } as CSSProperties}
            >
              <span className="dot" aria-hidden />
              {licenceLabel(model.license)}
              {model.license === "open" && model.localTier ? ` · ${model.localTier}` : ""}
            </span>
            {model.tags.map((t) => (
              <span key={t} className="badge" style={{ "--tint": tagColor(t) } as CSSProperties}>
                {t}
              </span>
            ))}
          </>
        }
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
        <Stat label="Context" value={`${formatTokens(model.context)} tok`} tint="var(--series-1)" />
        <Stat
          label="Blended price"
          value={`${formatPrice(model.blendedPrice)} / 1M`}
          tint="var(--series-3)"
        />
        <Stat label="Output speed" value={`${model.speed} tok/s`} tint="var(--series-4)" />
        <Stat
          label="Capability index"
          value={model.capability === null ? "—" : model.capability.toFixed(0)}
          tint="var(--series-2)"
          hint="Each published score placed against its own benchmark's useful range, averaged within its category, then averaged across categories with equal weight. A model measured in only one or two categories is nudged down, so a thin record cannot win on silence."
        />
      </div>

      <RadarPanel models={[model]} />
      <BenchmarkPanel selected={[model]} />
      <SpecTable models={[model]} />

      <ChartCard
        title="Closest alternatives"
        subtitle="Nearest neighbours by blended price and capability index — the models this one actually competes with."
        note="Distance is measured on log price and the capability index, the same two axes as the cost-vs-capability chart."
      >
        <ul className="divide-y divide-[var(--border)]">
          {peers.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <Link
                  href={withSelection(`/models/${p.id}`, ids)}
                  className="text-sm font-medium text-ink hover:text-accent-text hover:underline"
                >
                  {p.name}
                </Link>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-secondary">
                  <span
                    className="dot"
                    style={{ "--tint": providerColor(p.provider) } as CSSProperties}
                    aria-hidden
                  />
                  {p.provider} · {formatPrice(p.blendedPrice)}/1M · {formatTokens(p.context)} ctx
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

/** Stat tile: the value stays in ink; the tint is a left rule that groups it. */
function Stat({
  label,
  value,
  tint,
  hint,
}: {
  label: string;
  value: string;
  tint: string;
  hint?: string;
}) {
  return (
    <div
      className="card border-l-4 p-4"
      style={{ borderLeftColor: tint, background: `color-mix(in srgb, ${tint} 7%, var(--surface-1))` }}
    >
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
        {label}
        {hint && <InfoHint label={label} title={label} body={hint} />}
      </p>
      <p className="mt-1.5 text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}
