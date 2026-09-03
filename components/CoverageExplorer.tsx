"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MultiSelect, type MultiOption } from "@/components/MultiSelect";
import { providerColor } from "@/lib/accent";
import {
  BENCHMARKS,
  CATEGORY_BLURBS,
  CATEGORY_LABELS,
  CATEGORIES_PRESENT,
  scoreOf,
} from "@/lib/benchmarks";
import {
  BAND_LABELS,
  BAND_TINTS,
  bandOf,
  coverageOf,
  formatShare,
  type BenchmarkCoverage,
  type ModelCoverage,
} from "@/lib/coverage";
import { formatElo, formatHours, formatMonth, formatScore } from "@/lib/format";
import { MODELS } from "@/lib/models";
import { useSelection, withSelection } from "@/lib/selection";
import type { Benchmark, BenchmarkCategory, DerivedModel } from "@/lib/types";

type View = "benchmarks" | "models" | "matrix";
type TierFilter = "all" | "headline" | "floor";

const VIEWS: { key: View; label: string }[] = [
  { key: "benchmarks", label: "By benchmark" },
  { key: "models", label: "By model" },
  { key: "matrix", label: "Matrix" },
];

const TIERS: { key: TierFilter; label: string }[] = [
  { key: "all", label: "All benchmarks" },
  { key: "headline", label: "Current" },
  { key: "floor", label: "Retired" },
];

/** Raw scores read in the benchmark's own unit — a percentage is not an Elo. */
function renderScore(b: Benchmark, m: DerivedModel): string {
  const raw = scoreOf(m, b.id);
  if (raw === null) return "—";
  if (b.scale === "elo") return formatElo(raw);
  if (b.scale === "hours") return formatHours(raw);
  return `${formatScore(raw)}%`;
}

export function CoverageExplorer() {
  const { ids } = useSelection();

  const [view, setView] = useState<View>("benchmarks");
  const [query, setQuery] = useState("");
  const [providers, setProviders] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tier, setTier] = useState<TierFilter>("all");

  const providerOptions = useMemo(() => buildProviderOptions(MODELS), []);
  const categoryOptions = useMemo(() => buildCategoryOptions(), []);

  // Both pools are narrowed before coverage is computed, so every number on the
  // page describes the rows actually on screen. Filtering to one provider then
  // answers "how well is this provider measured", which the catalog-wide
  // density cannot.
  const models = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byProvider = new Set(providers);
    return MODELS.filter((m) => {
      if (q && !`${m.name} ${m.provider} ${m.tags.join(" ")}`.toLowerCase().includes(q))
        return false;
      if (byProvider.size > 0 && !byProvider.has(m.provider)) return false;
      return true;
    });
  }, [query, providers]);

  const benchmarks = useMemo(() => {
    const byCategory = new Set(categories);
    return BENCHMARKS.filter((b) => {
      if (byCategory.size > 0 && !byCategory.has(b.category)) return false;
      if (tier !== "all" && b.tier !== tier) return false;
      return true;
    });
  }, [categories, tier]);

  const coverage = useMemo(() => coverageOf(models, benchmarks), [models, benchmarks]);

  const filtering =
    query.trim() !== "" || providers.length > 0 || categories.length > 0 || tier !== "all";

  return (
    <div className="space-y-4">
      <Summary
        filled={coverage.filled}
        cells={coverage.cells}
        share={coverage.share}
        models={coverage.models.length}
        benchmarks={coverage.benchmarks.length}
        unmeasured={coverage.unmeasured.length}
      />

      {/* One filter set drives all three views, so switching views never loses
          the reader's place. */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, provider or tag…"
          aria-label="Search models"
          className="field sm:max-w-xs"
        />
        <MultiSelect
          label="Providers"
          emptyLabel="All"
          placeholder="Search providers…"
          options={providerOptions}
          value={providers}
          onChange={setProviders}
        />
        <MultiSelect
          label="Categories"
          emptyLabel="All"
          placeholder="Search categories…"
          options={categoryOptions}
          value={categories}
          onChange={setCategories}
        />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Benchmark tier">
          {TIERS.map((t) => (
            <Chip key={t.key} active={tier === t.key} onClick={() => setTier(t.key)}>
              {t.label}
            </Chip>
          ))}
        </div>
        {filtering && (
          <span className="text-xs text-ink-muted">
            {coverage.models.length} of {MODELS.length} models · {coverage.benchmarks.length} of{" "}
            {BENCHMARKS.length} benchmarks
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="View">
        {VIEWS.map((v) => (
          <Chip key={v.key} active={view === v.key} onClick={() => setView(v.key)}>
            {v.label}
          </Chip>
        ))}
      </div>

      {coverage.models.length === 0 || coverage.benchmarks.length === 0 ? (
        <p className="card p-6 text-center text-sm text-ink-secondary">
          Nothing left in the pool. Widen a filter to see coverage again.
        </p>
      ) : (
        <>
          {view === "benchmarks" && <ByBenchmark coverage={coverage.byBenchmark} ids={ids} />}
          {view === "models" && <ByModel coverage={coverage.byModel} ids={ids} />}
          {view === "matrix" && (
            <Matrix rows={coverage.byModel} benchmarks={coverage.benchmarks} ids={ids} />
          )}
        </>
      )}
    </div>
  );
}

function Summary({
  filled,
  cells,
  share,
  models,
  benchmarks,
  unmeasured,
}: {
  filled: number;
  cells: number;
  share: number;
  models: number;
  benchmarks: number;
  unmeasured: number;
}) {
  return (
    <section className="card card-accent p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Published figures" value={filled.toLocaleString()} hint={`of ${cells.toLocaleString()} possible`} />
        <Stat label="Filled" value={formatShare(share)} hint={`${models} models × ${benchmarks} benchmarks`} />
        <Stat label="Models" value={String(models)} hint={`${models - unmeasured} with at least one score`} />
        <Stat
          label="Models with no data"
          value={String(unmeasured)}
          hint={unmeasured === 0 ? "every model is measured" : "no published score in this pool"}
        />
      </div>
      <Bar share={share} className="mt-4" />
      <p className="mt-3 text-xs leading-relaxed text-ink-muted">
        The catalog is sparse on purpose: a benchmark a model has no published result for is left
        absent rather than filled with a zero or an estimate. This page is the map of those gaps.
      </p>
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="num mt-0.5 text-2xl font-semibold text-ink">{value}</div>
      {hint && <div className="text-xs text-ink-muted">{hint}</div>}
    </div>
  );
}

/** The one reading of a share used everywhere on the page. */
function Bar({ share, className = "" }: { share: number; className?: string }) {
  const band = bandOf(share);
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--text-muted)_16%,transparent)] ${className}`}
      role="img"
      aria-label={`${formatShare(share)} covered`}
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.max(share * 100, share > 0 ? 1.5 : 0)}%`, background: BAND_TINTS[band] }}
      />
    </div>
  );
}

