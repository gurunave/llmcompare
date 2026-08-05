"use client";

import { useMemo, useState } from "react";
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
import { InfoHint } from "@/components/InfoHint";
import { ChartCard } from "@/components/ChartCard";
import { MultiSelect, type MultiOption } from "@/components/MultiSelect";
import { SeriesLegend } from "@/components/SeriesLegend";
import { providerColor } from "@/lib/accent";
import { formatTokens } from "@/lib/format";
import {
  axisScale,
  DEFAULT_X,
  DEFAULT_Y,
  METRICS,
  METRIC_BY_KEY,
  metricOf,
  type AxisScale,
  type Metric,
} from "@/lib/metrics";
import { seriesBadge, seriesColor } from "@/lib/series";
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

/** Past this many labeled points the names come off and the badges carry identity. */
const NAMED_LABEL_LIMIT = 5;

interface ScatterProps {
  all: DerivedModel[];
  /** The whole selection — position in this list fixes each series' color and badge. */
  selected: DerivedModel[];
  hidden?: Set<string>;
  onToggle?: (id: string) => void;
  onSolo?: (id: string) => void;
  onShowAll?: () => void;
}

export function ScatterPanel({
  all,
  selected,
  hidden,
  onToggle,
  onSolo,
  onShowAll,
}: ScatterProps) {
  const [xKey, setXKey] = useState(DEFAULT_X);
  const [yKey, setYKey] = useState(DEFAULT_Y);
  const [providers, setProviders] = useState<string[]>([]);
  const [modelIds, setModelIds] = useState<string[]>([]);
  const xMetric = metricOf(xKey, DEFAULT_X);
  const yMetric = metricOf(yKey, DEFAULT_Y);
  const filtering = providers.length > 0 || modelIds.length > 0;
  const isDefault = xMetric.key === DEFAULT_X && yMetric.key === DEFAULT_Y && !filtering;

  // A hidden model is still in the catalog, so it rejoins the anonymous cloud
  // rather than vanishing — toggling a series off stops it being called out, it
  // does not delete a data point.
  const shownIds = new Set(selected.filter((m) => !hidden?.has(m.id)).map((m) => m.id));

  const { providerOptions, modelOptions } = useMemo(() => buildOptions(all), [all]);

  // The two filters are additive rather than intersecting: picking Anthropic
  // and then naming GPT-5 asks for both, which is what "provider or model"
  // means to a reader. Intersecting them would empty the plot instead.
  // Whatever is selected for comparison always stays plotted — a filter is
  // there to thin the background, not to drop the models under discussion.
  const pool = useMemo(() => {
    if (!filtering) return all;
    const byProvider = new Set(providers);
    const byId = new Set(modelIds);
    const kept = new Set(selected.map((m) => m.id));
    return all.filter((m) => byProvider.has(m.provider) || byId.has(m.id) || kept.has(m.id));
  }, [all, filtering, providers, modelIds, selected]);

  // A model is plottable only when both chosen metrics are published for it —
  // parameter counts and some benchmarks are missing across much of the catalog.
  const { plottable, toPoint } = useMemo(() => {
    const readable = (metric: Metric, m: DerivedModel): number | null => {
      const v = metric.value(m);
      if (v === null || !Number.isFinite(v)) return null;
      // A log axis cannot show zero; free tiers land there, so floor them.
      if (metric.log) return Math.max(v, 0.01);
      return v;
    };

    const rows = pool
      .map((m) => ({ m, x: readable(xMetric, m), y: readable(yMetric, m) }))
      .filter((r): r is { m: DerivedModel; x: number; y: number } => r.x !== null && r.y !== null);

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

    return {
      plottable: rows,
      toPoint: point,
    };
  }, [pool, xMetric, yMetric]);

  const xScale = axisScale(
    xMetric,
    plottable.map((r) => r.x)
  );
  const yScale = axisScale(
    yMetric,
    plottable.map((r) => r.y)
  );

  // The unselected cloud is split by licence — two hues that clear the all-pairs
  // gates in both modes, named in the legend below the plot. Opacity is the
  // second channel: the cloud recedes, the labeled selection sits on top of it.
  const unselected = plottable.filter((r) => !shownIds.has(r.m.id));
  const openCloud = unselected
    .filter((r) => r.m.license === "open")
    .map((r) => toPoint(r.m, r.x, r.y, "var(--open)"));
  const closedCloud = unselected
    .filter((r) => r.m.license !== "open")
    .map((r) => toPoint(r.m, r.x, r.y, "var(--proprietary)"));

  // Every highlighted point carries its series number, so identity never rests
  // on hue alone — which matters most past eight series, where hues repeat.
  const highlights = selected
    .map((m, i) => ({
      row: shownIds.has(m.id) ? plottable.find((r) => r.m.id === m.id) : undefined,
      index: i,
    }))
    .filter((h): h is { row: { m: DerivedModel; x: number; y: number }; index: number } =>
      Boolean(h.row)
    )
    .map(({ row, index }) => ({
      point: toPoint(row.m, row.x, row.y, seriesColor(index)),
      index,
    }));

  // Labels are placed from the plotted positions rather than from a fixed lane
  // table, so a cluster of eight in one corner still resolves into eight lines.
  const placements = placeLabels(
    highlights.map((h) => h.point),
    xScale,
    yScale
  );
  const withNames = highlights.length <= NAMED_LABEL_LIMIT;

  const omitted = pool.length - plottable.length;

  return (
    <ChartCard
      title={`${xMetric.label} vs ${yMetric.label}`}
      subtitle={`${yMetric.axisLabel} against ${xMetric.axisLabel}. Pick either axis to reframe the comparison.`}
      note={`Bubble size is the context window.${
        xMetric.key === "price" || yMetric.key === "price"
          ? " Price is blended at a 3:1 input:output mix."
          : ""
      }${
        xScale.log || yScale.log
          ? ` The ${logAxisNote(xScale.log, yScale.log)} logarithmic because the values span orders of magnitude.`
          : ""
      }${omitted > 0 ? ` ${omitted} model${omitted === 1 ? "" : "s"} without both values ${omitted === 1 ? "is" : "are"} omitted.` : ""}${
        filtering
          ? ` Filtered to ${plottable.length} of ${all.length} models; anything you have selected stays plotted.`
          : ""
      }`}
      actions={
        <div className="flex flex-wrap items-center gap-1.5">
          <AxisPicker label="X" value={xMetric.key} onChange={setXKey} />
          <AxisPicker label="Y" value={yMetric.key} onChange={setYKey} />
          <button
            type="button"
            onClick={() => {
              setXKey(DEFAULT_X);
              setYKey(DEFAULT_Y);
              setProviders([]);
              setModelIds([]);
            }}
            disabled={isDefault}
            className="chip disabled:opacity-40 disabled:hover:border-hairline"
            title="Back to blended price vs capability index, unfiltered"
          >
            Reset
          </button>
        </div>
      }
    >
      {/* Filters sit above the plot rather than in the header: the header row
          already carries both axis pickers, and these are wider controls. */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-ink-muted">Filter</span>
        <MultiSelect
          label="Providers"
          emptyLabel="All"
          placeholder="Search providers…"
          options={providerOptions}
          value={providers}
          onChange={setProviders}
        />
        <MultiSelect
          label="Models"
          emptyLabel="All"
          placeholder="Search models…"
          options={modelOptions}
          value={modelIds}
          onChange={setModelIds}
        />
        {filtering && (
          <button
            type="button"
            onClick={() => {
              setProviders([]);
              setModelIds([]);
            }}
            className="chip hover:border-[var(--border-strong)]"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="h-[380px] w-full sm:h-[440px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 28, right: 40, bottom: 28, left: 4 }}>
            <CartesianGrid stroke="var(--gridline)" strokeDasharray="2 4" />
            <XAxis
              type="number"
              dataKey="x"
              scale={xScale.log ? "log" : "linear"}
              domain={xScale.domain}
              ticks={xScale.ticks}
              tickFormatter={(v: number) => xMetric.format(v)}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--baseline)" }}
              label={{
                value: xScale.log ? `${xMetric.axisLabel} (log)` : xMetric.axisLabel,
                position: "insideBottom",
                offset: -16,
                fill: "var(--text-muted)",
                fontSize: 12,
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              scale={yScale.log ? "log" : "linear"}
              domain={yScale.domain}
              ticks={yScale.ticks}
              tickFormatter={(v: number) => yMetric.format(v)}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--baseline)" }}
              width={64}
              label={{
                value: yScale.log ? `${yMetric.axisLabel} (log)` : yMetric.axisLabel,
                angle: -90,
                position: "insideLeft",
                fill: "var(--text-muted)",
                fontSize: 12,
                style: { textAnchor: "middle" },
              }}
            />
            <ZAxis type="number" dataKey="z" range={[36, 240]} />
            <Tooltip
              content={<ScatterTooltip xMetric={xMetric} yMetric={yMetric} />}
              cursor={{ strokeDasharray: "3 3" }}
            />
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
                {/* Selected points often cluster in one corner, so labels are
                    single-line, flipped to the inside of the plot, and pushed
                    into free lanes rather than stacked on each other. */}
                <LabelList
                  dataKey="name"
                  content={(props) => (
                    <PointLabel
                      {...props}
                      index={index}
                      anchor={placements.get(point.id)?.anchor ?? "end"}
                      stagger={placements.get(point.id)?.stagger ?? 0}
                      withName={withNames}
                    />
                  )}
                />
              </Scatter>
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 space-y-2 border-t border-hairline pt-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* Keys only for marks the current axes actually put on the plot — a
              parameter axis, say, drops every proprietary model. */}
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

/**
 * Filter options, built from whatever catalog this panel was handed rather
 * than from the module-level list, so the two stay in step. Providers carry
 * their model count; models carry the provider, which is what tells two
 * similarly-named entries apart in a search.
 */
function buildOptions(all: DerivedModel[]): {
  providerOptions: MultiOption[];
  modelOptions: MultiOption[];
} {
  const counts = new Map<string, number>();
  for (const m of all) counts.set(m.provider, (counts.get(m.provider) ?? 0) + 1);

  const providerOptions = Array.from(counts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([provider, count]) => ({
      id: provider,
      label: provider,
      hint: `${count} model${count === 1 ? "" : "s"}`,
      tint: providerColor(provider),
    }));

  const modelOptions = [...all]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((m) => ({
      id: m.id,
      label: m.name,
      hint: m.provider,
      tint: providerColor(m.provider),
      search: m.tags.join(" "),
    }));

  return { providerOptions, modelOptions };
}

/** Axis metric picker — a plain select, so it works on touch and by keyboard. */
function AxisPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (key: string) => void;
}) {
  // A native select cannot carry an icon per option, so the hint describes
  // whatever is currently chosen and updates as the reader changes it.
  const current = METRIC_BY_KEY.get(value);

  return (
    <span className="inline-flex items-center gap-1.5">
      <label className="inline-flex items-center gap-1.5 text-xs text-ink-secondary">
        <span className="font-medium">{label}</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} axis metric`}
          className="field w-auto py-1.5 text-xs"
        >
          {METRICS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      {current?.hint && (
        <InfoHint
          label={current.label}
          title={current.label}
          body={current.hint}
          source={current.source}
        />
      )}
    </span>
  );
}

function logAxisNote(x: boolean, y: boolean): string {
  if (x && y) return "axes are";
  return x ? "x-axis is" : "y-axis is";
}

/** Legend key. The mark carries color; the label stays in ink tokens. */
function CloudKey({ color, label, solid }: { color: string; label: string; solid?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-ink-secondary">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{
          background: color,
          opacity: solid ? 1 : 0.45,
          boxShadow: solid ? "0 0 0 2px var(--surface-1)" : undefined,
        }}
        aria-hidden
      />
      {label}
    </span>
  );
}

/** A text line's height — the vertical step between two stacked labels. */
const LANE = 15;

interface Placement {
  anchor: "start" | "end";
  stagger: number;
}

/** Where a value sits in its axis domain, 0 at the low end and 1 at the high. */
function fraction(v: number, scale: AxisScale): number {
  const [lo, hi] = scale.domain;
  return scale.log
    ? (Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo) || 1)
    : (v - lo) / (hi - lo || 1);
}

/**
 * Labels are placed in domain space, before the chart has pixels to measure.
 * Points that land within a few percent of the plot of each other form a
 * cluster, and a cluster's labels are dealt into separate vertical lanes and
 * alternating sides — which is what makes eight models in one corner readable.
 * Points near an edge always label toward the middle of the plot.
 */
function placeLabels(
  points: Point[],
  xScale: AxisScale,
  yScale: AxisScale
): Map<string, Placement> {
  const NEAR = 0.07;
  const spots = points.map((p) => ({
    id: p.id,
    fx: fraction(p.x, xScale),
    fy: fraction(p.y, yScale),
  }));

  // Group by proximity, tallest point first so lanes read top to bottom.
  const order = [...spots].sort((a, b) => b.fy - a.fy);
  const clusters: (typeof order)[] = [];
  for (const spot of order) {
    const near = clusters.find((c) =>
      c.some((o) => Math.abs(o.fx - spot.fx) < NEAR && Math.abs(o.fy - spot.fy) < NEAR)
    );
    if (near) near.push(spot);
    else clusters.push([spot]);
  }

  const out = new Map<string, Placement>();
  for (const cluster of clusters) {
    cluster.forEach((spot, j) => {
      const anchor: "start" | "end" =
        spot.fx >= 0.78 ? "end" : spot.fx <= 0.22 ? "start" : j % 2 === 0 ? "end" : "start";
      out.set(spot.id, {
        anchor,
        stagger: cluster.length === 1 ? 0 : (j - (cluster.length - 1) / 2) * LANE,
      });
    });
  }
  return out;
}

interface PointLabelProps {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  value?: string | number;
  index: number;
  anchor: "start" | "end";
  stagger: number;
  withName: boolean;
}

/**
 * The mark's label: a numbered badge, plus the model name while few enough
 * points are labeled for names to fit. The badge is drawn on the card surface
 * in the series color, which reads in both themes and needs no light/dark swap.
 */
function PointLabel({
  x,
  y,
  width,
  height,
  value,
  index,
  anchor,
  stagger,
  withName,
}: PointLabelProps) {
  const px = Number(x ?? 0);
  const py = Number(y ?? 0);
  const w = Number(width ?? 0);
  const h = Number(height ?? 0);
  const cx = px + w / 2;
  const cy = py + h / 2 + stagger;
  const gap = w / 2 + 12;
  const badgeX = anchor === "end" ? cx - gap : cx + gap;
  const color = seriesColor(index);

  return (
    <g>
      <circle cx={badgeX} cy={cy} r={8} fill="var(--surface-1)" stroke={color} strokeWidth={2} />
      <text
        x={badgeX}
        y={cy}
        dy={3.5}
        textAnchor="middle"
        fill={color}
        fontSize={10}
        fontWeight={600}
      >
        {seriesBadge(index)}
      </text>
      {withName && (
        <text
          x={anchor === "end" ? badgeX - 12 : badgeX + 12}
          y={cy}
          dy={4}
          textAnchor={anchor}
          fill="var(--text-primary)"
          fontSize={12}
        >
          {value}
        </text>
      )}
    </g>
  );
}

function ScatterTooltip({
  active,
  payload,
  xMetric,
  yMetric,
}: {
  active?: boolean;
  payload?: Array<{ payload: Point }>;
  xMetric: Metric;
  yMetric: Metric;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="card p-3 shadow-lg">
      <p className="text-sm font-semibold text-ink">{p.name}</p>
      <p className="mb-2 text-xs text-ink-muted">
        {p.provider} · {p.license}
      </p>
      <dl className="space-y-0.5 text-xs">
        <Row label={yMetric.label} value={yMetric.format(p.y)} />
        <Row label={xMetric.label} value={xMetric.format(p.x)} />
        {xMetric.key !== "context" && yMetric.key !== "context" && (
          <Row label="Context" value={`${formatTokens(p.z)} tokens`} />
        )}
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
