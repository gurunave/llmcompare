"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import { ChartCard } from "@/components/ChartCard";
import { providerColor } from "@/lib/accent";
import {
  DEFAULT_FIT_FILTERS,
  FIT_SORTS,
  SPEED_OPTIONS,
  filterFits,
  isFitFiltered,
  sortFits,
  type FitFilters,
  type FitSortKey,
} from "@/lib/fitTable";
import { formatParams } from "@/lib/format";
import {
  MAX_CONTEXT,
  QUANTS,
  VERDICT_GLYPH,
  VERDICT_LABEL,
  VERDICT_TINT,
  formatContext,
  formatGiB,
  formatTokPerSec,
  usableBytes,
  type ContextChoice,
  type Fit,
  type Footprint,
  type QuantKey,
  type Rig,
} from "@/lib/hardware";
import { withSelection } from "@/lib/selection";

interface Props {
  fits: Fit[];
  rig: Rig;
  floor: QuantKey;
  context: ContextChoice;
  users: number;
  selected: string[];
  onToggle: (id: string) => void;
}

export function HardwareFit({ fits, rig, floor, context, users, selected, onToggle }: Props) {
  const [showOversize, setShowOversize] = useState(false);
  const [showHosted, setShowHosted] = useState(false);
  const [sortKey, setSortKey] = useState<FitSortKey>("capability");
  const [filters, setFilters] = useState<FitFilters>(DEFAULT_FIT_FILTERS);

  function set<K extends keyof FitFilters>(key: K, value: FitFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const sizable = fits.filter((f) => f.verdict !== "unsizable");
  const fitting = sizable.filter((f) => f.best);
  const oversize = sizable.filter((f) => !f.best);
  const hosted = fits.filter((f) => f.verdict === "unsizable");
  const top = fitting[0];

  // How the sizing was framed, mid-sentence. Naming the cap matters: a reader
  // who asked for 1M and sees a 32K model fitting comfortably is owed the
  // reason, which is that it was never sized at 1M.
  const askedFor =
    (context === MAX_CONTEXT
      ? "each model's own maximum context"
      : `${context.toLocaleString()} tokens of context`) +
    (users > 1 ? ` for each of ${users} people at once` : "");
  const capped = sizable.filter((f) => f.capped).length;

  // Models that miss by a little are the useful ones to name: they are what a
  // memory upgrade, or one more step of quantization, would actually buy.
  const nearMiss = oversize
    .map((f) => ({ f, need: f.ladder[f.ladder.length - 1].total }))
    .filter(({ need }) => need <= usableBytes(rig) * 2)
    .sort((a, b) => a.need - b.need)
    .slice(0, 3);

  const providers = useMemo(
    () => Array.from(new Set(fits.map((f) => f.model.provider))).sort(),
    [fits]
  );
  const table = useMemo(() => {
    const view = (group: Fit[]) => sortFits(filterFits(group, filters), sortKey);
    return { fitting: view(fitting), oversize: view(oversize), hosted: view(hosted) };
  }, [fitting, oversize, hosted, filters, sortKey]);
  const filtered = isFitFiltered(filters);
  const speedLabel = users > 1 ? "tok/s per user" : "tokens/sec";

  return (
    <div className="space-y-4">
      <section className="card card-accent p-4 sm:p-5">
        {fitting.length === 0 ? (
          <>
            <h2 className="text-lg font-semibold text-ink">
              Nothing in the catalog fits {rig.label} at these settings
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
              {formatGiB(usableBytes(rig))} of usable memory is not enough for any open-weight
              model here once a cache for {askedFor} is reserved. Try a shorter context, an 8-bit
              cache, or a lower quality floor.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-ink">
              <span className="num">{fitting.length}</span> of{" "}
              <span className="num">{sizable.length}</span> open-weight models fit {rig.label}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
              At {askedFor} and no worse than{" "}
              {QUANTS.find((q) => q.key === floor)?.label}, the most capable one is{" "}
              <Link href={withSelection(`/models/${top.model.id}`, selected)} className="link font-medium">
                {top.model.name}
              </Link>{" "}
              at {top.best?.quant.label} — {formatGiB(top.best?.total ?? 0)} of{" "}
              {formatGiB(usableBytes(rig))}
              {top.throughput && `, an estimated ${formatTokPerSec(top.throughput)} ${speedLabel}`}.
              {top.verdict === "tight" &&
                " That is tight enough that anything else wanting memory will push it out — the next row down will have more room."}
            </p>
            {capped > 0 && (
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                <span className="num">{capped}</span> of them cannot hold that much and are sized
                at their own maximum instead — a model is never charged for a cache longer than it
                can serve.
              </p>
            )}
          </>
        )}

        {nearMiss.length > 0 && (
          <p className="mt-3 border-t border-hairline pt-3 text-xs text-ink-muted">
            <span className="font-medium text-ink-secondary">Just out of reach:</span>{" "}
            {nearMiss.map(({ f, need }, i) => (
              <span key={f.model.id}>
                {i > 0 && " · "}
                {f.model.name} needs <span className="num">{formatGiB(need)}</span>
              </span>
            ))}
          </p>
        )}
      </section>

      <ChartCard
        title="What runs, and how"
        subtitle={`Each row shows the highest-precision quantization that fits, then the whole ladder. Speed is ${
          users > 1 ? `what each of ${users} simultaneous users sees` : "a single-stream decode estimate"
        }, not a measurement.`}
        note="A cell marks whether that quantization fits in memory alongside the KV cache — it says nothing about whether the quality holds up. Hover any cell for the numbers behind it."
      >
        <div className="mb-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={filters.query}
              onChange={(e) => set("query", e.target.value)}
              placeholder="Name, provider or tag…"
              aria-label="Search models"
              className="field sm:max-w-[15rem]"
            />
            <select
              value={filters.provider}
              onChange={(e) => set("provider", e.target.value)}
              aria-label="Filter by provider"
              className="field sm:w-auto"
            >
              <option value="all">All providers</option>
              {providers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={filters.minSpeed}
              onChange={(e) => set("minSpeed", Number(e.target.value))}
              aria-label={`Minimum ${speedLabel}`}
              className="field sm:w-auto"
            >
              {SPEED_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.value && users > 1 ? `${o.label} per user` : o.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-ink-secondary sm:ml-auto">
              Sort
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as FitSortKey)}
                aria-label="Sort models"
                className="field w-auto"
              >
                {FIT_SORTS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip
              active={filters.comfortableOnly}
              onClick={() => set("comfortableOnly", !filters.comfortableOnly)}
            >
              Fits with room to spare
            </FilterChip>
            <FilterChip active={filters.reasoning} onClick={() => set("reasoning", !filters.reasoning)}>
              Reasoning
            </FilterChip>
            <FilterChip active={filters.multimodal} onClick={() => set("multimodal", !filters.multimodal)}>
              Sees images
            </FilterChip>
            {filtered && (
              <>
                <span className="ml-1 text-xs text-ink-muted">
                  Showing <span className="num">{table.fitting.length}</span> of{" "}
                  <span className="num">{fitting.length}</span> that fit
                </span>
                <button
                  type="button"
                  onClick={() => setFilters(DEFAULT_FIT_FILTERS)}
                  className="link ml-1 text-xs font-medium"
                >
                  Clear filters
                </button>
              </>
            )}
          </div>
        </div>

        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="data-table w-full min-w-[880px] border-collapse text-[15px]">
            <thead>
              <tr className="border-b border-hairline">
                <th
                  scope="col"
                  className="sticky left-0 z-10 bg-surface py-2 pr-4 text-left text-sm font-medium text-ink-muted"
                >
                  Model
                </th>
                <th scope="col" className="whitespace-nowrap px-3 py-2 text-left text-sm font-medium text-ink-muted">
                  Best fit
                </th>
                <th scope="col" className="whitespace-nowrap px-3 py-2 text-right text-sm font-medium text-ink-muted">
                  Footprint
                </th>
                <th
                  scope="col"
                  className="whitespace-nowrap px-3 py-2 text-right text-sm font-medium text-ink-muted"
                  title={users > 1 ? "Decode speed each user sees; hover a row for the total" : undefined}
                >
                  {users > 1 ? "Est. tok/s / user" : "Est. tok/s"}
                </th>
                {QUANTS.map((q) => (
                  <th
                    key={q.key}
                    scope="col"
                    title={q.quality}
                    className="whitespace-nowrap px-2 py-2 text-center text-xs font-medium text-ink-muted"
                  >
                    {q.label}
                  </th>
                ))}
                <th scope="col" className="px-3 py-2 text-right text-sm font-medium text-ink-muted">
                  <span className="sr-only">Compare</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {table.fitting.length === 0 && (
                <tr className="border-b border-hairline">
                  <td colSpan={5 + QUANTS.length} className="py-6 text-center text-sm text-ink-muted">
                    {fitting.length === 0
                      ? "Nothing fits at these settings."
                      : "No model that fits matches these filters."}
                  </td>
                </tr>
              )}
              {table.fitting.map((f) => (
                <FitRow
                  key={f.model.id}
                  fit={f}
                  showContext={f.capped || context === MAX_CONTEXT}
                  selected={selected}
                  onToggle={onToggle}
                />
              ))}

              {table.oversize.length > 0 && (
                <tr className="border-b border-hairline">
                  <td colSpan={5 + QUANTS.length} className="py-2">
                    <button
                      type="button"
                      onClick={() => setShowOversize((v) => !v)}
                      aria-expanded={showOversize}
                      className="sticky left-0 text-sm font-medium text-accent-text hover:underline"
                    >
                      {showOversize ? "▾" : "▸"} {table.oversize.length} model
                      {table.oversize.length === 1 ? "" : "s"} too big for this configuration
                    </button>
                  </td>
                </tr>
              )}
              {showOversize &&
                table.oversize.map((f) => (
                  <FitRow
                    key={f.model.id}
                    fit={f}
                    showContext={f.capped || context === MAX_CONTEXT}
                    selected={selected}
                    onToggle={onToggle}
                  />
                ))}

              {table.hosted.length > 0 && (
                <tr className="border-b border-hairline">
                  <td colSpan={5 + QUANTS.length} className="py-2">
                    <button
                      type="button"
                      onClick={() => setShowHosted((v) => !v)}
                      aria-expanded={showHosted}
                      className="sticky left-0 text-sm font-medium text-accent-text hover:underline"
                    >
                      {showHosted ? "▾" : "▸"} {table.hosted.length} hosted model
                      {table.hosted.length === 1 ? "" : "s"} with no published weights
                    </button>
                  </td>
                </tr>
              )}
              {showHosted &&
                table.hosted.map((f) => (
                  <FitRow
                    key={f.model.id}
                    fit={f}
                    showContext={f.capped || context === MAX_CONTEXT}
                    selected={selected}
                    onToggle={onToggle}
                  />
                ))}
            </tbody>
          </table>
        </div>

        {table.hosted.length > 0 && (
          <p className="mt-3 text-xs text-ink-muted">
            Those {table.hosted.length} are not too big — they are undownloadable. No provider publishes
            their weights or parameter counts, so there is nothing to size.{" "}
            <Link href={withSelection("/recommend", selected)} className="link">
              Comparing hosted APIs instead?
            </Link>
          </p>
        )}
      </ChartCard>
    </div>
  );
}

function FitRow({
  fit,
  showContext,
  selected,
  onToggle,
}: {
  fit: Fit;
  /** Name the context this row was sized at — when it is not the one asked for. */
  showContext: boolean;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const m = fit.model;
  const isSelected = selected.includes(m.id);
  const best = fit.best;
  const smallest = fit.ladder[fit.ladder.length - 1];
  const estimated = m.arch?.source === "estimated";

  return (
    <tr className="border-b border-hairline last:border-0">
      <th
        scope="row"
        className="sticky left-0 z-10 bg-surface py-2 pr-4 text-left font-normal"
      >
        <span className="flex flex-col gap-0.5">
          <Link href={withSelection(`/models/${m.id}`, selected)} className="font-medium text-ink hover:underline">
            {m.name}
          </Link>
          <span className="flex items-center gap-1.5 text-xs text-ink-muted">
            <span className="badge" style={{ "--tint": providerColor(m.provider) } as CSSProperties}>
              <span className="dot" aria-hidden />
              {m.provider}
            </span>
            <span className="num">{formatParams(m.params)}</span>
            {m.arch?.activeParams && (
              <span className="num" title="Active parameters per token">
                ({m.arch.activeParams}B active)
              </span>
            )}
            {showContext && (
              <span
                className="num"
                title={`Sized at its ${fit.context.toLocaleString()}-token maximum${
                  fit.capped ? ", which is shorter than the context requested" : ""
                }`}
              >
                · {formatContext(fit.context)} max
              </span>
            )}
          </span>
        </span>
      </th>

      <td className="whitespace-nowrap px-3 py-2">
        <span
          className="inline-flex items-center gap-1.5 text-sm"
          style={{ color: VERDICT_TINT[fit.verdict] }}
        >
          <span aria-hidden>{VERDICT_GLYPH[fit.verdict]}</span>
          <span className="text-ink-secondary">
            {best ? `${VERDICT_LABEL[fit.verdict]} at ${best.quant.label}` : VERDICT_LABEL[fit.verdict]}
          </span>
        </span>
        {estimated && (
          <span
            className="ml-1.5 text-[11px] text-ink-muted"
            title="Architecture scaled from a sibling model — no config published"
          >
            est.
          </span>
        )}
      </td>

      <td className="num whitespace-nowrap px-3 py-2 text-right text-ink-secondary">
        {best ? (
          formatGiB(best.total)
        ) : smallest ? (
          <span title={`Smallest build is ${formatGiB(smallest.total)}`}>
            needs {formatGiB(smallest.total)}
          </span>
        ) : (
          "—"
        )}
      </td>

      <td
        className="num whitespace-nowrap px-3 py-2 text-right text-ink-secondary"
        title={
          fit.throughput && fit.users > 1
            ? `${formatTokPerSec({
                low: fit.throughput.low * fit.users,
                high: fit.throughput.high * fit.users,
              })} tok/s in total across ${fit.users} users`
            : undefined
        }
      >
        {fit.throughput ? formatTokPerSec(fit.throughput) : "—"}
      </td>

      {QUANTS.map((q, i) => {
        const step = fit.ladder[i];
        return (
          <td key={q.key} className="px-2 py-2 text-center">
            {step ? <LadderCell step={step} label={q.label} /> : <span className="text-ink-muted">—</span>}
          </td>
        );
      })}

      <td className="px-3 py-2 text-right">
        <button type="button" className="btn py-1 text-xs" onClick={() => onToggle(m.id)}>
          {isSelected ? "Remove" : "Compare"}
        </button>
      </td>
    </tr>
  );
}

/** The glyph carries the state, the title carries the arithmetic. */
function LadderCell({ step, label }: { step: Footprint; label: string }) {
  return (
    <span
      style={{ color: VERDICT_TINT[step.verdict] }}
      title={`${label}: ${formatGiB(step.total)} — ${formatGiB(step.weights)} weights, ${formatGiB(
        step.kv
      )} cache, ${formatGiB(step.overhead)} overhead (${Math.round(step.load * 100)}% of usable memory)`}
    >
      <span aria-hidden>{VERDICT_GLYPH[step.verdict]}</span>
      <span className="sr-only">
        {label}: {VERDICT_LABEL[step.verdict]}, {formatGiB(step.total)}
      </span>
    </span>
  );
}

function FilterChip({
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
