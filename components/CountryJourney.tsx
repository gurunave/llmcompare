"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/ChartCard";
import { InfoHint } from "@/components/InfoHint";
import { formatMonth, formatScore } from "@/lib/format";
import {
  COUNTRIES,
  formatPercent,
  journeyOf,
  milestonesOf,
  standingsOf,
  type Country,
  type CountryCode,
  type JourneyMonth,
  type Standing,
} from "@/lib/geography";
import { MODELS } from "@/lib/models";
import { useSelection, withSelection } from "@/lib/selection";
import { indexToMonth, monthTicks } from "@/lib/timeline";
import type { DerivedModel } from "@/lib/types";

type View = "hold" | "best" | "catalog";
type Licence = "all" | "open" | "proprietary";

const VIEWS: { key: View; label: string }[] = [
  { key: "hold", label: "Frontier hold" },
  { key: "best", label: "Best model" },
  { key: "catalog", label: "Catalog share" },
];

const LICENCES: { key: Licence; label: string }[] = [
  { key: "all", label: "All models" },
  { key: "open", label: "Open weights" },
  { key: "proprietary", label: "Proprietary" },
];

/** How many seats the frontier holds. Ten is the usual "top ten" reading. */
const FRONTIER_SIZES = [5, 10, 20];

const HOLD_HINT =
  "For every month, the catalog as it stood then is ranked by capability index and the top N taken as the frontier. A country's hold is how many of those seats its models occupy. Seats measure presence, not lead: the catalog keeps superseded models, so a lab shipping many checkpoints holds more seats than one shipping a single stronger model.";

export function CountryJourney() {
  const { ids } = useSelection();

  const [view, setView] = useState<View>("hold");
  const [licence, setLicence] = useState<Licence>("all");
  const [size, setSize] = useState(10);
  const [focus, setFocus] = useState<CountryCode | null>(null);

  const pool = useMemo(
    () => (licence === "all" ? MODELS : MODELS.filter((m) => m.license === licence)),
    [licence]
  );

  const standings = useMemo(() => standingsOf(pool, size), [pool, size]);
  const journey = useMemo(() => journeyOf(pool, size), [pool, size]);

  // The focused country can vanish under a licence filter — a country with no
  // open-weight release has no journey to show, so the panel closes itself
  // rather than rendering an empty one.
  const focused = standings.find((s) => s.country.code === focus) ?? null;

  const last = journey[journey.length - 1] ?? null;
  const changes = useMemo(() => leadChanges(journey), [journey]);

  return (
    <div className="space-y-4">
      <Summary standings={standings} journey={journey} pool={pool.length} size={size} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="View">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setView(v.key)}
              aria-pressed={view === v.key}
              className={`chip ${view === v.key ? "chip-active" : ""}`}
              style={view === v.key ? ({ background: "var(--wash)" } as CSSProperties) : undefined}
            >
              {v.label}
            </button>
          ))}
        </div>

        <label className="ml-auto inline-flex items-center gap-1.5 text-xs text-ink-secondary">
          <span className="font-medium">Licence</span>
          <select
            value={licence}
            onChange={(e) => setLicence(e.target.value as Licence)}
            aria-label="Licence"
            className="field w-auto py-1.5 text-xs"
          >
            {LICENCES.map((l) => (
              <option key={l.key} value={l.key}>
                {l.label}
              </option>
            ))}
          </select>
        </label>

        <span className="inline-flex items-center gap-1.5">
          <label className="inline-flex items-center gap-1.5 text-xs text-ink-secondary">
            <span className="font-medium">Frontier</span>
            <select
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              aria-label="Frontier size"
              className="field w-auto py-1.5 text-xs"
            >
              {FRONTIER_SIZES.map((n) => (
                <option key={n} value={n}>
                  Top {n}
                </option>
              ))}
            </select>
          </label>
          <InfoHint label="frontier hold" title="How the hold is counted" body={HOLD_HINT} />
        </span>
      </div>

      {journey.length === 0 ? (
        <p className="card p-6 text-sm text-ink-secondary">
          No models match this licence, so there is no journey to draw.
        </p>
      ) : view === "best" ? (
        <BestChart journey={journey} standings={standings} />
      ) : (
        <ShareChart
          journey={journey}
          standings={standings}
          mode={view}
          size={size}
          last={last}
          changes={changes}
        />
      )}

      <Standings
        standings={standings}
        size={size}
        focus={focus}
        onFocus={(code) => setFocus((prev) => (prev === code ? null : code))}
      />

      {focused && <Milestones standing={focused} pool={pool} ids={ids} />}
    </div>
  );
}