function BandTag({ share }: { share: number }) {
  const band = bandOf(share);
  return (
    <span className="badge" style={{ ["--tint" as string]: BAND_TINTS[band] }}>
      <span className="dot" />
      {BAND_LABELS[band]}
    </span>
  );
}

function ByBenchmark({ coverage, ids }: { coverage: BenchmarkCoverage[]; ids: string[] }) {
  const byCategory = CATEGORIES_PRESENT.map((category) => ({
    category,
    rows: coverage
      .filter((c) => c.benchmark.category === category)
      .sort((a, b) => b.reported.length - a.reported.length),
  })).filter((g) => g.rows.length > 0);

  return (
    <div className="space-y-4">
      {byCategory.map(({ category, rows }) => (
        <section key={category} className="card p-4 sm:p-5">
          <h2 className="text-base font-semibold text-ink">{CATEGORY_LABELS[category]}</h2>
          <p className="text-xs text-ink-muted">{CATEGORY_BLURBS[category]}</p>
          <ul className="mt-3 space-y-2.5">
            {rows.map((row) => (
              <li key={row.benchmark.id}>
                <BenchmarkRow row={row} ids={ids} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function BenchmarkRow({ row, ids }: { row: BenchmarkCoverage; ids: string[] }) {
  const { benchmark, reported, missing, providers, share } = row;
  const total = reported.length + missing.length;

  return (
    <details className="rounded-lg border border-hairline px-3 py-2.5 open:bg-[var(--wash)]">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="flex flex-wrap items-baseline gap-2">
            {/* Rotates with the disclosure, so a closed row reads as openable
                rather than as a static bar. */}
            <span aria-hidden className="chevron text-ink-muted">›</span>
            <span className="text-sm font-medium text-ink">{benchmark.label}</span>
            {benchmark.tier === "floor" && (
              <span className="text-xs text-ink-muted">retired</span>
            )}
            {benchmark.scale !== "pct" && (
              <span className="text-xs text-ink-muted">
                {benchmark.scale === "elo" ? "Elo rating" : "hours"}
              </span>
            )}
          </span>
          <span className="flex items-center gap-2">
            <BandTag share={share} />
            <span className="num text-sm text-ink-secondary">
              {reported.length}/{total}
            </span>
            <span className="num w-10 text-right text-sm font-medium text-ink">
              {formatShare(share)}
            </span>
          </span>
        </div>
        <Bar share={share} className="mt-1.5" />
        <p className="mt-1 text-xs text-ink-muted">
          {benchmark.blurb}. {providers.length}{" "}
          {providers.length === 1 ? "provider reports" : "providers report"} it — open for the
          model-by-model list.
        </p>
      </summary>

      <div className="mt-3 space-y-3 border-t border-hairline pt-3">
        <ModelList
          title={`Reported (${reported.length})`}
          models={reported}
          ids={ids}
          empty="No model in this pool publishes a figure."
          render={(m) => renderScore(benchmark, m)}
        />
        <ModelList
          title={`Not reported (${missing.length})`}
          models={missing}
          ids={ids}
          empty="Every model in this pool publishes a figure."
          muted
        />
        <p className="text-xs text-ink-muted">Source: {benchmark.source}.</p>
      </div>
    </details>
  );
}

/**
 * Names, not counts. The whole point of the page is being able to see *which*
 * model is missing from a benchmark, so the list is spelled out even when it
 * runs to a hundred entries — capped, with the remainder counted.
 */
const LIST_CAP = 60;

function ModelList({
  title,
  models,
  ids,
  empty,
  muted,
  render,
}: {
  title: string;
  models: DerivedModel[];
  ids: string[];
  empty: string;
  muted?: boolean;
  render?: (m: DerivedModel) => string;
}) {
  const shown = models.slice(0, LIST_CAP);
  const rest = models.length - shown.length;

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</h3>
      {models.length === 0 ? (
        <p className="mt-1 text-xs text-ink-muted">{empty}</p>
      ) : (
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {shown.map((m) => (
            <li key={m.id}>
              <Link
                href={withSelection(`/models/${m.id}`, ids)}
                className={`chip hover:border-[var(--border-strong)] ${muted ? "text-ink-muted" : ""}`}
                title={`${m.name} — ${m.provider}`}
              >
                <span className="dot" style={{ ["--tint" as string]: providerColor(m.provider) }} />
                {m.name}
                {render && <span className="num text-ink-muted">{render(m)}</span>}
              </Link>
            </li>
          ))}
          {rest > 0 && (
            <li className="chip border-dashed text-ink-muted">+{rest} more</li>
          )}
        </ul>
      )}
    </div>
  );
}

type ModelSort = "coverage" | "thinnest" | "released" | "name";

const MODEL_SORTS: { key: ModelSort; label: string }[] = [
  { key: "coverage", label: "Most measured" },
  { key: "thinnest", label: "Least measured" },
  { key: "released", label: "Newest" },
  { key: "name", label: "Name" },
];

function ByModel({ coverage, ids }: { coverage: ModelCoverage[]; ids: string[] }) {
  const [sort, setSort] = useState<ModelSort>("coverage");

  const rows = useMemo(() => {
    const out = [...coverage];
    if (sort === "coverage") out.sort((a, b) => b.reported.length - a.reported.length);
    if (sort === "thinnest") out.sort((a, b) => a.reported.length - b.reported.length);
    if (sort === "name") out.sort((a, b) => a.model.name.localeCompare(b.model.name));
    // `coverage` already arrives newest-first, so "released" needs no sort.
    return out;
  }, [coverage, sort]);

  const total = rows[0] ? rows[0].reported.length + rows[0].missing.length : 0;

  return (
    <section className="card p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">
          What each model has been measured on
        </h2>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sort models">
          {MODEL_SORTS.map((s) => (
            <Chip key={s.key} active={sort === s.key} onClick={() => setSort(s.key)}>
              {s.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="data-table w-full min-w-[720px] border-collapse text-[0.9375rem]">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-ink-muted">
              <th scope="col" className="py-2 pr-3 font-medium">Model</th>
              <th scope="col" className="py-2 pr-3 font-medium">Provider</th>
              <th scope="col" className="py-2 pr-3 font-medium">Released</th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">Scores</th>
              <th scope="col" className="w-40 py-2 pr-3 font-medium">Coverage</th>
              <th scope="col" className="py-2 font-medium">Missing</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ model, reported, missing, share }) => (
              <tr key={model.id} className="border-b border-hairline align-middle">
                <td className="py-2 pr-3">
                  <Link
                    href={withSelection(`/models/${model.id}`, ids)}
                    className="font-medium text-ink hover:underline"
                  >
                    {model.name}
                  </Link>
                </td>
                <td className="py-2 pr-3 text-sm text-ink-secondary">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="dot"
                      style={{ ["--tint" as string]: providerColor(model.provider) }}
                    />
                    {model.provider}
                  </span>
                </td>
                <td className="num py-2 pr-3 text-sm text-ink-secondary">
                  {formatMonth(model.released.slice(0, 7))}
                </td>
                <td className="num py-2 pr-3 text-right">
                  {reported.length}
                  <span className="text-ink-muted">/{total}</span>
                </td>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <Bar share={share} />
                    <span className="num w-10 shrink-0 text-right text-xs text-ink-secondary">
                      {formatShare(share)}
                    </span>
                  </div>
                </td>
                <td className="py-2 text-xs text-ink-muted">
                  {missing.length === 0
                    ? "nothing — complete"
                    : missing
                        .slice(0, 4)
                        .map((b) => b.short)
                        .join(", ") + (missing.length > 4 ? ` +${missing.length - 4}` : "")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * The whole pool at once: one row per model, one column per benchmark, a filled
 * square where a figure exists. It is the only view that shows the shape of the
 * gaps — which benchmarks arrived recently, which models were measured once and
 * never again — because it never aggregates them away.
 */
function Matrix({
  rows,
  benchmarks,
  ids,
}: {
  rows: ModelCoverage[];
  benchmarks: Benchmark[];
  ids: string[];
}) {
  return (
    <section className="card p-4 sm:p-5">
      <h2 className="text-base font-semibold text-ink">Every model against every benchmark</h2>
      <p className="mt-1 text-sm text-ink-secondary">
        A filled square is a published figure — hover or focus one for the score. Models are newest
        first, so the diagonal of empties at the top is a benchmark the older half of the catalog
        was never run on.
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] bg-accent" aria-hidden />
          published
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-3 w-3 rounded-[3px]"
            style={{ background: "color-mix(in srgb, var(--text-muted) 12%, transparent)" }}
            aria-hidden
          />
          not published
        </span>
        <span>The number after a model name is its total.</span>
      </div>

      <div className="-mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {/* `w-max` rather than `w-full`: a full-width table hands the slack to
            the name column and pushes the grid off to the right. */}
        <table className="w-max border-collapse text-xs">
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 bg-surface pb-2 pr-3 text-left align-bottom font-medium text-ink-muted"
              >
                Model
              </th>
              {benchmarks.map((b) => (
                <th
                  key={b.id}
                  scope="col"
                  className="px-0.5 pb-2 align-bottom font-medium text-ink-muted"
                  title={`${b.label} — ${b.blurb}`}
                >
                  <span className="block h-20 [writing-mode:vertical-rl] [transform:rotate(180deg)] whitespace-nowrap">
                    {b.short}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ model, reported }) => (
              <tr key={model.id} className="hover:bg-[var(--accent-wash)]">
                <th
                  scope="row"
                  className="sticky left-0 z-10 max-w-[13rem] truncate bg-surface py-1 pr-3 text-left font-normal"
                >
                  <Link
                    href={withSelection(`/models/${model.id}`, ids)}
                    className="text-ink-secondary hover:underline"
                  >
                    {model.name}
                  </Link>
                  <span className="num ml-1.5 text-ink-muted">{reported.length}</span>
                </th>
                {benchmarks.map((b) => {
                  const has = scoreOf(model, b.id) !== null;
                  return (
                    <td key={b.id} className="px-0.5 py-1">
                      {/* The square is decorative; the cell's title carries the
                          reading for a pointer and the caption for a reader. */}
                      <span
                        className="mx-auto block h-3.5 w-3.5 rounded-[3px]"
                        style={{
                          background: has
                            ? "var(--accent)"
                            : "color-mix(in srgb, var(--text-muted) 12%, transparent)",
                        }}
                        title={`${model.name} — ${b.label}: ${has ? renderScore(b, model) : "not published"}`}
                      />
                      <span className="sr-only">
                        {b.label}: {has ? renderScore(b, model) : "not published"}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`chip ${active ? "chip-active" : "hover:border-[var(--border-strong)]"}`}
    >
      {children}
    </button>
  );
}

function buildProviderOptions(all: DerivedModel[]): MultiOption[] {
  const counts = new Map<string, number>();
  for (const m of all) counts.set(m.provider, (counts.get(m.provider) ?? 0) + 1);
  return Array.from(counts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([provider, count]) => ({
      id: provider,
      label: provider,
      hint: `${count} model${count === 1 ? "" : "s"}`,
      tint: providerColor(provider),
    }));
}

function buildCategoryOptions(): MultiOption[] {
  return CATEGORIES_PRESENT.map((c: BenchmarkCategory) => {
    const n = BENCHMARKS.filter((b) => b.category === c).length;
    return {
      id: c,
      label: CATEGORY_LABELS[c],
      hint: `${n} benchmark${n === 1 ? "" : "s"}`,
      search: BENCHMARKS.filter((b) => b.category === c)
        .map((b) => `${b.label} ${b.short}`)
        .join(" "),
    };
  });
}
