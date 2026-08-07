import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import {
  BENCHMARKS,
  CATEGORIES_PRESENT,
  CATEGORY_BLURBS,
  CATEGORY_LABELS,
  INDEX_CATEGORIES,
  benchmarksIn,
  scoreOf,
} from "@/lib/benchmarks";
import { ARCH_BY_ID } from "@/lib/arch";
import { formatMonth } from "@/lib/format";
import { AXIS_HELP, AXIS_LABELS, MODELS, catalog } from "@/lib/models";
import type { AxisKey } from "@/lib/types";

export const metadata: Metadata = {
  title: "Methodology — LLM Compare",
  description:
    "Where the numbers come from, how blended price and the capability index are computed, and what the radar axes mean.",
};

const AXES: AxisKey[] = [
  "agentic",
  "coding",
  "reasoning",
  "math",
  "knowledge",
  "tooluse",
  "speed",
  "value",
  "context",
];

/** How many models carry a published figure for each benchmark. */
function coverageOf(id: string): number {
  return MODELS.filter((m) => scoreOf(m, id) !== null).length;
}

export default function MethodologyPage() {
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
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          {BENCHMARKS.length} benchmarks in {CATEGORIES_PRESENT.length} categories. The ones marked{" "}
          <em>retired</em> — MMLU-Pro, GPQA Diamond, SWE-bench Verified, AIME, MMMU — are at or near
          their ceiling and no longer separate frontier models. They are kept because they are by
          far the densest data in the catalog and a floor is more useful than a blank, but they are
          collapsed by default and never lead a picker. The count after each name is how many of the{" "}
          {MODELS.length} models carry a published figure for it.
        </p>

        {CATEGORIES_PRESENT.map((category) => (
          <div key={category} className="mt-4">
            <h3 className="text-sm font-semibold text-ink">{CATEGORY_LABELS[category]}</h3>
            <p className="text-xs text-ink-muted">{CATEGORY_BLURBS[category]}</p>
            <dl className="mt-2 space-y-2.5">
              {benchmarksIn(category).map((b) => (
                <div key={b.id}>
                  <dt className="flex flex-wrap items-baseline gap-2 text-sm font-medium text-ink">
                    {b.label}
                    {b.tier === "floor" && (
                      <span className="text-xs font-normal text-ink-muted">retired</span>
                    )}
                    <span className="num text-xs font-normal text-ink-muted">
                      {coverageOf(b.id)}/{MODELS.length}
                    </span>
                  </dt>
                  <dd className="mt-0.5 text-sm text-ink-secondary">{b.blurb}.</dd>
                  <dd className="text-xs text-ink-muted">Source: {b.source}.</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}

        <p className="mt-4 text-sm leading-relaxed text-ink-secondary">
          A blank cell means the score is not published or not comparably measured. It is never
          treated as a zero — a model is scored on what it does publish. Coverage on the newer
          benchmarks is thin and will stay thin: several of them have results for a dozen models or
          fewer, and an estimate would be worse than a gap.
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
            <dt className="font-medium text-ink">Capability index</dt>
            <dd className="mt-0.5 text-ink-secondary">
              Built in three steps. Each published score is first placed on a 0–100 scale by where
              it sits in <em>its own</em> benchmark&apos;s useful range — the range is listed with
              each benchmark and is fixed rather than taken from the catalog&apos;s current min and
              max, so a ninth published result does not move the other eight. Those normalized
              scores are then averaged within their category, and the categories are averaged with
              equal weight to give the index. A model measured in only one or two categories is
              nudged down slightly at the end, so a thin record cannot win on silence. This is the
              y-axis of the cost-vs-capability chart.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-ink">Why a retired benchmark cannot reach the top</dt>
            <dd className="mt-0.5 text-ink-secondary">
              Their ranges run past the maximum score anyone can actually get. Saturating a test
              that no longer separates models demonstrates the floor, not frontier ability, so a
              near-perfect GPQA reads as strong rather than best. Without that headroom the index
              inverted: a model that reported Humanity&apos;s Last Exam scored below one that
              reported only GPQA, which is the failure this whole scheme exists to avoid.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-ink">Why not a plain mean of the scores</dt>
            <dd className="mt-0.5 text-ink-secondary">
              Because the benchmarks are no longer in the same difficulty band. The best score in
              this catalog is 53 on Humanity&apos;s Last Exam and 30 on ARC-AGI-3, against 91 on
              MMLU-Pro. Averaged raw, a frontier model that reports the hard evaluations would land
              below a mid-tier model that only reports the easy ones — the headline number would
              reward not publishing. Normalizing per benchmark, then averaging per category, removes
              both effects: one benchmark in a category counts as much as six, so the index tracks
              how broadly a model is good rather than how much its vendor chose to disclose.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-ink">Category scores</dt>
            <dd className="mt-0.5 text-ink-secondary">
              The {INDEX_CATEGORIES.length} categories the index averages are{" "}
              {INDEX_CATEGORIES.map((c) => CATEGORY_LABELS[c].toLowerCase()).join(", ")}. Multimodal
              is measured and shown but left out of the index, since a text-only model should not be
              marked down for a modality it never claimed. The Artificial Analysis Intelligence
              Index is also excluded — it is itself a composite of benchmarks already counted here,
              so including it would weight them twice.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-ink">Value</dt>
            <dd className="mt-0.5 text-ink-secondary">
              Capability index divided by blended price, then log-scaled and normalized across the
              catalog.
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-sm leading-relaxed text-ink-secondary">
          Two measures deliberately sit outside all of this. <strong>METR time horizons</strong> are
          a task length in human-hours, not a percentage, and <strong>LMArena Elo</strong> is a
          relative rating with no fixed ceiling that measures which answer people prefer rather than
          which is correct. Neither can share an axis with a pass rate or be averaged into an index,
          so both are shown on their own scale in the spec table and the axis pickers.
        </p>
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
        <h2 className="text-base font-semibold text-ink">Sizing a model for hardware</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          The <a href="/hardware" className="link">hardware page</a> sizes the{" "}
          {ARCH_BY_ID.size} open-weight models against a machine. Each one
          carries an <code>arch</code> block — layers, KV heads, head dimension, active parameters —
          taken from its published <code>config.json</code>, or scaled from the nearest sibling and
          marked <em>est.</em> where no config exists. Nothing is guessed silently.
        </p>

        <dl className="mt-3 space-y-3 text-sm">
          <div>
            <dt className="font-medium text-ink">Weights</dt>
            <dd className="mt-0.5 text-ink-secondary">
              Parameters × bytes per parameter, calibrated against real llama.cpp K-quant file
              sizes rather than the nominal bit width — scales and zero-points are real bytes, so
              &ldquo;4-bit&rdquo; lands nearer 4.8. FP16 2.0, Q8 1.06, Q6_K 0.82, Q5_K_M 0.72,
              Q4_K_M 0.60, Q3_K_M 0.48 bytes per parameter.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-ink">KV cache</dt>
            <dd className="mt-0.5 text-ink-secondary">
              <code>2 × layers × kvHeads × headDim × bytes × tokens</code>. Three architectures
              break that formula and are handled separately: MLA models cache one compressed latent
              instead of a K and a V, which is why a 685B DeepSeek needs less cache than a 70B
              Llama; SSM hybrids hold a cache on only a few of their layers; and models that
              interleave sliding-window attention pay a flat rate on most layers once the context
              passes the window. The context is capped at each model&rsquo;s own published maximum:
              asking for more tokens than a model can serve is not a configuration it can be run
              in, so it is sized at its ceiling rather than charged for a cache it would never
              allocate. The <em>Max</em> setting sizes every model at that ceiling.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-ink">Usable memory</dt>
            <dd className="mt-0.5 text-ink-secondary">
              94% of a discrete card, after the driver and display; 75% of a unified pool, which is
              roughly what macOS hands the GPU by default. Runtime overhead is charged at 5% of
              weights or 0.8 GB, whichever is larger. Anything past 90% of usable memory is marked{" "}
              <em>tight</em> rather than fitting.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-ink">Speed</dt>
            <dd className="mt-0.5 text-ink-secondary">
              Decoding one token reads the active weights once, so throughput is bounded by memory
              bandwidth: <code>bandwidth ÷ (active weights + cache read)</code>. A mixture-of-experts
              reads only its active parameters, which is why a 235B MoE decodes like a 22B dense
              model. The range shown is the 55–85% of peak bandwidth a real runtime reaches.
            </dd>
          </div>
        </dl>

        <p className="mt-3 rounded-lg border border-hairline p-3 text-sm leading-relaxed text-ink-secondary">
          <strong className="text-ink">These are estimates, and speed is an upper bound.</strong>{" "}
          Memory should land within about 10–20% of a real runtime. Throughput is a roofline: it
          assumes memory bandwidth is the only limit, so batching, long prompts and per-layer
          synchronisation all pull it down. A large mixture-of-experts sharded across many devices
          is where it is most optimistic — expert dispatch and cross-device traffic dominate there,
          and real single-stream decoding can land several times below the figure shown. Benchmark
          before you buy.
        </p>
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
