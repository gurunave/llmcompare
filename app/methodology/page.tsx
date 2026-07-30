import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { formatMonth } from "@/lib/format";
import { AXIS_HELP, AXIS_LABELS, MODELS, catalog } from "@/lib/models";
import type { AxisKey, ScoreKey } from "@/lib/types";

export const metadata: Metadata = {
  title: "Methodology — LLM Compare",
  description:
    "Where the numbers come from, how blended price and the mean score are computed, and what the radar axes mean.",
};

const AXES: AxisKey[] = [
  "knowledge",
  "reasoning",
  "coding",
  "math",
  "speed",
  "value",
  "context",
];

export default function MethodologyPage() {
  const benchmarks = Object.entries(catalog.meta.benchmarks) as [ScoreKey, string][];

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 lg:py-8">
      <PageHeader
        title="Methodology"
        lead="What the numbers mean, how the derived ones are computed, and how far to trust them."
      />

      <section className="card p-4 sm:p-5">
        <h2 className="text-base font-semibold text-ink">Where the data comes from</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          Every figure lives in a single bundled file, <code>data/models.json</code>, covering{" "}
          {MODELS.length} models from {new Set(MODELS.map((m) => m.provider)).size} providers. There
          is no API and no runtime network call: what you see is what shipped with the build, last
          reviewed {formatMonth(catalog.meta.lastReviewed.slice(0, 7))}.
        </p>
        <p className="mt-3 rounded-lg border border-hairline p-3 text-sm leading-relaxed text-ink-secondary">
          <strong className="text-ink">Treat the numbers as approximate.</strong>{" "}
          {catalog.meta.disclaimer}
        </p>
      </section>

      <section className="card p-4 sm:p-5">
        <h2 className="text-base font-semibold text-ink">Benchmarks</h2>
        <dl className="mt-3 space-y-3">
          {benchmarks.map(([key, description]) => (
            <div key={key}>
              <dt className="text-sm font-medium text-ink">{description.split(" - ")[0]}</dt>
              <dd className="mt-0.5 text-sm text-ink-secondary">
                {description.split(" - ")[1] ?? description}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm leading-relaxed text-ink-secondary">
          A blank cell means the score is not published or not comparably measured. It is never
          treated as a zero — a model with fewer published benchmarks is scored on what it does
          publish, then nudged down slightly so a thin record cannot win on silence.
        </p>
      </section>

      <section className="card p-4 sm:p-5">
        <h2 className="text-base font-semibold text-ink">Derived numbers</h2>
        <dl className="mt-3 space-y-3 text-sm">
          <div>
            <dt className="font-medium text-ink">Blended price</dt>
            <dd className="mt-0.5 text-ink-secondary">
              <code>(3 × input + output) / 4</code> — a 3:1 input:output token mix, roughly the
              shape of a typical API workload. List rates only: batch, cached-input and volume
              discounts are not reflected.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-ink">Mean score</dt>
            <dd className="mt-0.5 text-ink-secondary">
              The average of MMLU-Pro, GPQA, SWE-bench and AIME across the ones a model actually
              publishes. This is the y-axis of the cost-vs-capability chart.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-ink">Value</dt>
            <dd className="mt-0.5 text-ink-secondary">
              Mean score divided by blended price, then log-scaled and normalized across the
              catalog.
            </dd>
          </div>
        </dl>
      </section>

      <section className="card p-4 sm:p-5">
        <h2 className="text-base font-semibold text-ink">Radar axes</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          Each axis is normalized 0–100 across the whole catalog, so a shape is only meaningful
          relative to the other models here. Speed, value and context are log-scaled first, so a
          10× lead reads as a step rather than flattening every other model against the axis.
        </p>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          {AXES.map((axis) => (
            <div key={axis} className="rounded-lg border border-hairline px-3 py-2">
              <dt className="text-sm font-medium text-ink">{AXIS_LABELS[axis]}</dt>
              <dd className="text-xs text-ink-secondary">{AXIS_HELP[axis]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card p-4 sm:p-5">
        <h2 className="text-base font-semibold text-ink">Correcting something</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          Edit <code>data/models.json</code> and the charts, filters, normalization and
          recommendations all follow — no other file needs to change. Prices and scores move
          constantly, so verify against the provider&apos;s own documentation before making a
          purchasing decision.
        </p>
      </section>
    </main>
  );
}
