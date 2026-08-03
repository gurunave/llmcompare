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
import { ChartCard } from "@/components/ChartCard";
import { AllHidden, SeriesBadge, SeriesLegend } from "@/components/SeriesLegend";
import { AXIS_HELP, AXIS_LABELS, DENSE_SERIES } from "@/lib/models";
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

interface Props {
  /** The whole selection — position in this list fixes each series' color and badge. */
  models: DerivedModel[];
  hidden?: Set<string>;
  onToggle?: (id: string) => void;
  onSolo?: (id: string) => void;
  onShowAll?: () => void;
}

export function RadarPanel({ models, hidden, onToggle, onSolo, onShowAll }: Props) {
  const series = models.map((m, i) => ({ model: m, index: i, off: Boolean(hidden?.has(m.id)) }));
  const shown = series.filter((s) => !s.off);

  const data = AXES.map((axis) => {
    const row: Record<string, string | number | null> = {
      axis: AXIS_LABELS[axis],
      help: AXIS_HELP[axis],
    };
    for (const { model } of shown) row[model.id] = model.axes[axis];
    return row;
  });

  // Past a few series the translucent fills stop being layers and start being
  // mud, so the shapes drop to outlines — everything selected still draws, it
  // just becomes traceable. Dash patterns keep them apart where hues repeat.
  const dense = shown.length > DENSE_SERIES;
  const fillOpacity = dense ? 0 : shown.length > 2 ? 0.08 : 0.14;

  return (
    <ChartCard
      title="Capability profile"
      subtitle="Every axis normalized 0-100 across the whole catalog. Bigger shape, broader model."
      note={`Speed, value and context are log-scaled before normalizing, so a 10× lead reads as a step rather than swallowing the axis. A missing benchmark leaves a gap in the shape rather than plotting as zero.${
        dense ? " Above four series the shapes are drawn as outlines so they stay separable." : ""
      }`}
    >
      {shown.length === 0 ? (
        <AllHidden onShowAll={onShowAll} />
      ) : (
        <div className="h-[380px] w-full sm:h-[440px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} outerRadius="72%">
              <PolarGrid stroke="var(--gridline)" />
              <PolarAngleAxis
                dataKey="axis"
                tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
              />
              {/* Rings carry the scale; numeric radius ticks would sit on top of
                  the shapes for no gain — the tooltip reports exact values. */}
              <PolarRadiusAxis domain={[0, 100]} tickCount={5} tick={false} axisLine={false} />
              <Tooltip content={<RadarTooltip series={shown} />} />
              {shown.map(({ model, index }) => (
                <Radar
                  key={model.id}
                  name={model.name}
                  dataKey={model.id}
                  stroke={seriesColor(index)}
                  strokeWidth={2}
                  strokeDasharray={seriesDash(index)}
                  fill={seriesColor(index)}
                  fillOpacity={fillOpacity}
                  isAnimationActive={false}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {models.length > 1 && (
        <div className="mt-3 border-t border-hairline pt-3">
          <SeriesLegend
            models={models}
            hidden={hidden}
            onToggle={onToggle}
            onSolo={onSolo}
            onShowAll={onShowAll}
            showDash
          />
        </div>
      )}
    </ChartCard>
  );
}

function RadarTooltip({
  active,
  payload,
  series,
}: {
  active?: boolean;
  payload?: Array<{ payload: Record<string, string | number | null> }>;
  series: Array<{ model: DerivedModel; index: number }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;

  return (
    <div className="card p-3 shadow-lg">
      <p className="text-sm font-semibold text-ink">{String(row.axis)}</p>
      <p className="mb-2 text-xs text-ink-muted">{String(row.help)}</p>
      <ul className="space-y-1">
        {series.map(({ model, index }) => (
          <li key={model.id} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-2 text-ink-secondary">
              <SeriesBadge index={index} />
              {model.name}
            </span>
            <span className="num text-ink">
              {typeof row[model.id] === "number" ? Math.round(row[model.id] as number) : "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
