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
import { ChartCard } from "@/components/ChartCard";
import { formatTokens } from "@/lib/format";
import {
  axisScale,
  DEFAULT_X,
  DEFAULT_Y,
  METRICS,
  metricOf,
  type Metric,
} from "@/lib/metrics";
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

export function ScatterPanel({
  all,
  selected,
}: {
  all: DerivedModel[];
  selected: DerivedModel[];
}) {
  const [xKey, setXKey] = useState(DEFAULT_X);
  const [yKey, setYKey] = useState(DEFAULT_Y);
  const xMetric = metricOf(xKey, DEFAULT_X);
  const yMetric = metricOf(yKey, DEFAULT_Y);
  const isDefault = xMetric.key === DEFAULT_X && yMetric.key === DEFAULT_Y;

  const selectedIds = new Set(selected.map((m) => m.id));

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

    const rows = all
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
  }, [all, xMetric, yMetric]);

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
  const unselected = plottable.filter((r) => !selectedIds.has(r.m.id));
  const openCloud = unselected
    .filter((r) => r.m.license === "open")
    .map((r) => toPoint(r.m, r.x, r.y, "var(--open)"));
  const closedCloud = unselected
    .filter((r) => r.m.license !== "open")
    .map((r) => toPoint(r.m, r.x, r.y, "var(--proprietary)"));

  // Color caps at 3 slots for an all-pairs form; every highlighted point is also
  // directly labeled, so identity never rests on hue alone.
  const highlights = selected
    .map((m, i) => ({ row: plottable.find((r) => r.m.id === m.id), index: i }))
    .filter((h): h is { row: { m: DerivedModel; x: number; y: number }; index: number } =>
      Boolean(h.row)
    )
    .map(({ row, index }) => ({
      point: toPoint(row.m, row.x, row.y, seriesColor(index)),
      index,
    }));

  const omitted = all.length - plottable.length;

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
      }${omitted > 0 ? ` ${omitted} model${omitted === 1 ? "" : "s"} without both values ${omitted === 1 ? "is" : "are"} omitted.` : ""}`}
      actions={
        <div className="flex flex-wrap items-center gap-1.5">
          <AxisPicker label="X" value={xMetric.key} onChange={setXKey} />
          <AxisPicker label="Y" value={yMetric.key} onChange={setYKey} />
          <button
            type="button"
            onClick={() => {
              setXKey(DEFAULT_X);
              setYKey(DEFAULT_Y);
            }}
            disabled={isDefault}
            className="chip disabled:opacity-40 disabled:hover:border-hairline"
            title="Back to blended price vs mean benchmark score"
          >
            Reset
          </button>
        </div>
      }
    >
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
                    single-line, flipped to the inside of the plot, and
                    vertically staggered rather than stacked on each other. */}
                <LabelList
                  dataKey="name"
                  content={(props) => (
                    <PointLabel
                      {...props}
                      anchor={labelAnchor(point.x, index, xScale)}
                      stagger={LABEL_LANES[index] ?? 0}
                    />
                  )}
                />
              </Scatter>
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hairline pt-3">
        {/* Keys only for marks the current axes actually put on the plot — a
            parameter axis, say, drops every proprietary model. */}
        {openCloud.length > 0 && <CloudKey color="var(--open)" label="Open weights" />}
        {closedCloud.length > 0 && <CloudKey color="var(--proprietary)" label="Proprietary" />}
        {highlights.map(({ point, index }) => (
          <CloudKey key={point.id} color={seriesColor(index)} label={point.name} solid />
        ))}
      </div>
    </ChartCard>
  );
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
  return (
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

/** One vertical lane per selected model, 14px apart — a text line's height. */
const LABEL_LANES = [-16, -2, 16, 30];

/**
 * Labels alternate sides and sit in separate vertical lanes, so four points in the
 * same corner still get four readable names. Points near an edge of the plot
 * always label toward the middle.
 */
function labelAnchor(
  x: number,
  index: number,
  scale: { domain: [number, number]; log: boolean }
): "start" | "end" {
  const [lo, hi] = scale.domain;
  const pos = scale.log
    ? (Math.log10(x) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo) || 1)
    : (x - lo) / (hi - lo || 1);
  if (pos >= 0.8) return "end";
  if (pos <= 0.2) return "start";
  return index % 2 === 0 ? "end" : "start";
}

interface PointLabelProps {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  value?: string | number;
  anchor: "start" | "end";
  stagger: number;
}

function PointLabel({ x, y, width, height, value, anchor, stagger }: PointLabelProps) {
  const px = Number(x ?? 0);
  const py = Number(y ?? 0);
  const w = Number(width ?? 0);
  const h = Number(height ?? 0);
  const cx = px + w / 2;
  const cy = py + h / 2;
  const gap = w / 2 + 8;

  return (
    <text
      x={anchor === "end" ? cx - gap : cx + gap}
      y={cy + stagger}
      dy={4}
      textAnchor={anchor}
      fill="var(--text-primary)"
      fontSize={12}
    >
      {value}
    </text>
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