/** The four numbers that answer "who holds the frontier" before any chart loads. */
function Summary({
  standings,
  journey,
  pool,
  size,
}: {
  standings: Standing[];
  journey: JourneyMonth[];
  pool: number;
  size: number;
}) {
  const top = standings[0];
  const last = journey[journey.length - 1];
  const first = journey[0];
  const holders = standings.filter((s) => s.frontier.length > 0).length;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat
        label="Countries shipping"
        value={String(standings.length)}
        detail={`${pool} models from ${new Set(standings.flatMap((s) => s.providers)).size} labs`}
      />
      <Stat
        label="Frontier leader"
        value={top ? `${top.country.flag} ${top.country.code}` : "—"}
        detail={
          top
            ? `${top.frontier.length} of the top ${size} — ${formatPercent(
                top.frontier.length / Math.max(1, last?.frontierSize ?? size)
              )}`
            : "no ranked models"
        }
        tint={top?.country.tint}
      />
      <Stat
        label="Countries on the frontier"
        value={String(holders)}
        detail={`${standings.length - holders} ship models but hold no seat`}
      />
      <Stat
        label="Journey span"
        value={`${journey.length} mo`}
        detail={
          first && last ? `${formatMonth(first.month)} → ${formatMonth(last.month)}` : "no releases"
        }
      />
    </div>
  );
}

function Stat({
  label,
  value,
  detail,
  tint,
}: {
  label: string;
  value: string;
  detail: string;
  tint?: string;
}) {
  return (
    <div
      className="card p-3.5"
      style={tint ? ({ borderLeft: `3px solid ${tint}` } as CSSProperties) : undefined}
    >
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className="num mt-1 text-xl font-bold text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-ink-secondary">{detail}</p>
    </div>
  );
}

interface ShareRow {
  idx: number;
  [code: string]: number;
}

/**
 * The hold itself: a stacked area, one band per country, over the months.
 * Normalized to a share of the frontier so the reader sees a division of a
 * fixed pie rather than a pile that grows because the catalog grew — the
 * catalog view stacks raw counts instead, where growth is the point.
 */
