"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { ChartCard, LegendItem } from "@/components/ChartCard";
import { AXIS_HELP, AXIS_LABELS } from "@/lib/models";
import { seriesColor, seriesDash } from "@/lib/series";
import type { AxisKey, DerivedModel } from "@/lib/types";

const AXES: AxisKey[] = [
  "knowledge",
  "reasoning",
  "coding",
  "math",
  "speed",
  "value",
  "context",
];

export function RadarPanel({ models }: { models: DerivedModel[] }) {
  const data = AXES.map((axis) => {
    const row: Record<string, string | number | null> = {
      axis: AXIS_LABELS[axis],
      help: AXIS_HELP[axis],
    };
    for (const m of models) row[m.id] = m.axes[axis];
    return row;
  });

  // A single series needs no legend — the card title already names it.
  const legend =
    models.length > 1
      ? models.map((m, i) => (
          <LegendItem key={m.id} color={seriesColor(i)} dash={seriesDash(i)} label={m.name} />
        ))
      : undefined;

  return (
    <ChartCard
      title="Capability profile"
      subtitle="Every axis normalized 0-100 across the whole catalog. Bigger shape, broader model."
      note="Speed, value and context are log-scaled before normalizing, so a 10× lead reads as a step rather than swallowing the axis. A missing benchmark leaves a gap in the shape rather than plotting as zero."
      actions={legend}
    >
      <div className="h-[380px] w-full sm:h-[440px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="var(--gridline)" />
            <PolarAngleAxis dataKey="axis" tick={{ fill: "var(--text-secondary)", fontSize: 12 }} />
            {/* Rings carry the scale; numeric radius ticks would sit on top of
                the shapes for no gain — the tooltip reports exact values. */}
            <PolarRadiusAxis domain={[0, 100]} tickCount={5} tick={false} axisLine={false} />
            <Tooltip content={<RadarTooltip models={models} />} />
            {models.map((m, i) => (
              <Radar
                key={m.id}
                name={m.name}
                dataKey={m.id}
                stroke={seriesColor(i)}
                strokeWidth={2}
                strokeDasharray={seriesDash(i)}
                fill={seriesColor(i)}
                fillOpacity={models.length > 2 ? 0.08 : 0.14}
                isAnimationActive={false}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function RadarTooltip({
  active,
  payload,
  models,
}: {
  active?: boolean;
  payload?: Array<{ payload: Record<string, string | number | null> }>;
  models: DerivedModel[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;

  return (
    <div className="card p-3 shadow-lg">
      <p className="text-sm font-semibold text-ink">{String(row.axis)}</p>
      <p className="mb-2 text-xs text-ink-muted">{String(row.help)}</p>
      <ul className="space-y-1">
        {models.map((m, i) => (
          <li key={m.id} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-2 text-ink-secondary">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: seriesColor(i) }}
                aria-hidden
              />
              {m.name}
            </span>
            <span className="num text-ink">
              {typeof row[m.id] === "number" ? Math.round(row[m.id] as number) : "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
