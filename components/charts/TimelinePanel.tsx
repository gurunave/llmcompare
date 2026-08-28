"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { ChartCard } from "@/components/ChartCard";
import { SeriesLegend } from "@/components/SeriesLegend";
import { formatMonth, formatScore, formatTokens } from "@/lib/format";
import { indexToMonth, monthIndex, monthTicks } from "@/lib/timeline";
import { seriesColor } from "@/lib/series";
import type { DerivedModel } from "@/lib/types";

interface Point {
  id: string;
  name: string;
  provider: string;
  x: number;
  y: number;
  z: number;
  color: string;
  license: string;
}

/** Past this many highlighted points a name label on every dot just overlaps. */
const NAMED_LABEL_LIMIT = 6;

interface Props {
  /** Already filtered by the page's search/provider/license controls. */
  pool: DerivedModel[];
  /** The whole selection — position in this list fixes each series' color and badge. */
  selected: DerivedModel[];
  hidden?: Set<string>;
  onToggle?: (id: string) => void;
  onSolo?: (id: string) => void;
  onShowAll?: () => void;
}

/**
 * Release date against capability, rather than a bare list of dates — it turns
 * "when did this come out" into "how good was the frontier at that point,"
 * which is the more useful question. Models without a published capability
 * score have no y to plot and drop out of this view; they still show up in
 * the feed and the table.
 */
export function TimelinePanel({ pool, selected, hidden, onToggle, onSolo, onShowAll }: Props) {
  const shownIds = new Set(selected.filter((m) => !hidden?.has(m.id)).map((m) => m.id));

  const { plottable, toPoint } = useMemo(() => {
    const point = (m: DerivedModel, x: number, y: number, color: string): Point => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      x,
      y,
      z: m.context,
      color,
      license: m.license === "open" ? "Open weights" : "Proprietary",
    });

    const rows = pool
      .filter((m) => m.capability !== null)
      .map((m) => ({ m, x: monthIndex(m.released), y: m.capability as number }));

    return { plottable: rows, toPoint: point };
  }, [pool]);

  const xValues = plottable.map((r) => r.x);
  const minIdx = xValues.length ? Math.min(...xValues) : monthIndex("2024-01");
  const maxIdx = xValues.length ? Math.max(...xValues) : monthIndex("2024-01");
  const xTicks = monthTicks(minIdx, maxIdx);
  const pad = Math.max(1, Math.round((maxIdx - minIdx) * 0.04));

  const unselected = plottable.filter((r) => !shownIds.has(r.m.id));
  const openCloud = unselected
    .filter((r) => r.m.license === "open")
    .map((r) => toPoint(r.m, r.x, r.y, "var(--open)"));
  const closedCloud = unselected
    .filter((r) => r.m.license !== "open")
    .map((r) => toPoint(r.m, r.x, r.y, "var(--proprietary)"));

  const highlights = selected
    .map((m, i) => ({
      row: shownIds.has(m.id) ? plottable.find((r) => r.m.id === m.id) : undefined,
      index: i,
    }))
    .filter(
      (h): h is { row: { m: DerivedModel; x: number; y: number }; index: number } =>
        Boolean(h.row)
    )
    .map(({ row, index }) => ({
      point: toPoint(row.m, row.x, row.y, seriesColor(index)),
      index,
    }));

  const withNames = highlights.length > 0 && highlights.length <= NAMED_LABEL_LIMIT;
  const omitted = pool.length - plottable.length;

  return (
    <ChartCard
      title="Release date vs. capability"
      subtitle="Every model plotted by when it shipped and where it lands on the capability index — the shape of the frontier moving out over time."
      note={`Bubble size is the context window.${
        omitted > 0
          ? ` ${omitted} model${omitted === 1 ? "" : "s"} without a published capability score ${
              omitted === 1 ? "is" : "are"
            } omitted — see the feed or the table for the full list.`
          : ""
      }`}
    >
      <div className="h-[380px] w-full sm:h-[440px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 28, right: 24, bottom: 28, left: 4 }}>
            <CartesianGrid stroke="var(--gridline)" strokeDasharray="2 4" />
            <XAxis
              type="number"
              dataKey="x"
              domain={[minIdx - pad, maxIdx + pad]}
              ticks={xTicks}
              tickFormatter={(v: number) => formatMonth(indexToMonth(Math.round(v)))}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--baseline)" }}
              label={{
                value: "Released",
                position: "insideBottom",
                offset: -16,
                fill: "var(--text-muted)",
                fontSize: 12,
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
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
            <ZAxis type="number" dataKey="z" range={[36, 240]} />
            <Tooltip content={<TimelineTooltip />} cursor={{ strokeDasharray: "3 3" }} />
            <Scatter
              name="Open weights"
              data={openCloud}
              fill="var(--open)"
              fillOpacity={0.55}
              stroke="var(--surface-1)"
              strokeWidth={2}
              isAnimationActive={false}
            />
            <Scatter
              name="Proprietary"
              data={closedCloud}
              fill="var(--proprietary)"
              fillOpacity={0.55}
              stroke="var(--surface-1)"
              strokeWidth={2}
              isAnimationActive={false}
            />
            {highlights.map(({ point, index }) => (
              <Scatter
                key={point.id}
                name={point.name}
                data={[point]}
                fill={point.color}
                fillOpacity={0.85}
                stroke="var(--surface-1)"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {withNames && (
                  <LabelList
                    dataKey="name"
                    position="top"
                    offset={10}
                    fill="var(--ink)"
                    fontSize={11}
                  />
                )}
              </Scatter>
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 space-y-2 border-t border-hairline pt-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {openCloud.length > 0 && <CloudKey color="var(--open)" label="Open weights" />}
          {closedCloud.length > 0 && <CloudKey color="var(--proprietary)" label="Proprietary" />}
        </div>
        <SeriesLegend
          models={selected}
          hidden={hidden}
          onToggle={onToggle}
          onSolo={onSolo}
          onShowAll={onShowAll}
        />
      </div>
    </ChartCard>
  );
}

function CloudKey({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-ink-secondary">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: color, opacity: 0.45 }}
        aria-hidden
      />
      {label}
    </span>
  );
}

function TimelineTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Point }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="card p-3 shadow-lg">
      <p className="text-sm font-semibold text-ink">{p.name}</p>
      <p className="mb-2 text-xs text-ink-muted">
        {p.provider} · {p.license}
      </p>
      <dl className="space-y-0.5 text-xs">
        <Row label="Released" value={formatMonth(indexToMonth(p.x))} />
        <Row label="Capability" value={formatScore(p.y)} />
        <Row label="Context" value={`${formatTokens(p.z)} tokens`} />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <dt className="text-ink-secondary">{label}</dt>
      <dd className="num text-ink">{value}</dd>
    </div>
  );
}