function ShareChart({
  journey,
  standings,
  mode,
  size,
  last,
  changes,
}: {
  journey: JourneyMonth[];
  standings: Standing[];
  mode: "hold" | "catalog";
  size: number;
  last: JourneyMonth | null;
  changes: { month: string; code: CountryCode }[];
}) {
  const hold = mode === "hold";

  // Countries are stacked in standings order so the largest band sits at the
  // bottom, against the axis, where a share is easiest to read off.
  const stacked = standings.filter((s) =>
    hold ? journey.some((m) => m.frontier[s.country.code] > 0) : true
  );

  const rows: ShareRow[] = journey.map((m) => {
    const row: ShareRow = { idx: m.idx };
    for (const s of stacked) {
      const code = s.country.code;
      row[code] = hold ? (m.frontierShare[code] ?? 0) * 100 : (m.cumulative[code] ?? 0);
    }
    return row;
  });

  const ticks = monthTicks(journey[0].idx, journey[journey.length - 1].idx);
  const held = last ? stacked.filter((s) => last.frontier[s.country.code] > 0) : [];

  return (
    <ChartCard
      title={hold ? `Share of the top ${size}, month by month` : "Catalog share, month by month"}
      subtitle={
        hold
          ? "Each band is one country's seats on the running frontier, as a share of it. The catalog is re-ranked every month against only what had shipped by then, so this is the standing as it looked at the time rather than in hindsight."
          : "Every model released up to each month, stacked by the country its publisher is headquartered in. Presence in the catalog, not strength — the frontier view is the one that reads position."
      }
      note={
        hold
          ? `${
              changes.length > 1
                ? `The overall lead changed hands ${changes.length - 1} time${
                    changes.length === 2 ? "" : "s"
                  }: ${changes
                    .map((c) => `${COUNTRIES.get(c.code)?.code ?? c.code} at ${formatMonth(c.month)}`)
                    .join(" → ")}.`
                : "The overall lead never changed hands in this pool."
            } A month with fewer than ${size} ranked models divides the seats it has.`
          : "Superseded models stay in the catalog, so these are releases ever shipped, not models still current."
      }
    >
      <div className="h-[340px] w-full sm:h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 12, right: 20, bottom: 24, left: 4 }}>
            <CartesianGrid stroke="var(--gridline)" strokeDasharray="2 4" />
            <XAxis
              type="number"
              dataKey="idx"
              domain={["dataMin", "dataMax"]}
              ticks={ticks}
              tickFormatter={(v: number) => formatMonth(indexToMonth(Math.round(v)))}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--baseline)" }}
            />
            <YAxis
              domain={hold ? [0, 100] : [0, "auto"]}
              ticks={hold ? [0, 25, 50, 75, 100] : undefined}
              tickFormatter={(v: number) => (hold ? `${v}%` : String(v))}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--baseline)" }}
              width={56}
              label={{
                value: hold ? "Share of frontier" : "Models released",
                angle: -90,
                position: "insideLeft",
                fill: "var(--text-muted)",
                fontSize: 12,
                style: { textAnchor: "middle" },
              }}
            />
            <Tooltip
              content={<ShareTooltip stacked={stacked} hold={hold} journey={journey} />}
              cursor={{ stroke: "var(--text-muted)", strokeDasharray: "3 3" }}
            />
            {stacked.map((s) => (
              <Area
                key={s.country.code}
                type="linear"
                dataKey={s.country.code}
                stackId="1"
                stroke={s.country.tint}
                strokeWidth={1.5}
                fill={s.country.tint}
                fillOpacity={0.5}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hairline pt-3">
        {stacked.map((s) => (
          <CountryKey
            key={s.country.code}
            country={s.country}
            detail={
              hold
                ? last && last.frontier[s.country.code] > 0
                  ? `${last.frontier[s.country.code]} seat${
                      last.frontier[s.country.code] === 1 ? "" : "s"
                    }`
                  : "none now"
                : `${s.models.length}`
            }
          />
        ))}
        {hold && held.length === 0 && (
          <span className="text-xs text-ink-muted">No country holds a seat in this pool.</span>
        )}
      </div>
    </ChartCard>
  );
}

/**
 * The other half of the question: not how many seats a country holds, but how
 * close its best model has come to the best one anywhere. A flat line here
 * with seats on the other chart means a country is present but not advancing.
 */
function BestChart({ journey, standings }: { journey: JourneyMonth[]; standings: Standing[] }) {
  // A country whose best never registers has nothing but nulls to draw.
  const drawn = standings.filter((s) => journey.some((m) => m.best[s.country.code] !== null));

  const rows = journey.map((m) => {
    const row: Record<string, number | null> = { idx: m.idx, ceiling: m.ceiling };
    for (const s of drawn) row[s.country.code] = m.best[s.country.code];
    return row;
  });

  const ticks = monthTicks(journey[0].idx, journey[journey.length - 1].idx);
  const last = journey[journey.length - 1];

  return (
    <ChartCard
      title="Best published capability, month by month"
      subtitle="Each line is the highest capability index a country had published by that month — a running best, so it only ever steps up. The gap between a line and the top one is how far that country's strongest model sat behind the strongest anywhere."
      note="A step means a country's own record moved, not that a model was released — most releases sit under a sibling that already scored higher. Models with no published benchmark result cannot be ranked and never appear."
    >
      <div className="h-[340px] w-full sm:h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 12, right: 20, bottom: 24, left: 4 }}>
            <CartesianGrid stroke="var(--gridline)" strokeDasharray="2 4" />
            <XAxis
              type="number"
              dataKey="idx"
              domain={["dataMin", "dataMax"]}
              ticks={ticks}
              tickFormatter={(v: number) => formatMonth(indexToMonth(Math.round(v)))}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--baseline)" }}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 20, 40, 60, 80, 100]}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--baseline)" }}
              width={36}
              label={{
                value: "Capability index",
                angle: -90,
                position: "insideLeft",
                fill: "var(--text-muted)",
                fontSize: 12,
                style: { textAnchor: "middle" },
              }}
            />
            <Tooltip
              content={<BestTooltip drawn={drawn} />}
              cursor={{ stroke: "var(--text-muted)", strokeDasharray: "3 3" }}
            />
            {drawn.map((s) => (
              <Line
                key={s.country.code}
                type="stepAfter"
                dataKey={s.country.code}
                stroke={s.country.tint}
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hairline pt-3">
        {drawn.map((s) => (
          <CountryKey
            key={s.country.code}
            country={s.country}
            detail={`${formatScore(last.best[s.country.code])}${
              last.ceiling !== null && last.best[s.country.code] !== null
                ? ` · ${formatScore(last.ceiling - (last.best[s.country.code] as number))} behind`
                : ""
            }`}
          />
        ))}
      </div>
    </ChartCard>
  );
}

function CountryKey({ country, detail }: { country: Country; detail: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-ink-secondary">
      <span className="dot" style={{ background: country.tint }} aria-hidden />
      {country.flag} {country.name}
      <span className="num text-ink-muted">{detail}</span>
    </span>
  );
}

function ShareTooltip({
  active,
  label,
  stacked,
  hold,
  journey,
}: {
  active?: boolean;
  label?: number;
  stacked: Standing[];
  hold: boolean;
  journey: JourneyMonth[];
}) {
  const month = journey.find((m) => m.idx === label);
  if (!active || !month) return null;

  const rows = stacked
    .map((s) => ({
      country: s.country,
      value: hold ? month.frontier[s.country.code] ?? 0 : month.cumulative[s.country.code] ?? 0,
      share: hold ? month.frontierShare[s.country.code] ?? 0 : 0,
    }))
    .filter((r) => r.value > 0);

  return (
    <div className="card p-3 shadow-lg">
      <p className="text-sm font-semibold text-ink">{formatMonth(month.month)}</p>
      <p className="mb-2 text-xs text-ink-muted">
        {hold
          ? `${month.frontierSize} ranked model${month.frontierSize === 1 ? "" : "s"} on the frontier`
          : `${Object.values(month.cumulative).reduce((a, b) => a + b, 0)} models released so far`}
      </p>
      <dl className="space-y-0.5 text-xs">
        {rows.map((r) => (
          <div key={r.country.code} className="flex items-center justify-between gap-6">
            <dt className="flex items-center gap-1.5 text-ink-secondary">
              <span className="dot" style={{ background: r.country.tint }} aria-hidden />
              {r.country.name}
            </dt>
            <dd className="num text-ink">
              {hold ? `${r.value} · ${formatPercent(r.share)}` : r.value}
            </dd>
          </div>
        ))}
        {rows.length === 0 && <p className="text-ink-muted">Nothing ranked yet.</p>}
      </dl>
    </div>
  );
}

function BestTooltip({
  active,
  label,
  payload,
  drawn,
}: {
  active?: boolean;
  label?: number;
  payload?: Array<{ dataKey: string; value: number | null }>;
  drawn: Standing[];
}) {
  if (!active || !payload?.length || label === undefined) return null;
  const ceiling = payload.find((p) => p.dataKey === "ceiling")?.value ?? null;

  const rows = drawn
    .map((s) => ({
      country: s.country,
      value: payload.find((p) => p.dataKey === s.country.code)?.value ?? null,
    }))
    .filter((r): r is { country: Country; value: number } => r.value !== null)
    .sort((a, b) => b.value - a.value);

  return (
    <div className="card p-3 shadow-lg">
      <p className="mb-2 text-sm font-semibold text-ink">
        {formatMonth(indexToMonth(Math.round(label)))}
      </p>
      <dl className="space-y-0.5 text-xs">
        {rows.map((r, i) => (
          <div key={r.country.code} className="flex items-center justify-between gap-6">
            <dt className="flex items-center gap-1.5 text-ink-secondary">
              <span className="dot" style={{ background: r.country.tint }} aria-hidden />
              {r.country.name}
            </dt>
            <dd className="num text-ink">
              {formatScore(r.value)}
              {i > 0 && (
                <span className="text-ink-muted"> · {formatScore(rows[0].value - r.value)} back</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {ceiling !== null && rows.length === 0 && (
        <p className="text-xs text-ink-muted">Nothing scored yet.</p>
      )}
    </div>
  );
}

/** Today's table: who holds what, and the way into one country's own history. */
function Standings({
  standings,
  size,
  focus,
  onFocus,
}: {
  standings: Standing[];
  size: number;
  focus: CountryCode | null;
  onFocus: (code: CountryCode) => void;
}) {
  return (
    <section className="card card-accent p-4 sm:p-5">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-ink">Where each country stands now</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
          Ordered by seats held on the current top {size}, then by best score. Select a country to
          read its own record of milestones.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {standings.map((s) => {
          const active = focus === s.country.code;
          return (
            <button
              key={s.country.code}
              type="button"
              onClick={() => onFocus(s.country.code)}
              aria-pressed={active}
              className={`card p-3.5 text-left transition-colors hover:bg-[var(--wash)] ${
                active ? "ring-1 ring-[var(--accent)]" : ""
              }`}
              style={{ borderLeft: `3px solid ${s.country.tint}` }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-ink">
                  {s.country.flag} {s.country.name}
                </span>
                <span className="num text-xs text-ink-muted">{s.country.region}</span>
              </div>

              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <Cell label={`Top ${size} seats`} value={`${s.frontier.length}`} />
                <Cell label="Best index" value={formatScore(s.capability)} />
                <Cell
                  label="Models"
                  value={`${s.models.length} · ${formatPercent(s.share)}`}
                />
                <Cell label="Open weights" value={formatPercent(s.openShare)} />
              </dl>

              <p className="mt-2 text-xs text-ink-secondary">
                {s.best ? (
                  <>
                    Best: <span className="text-ink">{s.best.name}</span>
                    {s.gap !== null && s.gap > 0 && (
                      <span className="text-ink-muted"> · {formatScore(s.gap)} behind the top</span>
                    )}
                  </>
                ) : (
                  "No benchmarked model."
                )}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {s.providers.length} lab{s.providers.length === 1 ? "" : "s"}
                {s.first && ` · first shipped ${formatMonth(s.first)}`}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink-muted">{label}</dt>
      <dd className="num font-medium text-ink">{value}</dd>
    </div>
  );
}

/** One country's journey written out: every model that moved its own record. */
function Milestones({
  standing,
  pool,
  ids,
}: {
  standing: Standing;
  pool: DerivedModel[];
  ids: string[];
}) {
  const milestones = useMemo(
    () => milestonesOf(standing.country.code, pool),
    [standing.country.code, pool]
  );

  return (
    <section className="card card-accent p-4 sm:p-5">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-ink">
          {standing.country.flag} {standing.country.name} — the record, step by step
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
          {milestones.length === 0
            ? "No model from here has a published capability index, so there is no record to trace."
            : `${milestones.length} release${
                milestones.length === 1 ? " has" : "s have"
              } moved this country's best score, out of ${standing.models.length} shipped. Newest first.`}
        </p>
      </header>

      <ol className="space-y-2">
        {milestones.map((ms) => (
          <li
            key={ms.model.id}
            className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-l-2 pl-3"
            style={{ borderColor: standing.country.tint }}
          >
            <span className="num w-20 shrink-0 text-xs text-ink-muted">
              {formatMonth(ms.model.released)}
            </span>
            <Link
              href={withSelection(`/models/${ms.model.id}`, ids)}
              className="link font-medium text-ink"
            >
              {ms.model.name}
            </Link>
            <span className="text-xs text-ink-secondary">{ms.model.provider}</span>
            <span className="num ml-auto text-xs text-ink">
              {ms.from === null ? "first ranked" : `${formatScore(ms.from)} → `}
              {ms.from !== null && formatScore(ms.to)}
              {ms.from === null && ` at ${formatScore(ms.to)}`}
            </span>
            <span
              className="badge shrink-0"
              style={{
                background: ms.tookLead
                  ? "color-mix(in srgb, var(--series-1) 22%, transparent)"
                  : "var(--wash)",
              }}
            >
              {ms.tookLead ? "took the overall lead" : `${formatScore(ms.gap)} behind the top`}
            </span>
          </li>
        ))}
      </ol>

      {standing.notes.length > 0 && (
        <div className="mt-4 border-t border-hairline pt-3">
          <p className="text-xs font-medium text-ink-secondary">On this attribution</p>
          <ul className="mt-1 space-y-0.5 text-xs text-ink-muted">
            {standing.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-xs text-ink-muted">
        Labs counted here: {standing.providers.join(", ")}.
      </p>
    </section>
  );
}

/** Every month the overall lead moved to a different country, oldest first. */
function leadChanges(journey: JourneyMonth[]): { month: string; code: CountryCode }[] {
  const out: { month: string; code: CountryCode }[] = [];
  for (const m of journey) {
    if (m.leader && m.leader !== out[out.length - 1]?.code) {
      out.push({ month: m.month, code: m.leader });
    }
  }
  return out;
}
