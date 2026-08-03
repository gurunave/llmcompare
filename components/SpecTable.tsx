"use client";

import { ChartCard } from "@/components/ChartCard";
import { SeriesBadge } from "@/components/SeriesLegend";
import { formatMonth, formatParams, formatPrice, formatScore, formatTokens } from "@/lib/format";
import type { DerivedModel } from "@/lib/types";

type Dir = "high" | "low" | null;

interface Row {
  label: string;
  dir: Dir;
  value: (m: DerivedModel) => number | null;
  render: (m: DerivedModel) => string;
}

const ROWS: Row[] = [
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
    label: "MMLU-Pro",
    dir: "high",
    value: (m) => m.scores.mmluPro,
    render: (m) => formatScore(m.scores.mmluPro),
  },
  {
    label: "GPQA Diamond",
    dir: "high",
    value: (m) => m.scores.gpqa,
    render: (m) => formatScore(m.scores.gpqa),
  },
  {
    label: "SWE-bench Verified",
    dir: "high",
    value: (m) => m.scores.swebench,
    render: (m) => formatScore(m.scores.swebench),
  },
  {
    label: "AIME math",
    dir: "high",
    value: (m) => m.scores.aime,
    render: (m) => formatScore(m.scores.aime),
  },
  {
    label: "MMMU",
    dir: "high",
    value: (m) => m.scores.mmmu,
    render: (m) => formatScore(m.scores.mmmu),
  },
];

export function SpecTable({ models }: { models: DerivedModel[] }) {
  return (
    <ChartCard
      title="Full specification"
      subtitle="A bold value is the best in its row. Rows where every model ties are not marked."
      note="Prices are list rates for the standard tier; batch, cached-input and volume discounts are not reflected."
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
            {ROWS.map((row) => {
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
                    {row.label}
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
