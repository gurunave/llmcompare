"use client";

import { useState } from "react";
import { ChartCard } from "@/components/ChartCard";
import { InfoHint } from "@/components/InfoHint";
import { SeriesBadge } from "@/components/SeriesLegend";
import { CATEGORY_BLURBS, CATEGORY_LABELS, FLOOR, HEADLINE, scoreOf } from "@/lib/benchmarks";
import {
  formatElo,
  formatHours,
  formatMonth,
  formatParams,
  formatPrice,
  formatScore,
  formatTokens,
} from "@/lib/format";
import type { Benchmark, DerivedModel } from "@/lib/types";

type Dir = "high" | "low" | null;

interface Row {
  label: string;
  dir: Dir;
  value: (m: DerivedModel) => number | null;
  render: (m: DerivedModel) => string;
  /** Shown behind an info icon beside the row label. */
  hint?: string;
  source?: string;
}

/** Registry order, so adding a benchmark adds its row without editing this file. */
function benchmarkRow(b: Benchmark): Row {
  const format = b.scale === "elo" ? formatElo : b.scale === "hours" ? formatHours : formatScore;
  return {
    label: b.label,
    dir: "high",
    value: (m) => scoreOf(m, b.id),
    render: (m) => format(scoreOf(m, b.id)),
    hint: `${b.blurb}.`,
    source: b.source,
  };
}

const SPEC_ROWS: Row[] = [
  { label: "Provider", dir: null, value: () => null, render: (m) => m.provider },
  { label: "Released", dir: null, value: () => null, render: (m) => formatMonth(m.released) },
  {
    label: "Weights",
    dir: null,
    value: () => null,
    render: (m) => (m.license === "open" ? `Open (${m.localTier ?? "self-host"})` : "Proprietary"),
  },
  { label: "Parameters", dir: null, value: () => null, render: (m) => formatParams(m.params) },
  {
    label: "Context window",
    dir: "high",
    value: (m) => m.context,
    render: (m) => `${formatTokens(m.context)} tok`,
  },
  {
    label: "Max output",
    dir: "high",
    value: (m) => m.maxOutput,
    render: (m) => `${formatTokens(m.maxOutput)} tok`,
  },
  {
    label: "Modalities",
    dir: null,
    value: () => null,
    render: (m) => m.modalities.join(", "),
  },
  {
    label: "Reasoning mode",
    dir: null,
    value: () => null,
    render: (m) => (m.reasoning ? "Yes" : "No"),
  },
  {
    label: "Input price",
    dir: "low",
    value: (m) => m.pricing.input,
    render: (m) => `${formatPrice(m.pricing.input)} / 1M`,
  },
  {
    label: "Output price",
    dir: "low",
    value: (m) => m.pricing.output,
    render: (m) => `${formatPrice(m.pricing.output)} / 1M`,
  },
  {
    label: "Blended price",
    dir: "low",
    value: (m) => m.blendedPrice,
    render: (m) => `${formatPrice(m.blendedPrice)} / 1M`,
  },
  {
    label: "Output speed",
    dir: "high",
    value: (m) => m.speed,
    render: (m) => `${m.speed} tok/s`,
  },
  { label: "Knowledge cutoff", dir: null, value: () => null, render: (m) => formatMonth(m.cutoff) },
  {
    label: "Capability index",
    dir: "high",
    value: (m) => m.capability,
    render: (m) => formatScore(m.capability),
  },
];

const CATEGORY_ROWS: Row[] = (Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[])
  .filter((c) => HEADLINE.concat(FLOOR).some((b) => b.category === c && b.inIndex))
  .map((c) => ({
    label: `${CATEGORY_LABELS[c]} score`,
    dir: "high" as Dir,
    value: (m: DerivedModel) => m.categories[c] ?? null,
    render: (m: DerivedModel) => formatScore(m.categories[c] ?? null),
    hint: `${CATEGORY_BLURBS[c]}. Averages the benchmarks a model published in this category, each placed against its own useful range first.`,
    source: `Built from: ${HEADLINE.concat(FLOOR).filter((b) => b.category === c && b.inIndex).map((b) => b.label).join(", ")}`,
  }));

const HEADLINE_ROWS: Row[] = HEADLINE.map(benchmarkRow);
const FLOOR_ROWS: Row[] = FLOOR.map(benchmarkRow);

export function SpecTable({ models }: { models: DerivedModel[] }) {
  // The retired benchmarks are still the densest data in the catalog, so they
  // stay one click away rather than being dropped — but they no longer sit
  // between the reader and the numbers that still separate models.
  const [showFloor, setShowFloor] = useState(false);
  const rows = [
    ...SPEC_ROWS,
    ...CATEGORY_ROWS,
    ...HEADLINE_ROWS,
    ...(showFloor ? FLOOR_ROWS : []),
  ];

  return (
    <ChartCard
      title="Full specification"
      subtitle="A bold value is the best in its row. Rows where every model ties are not marked."
      note="Prices are list rates for the standard tier; batch, cached-input and volume discounts are not reflected."
      actions={
        <button type="button" className="chip" onClick={() => setShowFloor((v) => !v)}>
          {showFloor ? "Hide" : "Show"} retired benchmarks
        </button>
      }
    >
      {/* The spec column is pinned: with ten models the value columns scroll
          sideways, and a value is meaningless once its row label has left. */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-hairline">
              <th
                scope="col"
                className="sticky left-0 z-10 bg-surface py-2 pr-4 text-left font-medium text-ink-muted"
              >
                Spec
              </th>
              {models.map((m, i) => (
                <th
                  key={m.id}
                  scope="col"
                  className="whitespace-nowrap py-2 pl-4 text-left font-semibold text-ink"
                >
                  <span className="flex items-center gap-2">
                    <SeriesBadge index={i} />
                    {m.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const values = models.map(row.value);
              const numeric = values.filter((v): v is number => typeof v === "number");
              const allTied = new Set(numeric).size <= 1;
              const best =
                row.dir === null || numeric.length === 0 || allTied
                  ? null
                  : row.dir === "high"
                    ? Math.max(...numeric)
                    : Math.min(...numeric);

              return (
                <tr key={row.label} className="border-b border-hairline last:border-0">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 whitespace-nowrap bg-surface py-2 pr-4 text-left font-normal text-ink-secondary"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {row.label}
                      {row.hint && (
                        <InfoHint
                          label={row.label}
                          title={row.label}
                          body={row.hint}
                          source={row.source}
                        />
                      )}
                    </span>
                  </th>
                  {models.map((m, i) => {
                    const isBest = best !== null && values[i] === best;
                    return (
                      <td
                        key={m.id}
                        className={`num py-2 pl-4 ${isBest ? "font-semibold text-ink" : "text-ink-secondary"}`}
                      >
                        {row.render(m)}
                        {isBest && <span className="sr-only"> (best of the compared models)</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}
