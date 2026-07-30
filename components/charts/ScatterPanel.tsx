"use client";

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
import { formatPrice, formatTokens } from "@/lib/format";
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
}

export function ScatterPanel({
  all,
  selected,
}: {
  all: DerivedModel[];
  selected: DerivedModel[];
}) {
  const selectedIds = new Set(selected.map((m) => m.id));
  const scored = all.filter((m) => m.capability !== null);

  const toPoint = (m: DerivedModel, color: string): Point => ({
    id: m.id,
    name: m.name,
    provider: m.provider,
    x: Math.max(m.blendedPrice, 0.01),
    y: m.capability as number,
    z: m.context,
    color,
  });

  const context = scored
    .filter((m) => !selectedIds.has(m.id))
    .map((m) => toPoint(m, "var(--text-muted)"));

  // Color caps at 3 slots for an all-pairs form; every highlighted point is also
  // directly labeled, so identity never rests on hue alone.
  const highlights = selected
    .filter((m) => m.capability !== null)
    .map((m, i) => ({ point: toPoint(m, seriesColor(i)), index: i }));

  return (
    <ChartCard
      title="Cost vs capability"
      subtitle="Blended price per 1M tokens against mean benchmark score. Up and to the left is the value frontier."
      note="Bubble size is the context window. Price is blended at a 3:1 input:output mix; the x-axis is logarithmic because prices span three orders of magnitude. Models that publish no benchmarks are omitted."
    >
      <div className="h-[380px] w-full sm:h-[440px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 28, right: 40, bottom: 28, left: 4 }}>
            <CartesianGrid stroke="var(--gridline)" strokeDasharray="2 4" />
            <XAxis
              type="number"
              dataKey="x"
              scale="log"
              domain={[0.015, 30]}
              ticks={[0.03, 0.1, 0.3, 1, 3, 10, 30]}
              tickFormatter={(v: number) => formatPrice(v)}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--baseline)" }}
              label={{
                value: "Blended $ / 1M tokens (log)",
                position: "insideBottom",
                offset: -16,
                fill: "var(--text-muted)",
                fontSize: 12,
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[20, 100]}
              ticks={[20, 40, 60, 80, 100]}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--baseline)" }}
              label={{
                value: "Mean benchmark score",
                angle: -90,
                position: "insideLeft",
                fill: "var(--text-muted)",
                fontSize: 12,
                style: { textAnchor: "middle" },
              }}
            />
            <ZAxis type="number" dataKey="z" range={[36, 240]} />
            <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: "3 3" }} />
            <Scatter
              name="All models"
              data={context}
              fill="var(--text-muted)"
              fillOpacity={0.28}
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
                {/* Selected points cluster in the top-right, so labels are
                    single-line, flipped to the inside of the plot, and
                    vertically staggered rather than stacked on each other. */}
                <LabelList
                  dataKey="name"
                  content={(props) => (
                    <PointLabel
                      {...props}
                      anchor={labelAnchor(point.x, index)}
                      stagger={LABEL_LANES[index] ?? 0}
                    />
                  )}
                />
              </Scatter>
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/** One vertical lane per selected model, 14px apart — a text line's height. */
const LABEL_LANES = [-16, -2, 16, 30];

/**
 * Labels alternate sides and sit in separate vertical lanes, so four points in the
 * same corner still get four readable names. Points near an edge of the plot
 * always label toward the middle.
 */
function labelAnchor(price: number, index: number): "start" | "end" {
  if (price >= 8) return "end";
  if (price <= 0.06) return "start";
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
}: {
  active?: boolean;
  payload?: Array<{ payload: Point }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="card p-3 shadow-lg">
      <p className="text-sm font-semibold text-ink">{p.name}</p>
      <p className="mb-2 text-xs text-ink-muted">{p.provider}</p>
      <dl className="space-y-0.5 text-xs">
        <Row label="Mean score" value={p.y.toFixed(0)} />
        <Row label="Blended price" value={`${formatPrice(p.x)} / 1M`} />
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
