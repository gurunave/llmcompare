"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/ChartCard";
import { AllHidden, SeriesBadge, SeriesLegend } from "@/components/SeriesLegend";
import { MODELS } from "@/lib/models";
import { seriesBadge, seriesColor } from "@/lib/series";
import type { DerivedModel, ScoreKey } from "@/lib/types";

const BENCHMARKS: { key: ScoreKey; label: string; blurb: string }[] = [
  { key: "mmluPro", label: "MMLU-Pro", blurb: "broad knowledge" },
  { key: "gpqa", label: "GPQA", blurb: "science reasoning" },
  { key: "swebench", label: "SWE-bench", blurb: "real code fixes" },
  { key: "aime", label: "AIME", blurb: "competition math" },
  { key: "mmmu", label: "MMMU", blurb: "multimodal" },
];

type Mode = "selected" | "leaderboard";
/** Which way the bars run: columns off a bottom axis, or rows off a left axis. */
type Orientation = "columns" | "rows";
type Density = "compact" | "comfortable" | "large";

/** Bar thickness in px — the zoom control for a categorical chart. */
const BAR_SIZE: Record<Density, { columns: number; rows: number }> = {
  compact: { columns: 8, rows: 10 },
  comfortable: { columns: 14, rows: 14 },
  large: { columns: 22, rows: 20 },
};

const BAR_GAP = 2;
/** Breathing room between one benchmark group and the next. */
const GROUP_PAD = { columns: 28, rows: 30 };
/** Space reserved for the category labels, kept identical in the pinned axis. */
const ROW_AXIS_WIDTH = 96;
const COLUMN_AXIS_WIDTH = 38;
const PLOT_HEIGHT = 320;

interface Props {
  /** The whole selection — position in this list fixes each series' color and badge. */
  selected: DerivedModel[];
  hidden?: Set<string>;
  onToggle?: (id: string) => void;
  onSolo?: (id: string) => void;
  onShowAll?: () => void;
}

export function BenchmarkPanel({ selected, hidden, onToggle, onSolo, onShowAll }: Props) {
  const [mode, setMode] = useState<Mode>("selected");
  const [board, setBoard] = useState<ScoreKey>("swebench");
  const [orientation, setOrientation] = useState<Orientation | null>(null);
  const [density, setDensity] = useState<Density>("comfortable");

  const series = selected.map((m, i) => ({ model: m, index: i, off: Boolean(hidden?.has(m.id)) }));
  const shown = series.filter((s) => !s.off);

  // Columns read best for a handful of series; past that the bars get thinner
  // than their own outline, so rows become the default. An explicit choice wins.
  const layout: Orientation = orientation ?? (shown.length > 6 ? "rows" : "columns");

  return (
    <ChartCard
      title={mode === "selected" ? "Benchmark scores" : "Leaderboard"}
      subtitle={
        mode === "selected"
          ? "Head-to-head on each published benchmark. Higher is better."
          : `Top 12 of ${MODELS.length} models on ${BENCHMARKS.find((b) => b.key === board)!.label}. Your selection stays colored.`
      }
      note="A missing bar means the score is not published or not comparably measured — it is not a zero."
      actions={
        <div className="flex flex-wrap items-center gap-1.5">
          <ModeChip active={mode === "selected"} onClick={() => setMode("selected")}>
            Selected
          </ModeChip>
          <ModeChip active={mode === "leaderboard"} onClick={() => setMode("leaderboard")}>
            Leaderboard
          </ModeChip>
        </div>
      }
    >
      {mode === "leaderboard" && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {BENCHMARKS.map((b) => (
            <ModeChip key={b.key} active={board === b.key} onClick={() => setBoard(b.key)}>
              {b.label}
            </ModeChip>
          ))}
        </div>
      )}

      {mode === "selected" && selected.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <ControlGroup label="Bars">
            <ModeChip active={layout === "columns"} onClick={() => setOrientation("columns")}>
              Columns
            </ModeChip>
            <ModeChip active={layout === "rows"} onClick={() => setOrientation("rows")}>
              Rows
            </ModeChip>
          </ControlGroup>
          <ControlGroup label="Size">
            {(["compact", "comfortable", "large"] as Density[]).map((d) => (
              <ModeChip key={d} active={density === d} onClick={() => setDensity(d)}>
                {d === "compact" ? "S" : d === "comfortable" ? "M" : "L"}
              </ModeChip>
            ))}
          </ControlGroup>
        </div>
      )}

      {mode === "selected" ? (
        shown.length === 0 ? (
          <AllHidden onShowAll={onShowAll} />
        ) : (
          <GroupedBars shown={shown} layout={layout} density={density} />
        )
      ) : (
        <Leaderboard metric={board} series={series} />
      )}

      {mode === "selected" && selected.length > 1 && (
        <div className="mt-3 border-t border-hairline pt-3">
          <SeriesLegend
            models={selected}
            hidden={hidden}
            onToggle={onToggle}
            onSolo={onSolo}
            onShowAll={onShowAll}
          />
        </div>
      )}
    </ChartCard>
  );
}

interface Shown {
  model: DerivedModel;
  index: number;
}

/**
 * Grouped bars that grow rather than shrink. Adding models lengthens the chart
 * and the container scrolls; bar thickness stays where the reader put it. The
 * value axis is drawn a second time in a pinned strip outside the scroller, so
 * it is still there once the plot has been scrolled away from it.
 */
function GroupedBars({
  shown,
  layout,
  density,
}: {
  shown: Shown[];
  layout: Orientation;
  density: Density;
}) {
  const data = BENCHMARKS.map((b) => {
    const row: Record<string, string | number | null> = { name: b.label, blurb: b.blurb };
    for (const { model } of shown) row[model.id] = model.scores[b.key];
    return row;
  });

  const size = BAR_SIZE[density][layout];
  const group = shown.length * (size + BAR_GAP) + GROUP_PAD[layout];
  const extent = BENCHMARKS.length * group;
  const labelBadges = size >= 14;

  const bars = shown.map(({ model, index }) => (
    <Bar
      key={model.id}
      dataKey={model.id}
      name={model.name}
      fill={seriesColor(index)}
      radius={layout === "columns" ? [4, 4, 0, 0] : [0, 4, 4, 0]}
      stroke="var(--surface-1)"
      strokeWidth={size >= 12 ? 2 : 1}
      barSize={size}
      isAnimationActive={false}
    >
      {labelBadges && (
        <LabelList
          dataKey={model.id}
          position={layout === "columns" ? "top" : "right"}
          content={(props) => <BadgeLabel {...props} index={index} />}
        />
      )}
    </Bar>
  ));

  const tooltip = (
    <Tooltip
      cursor={{ fill: "var(--text-muted)", fillOpacity: 0.08 }}
      content={<BarTooltip shown={shown} />}
    />
  );

  if (layout === "rows") {
    const height = Math.max(extent + 8, 200);
    return (
      <>
        <div className="max-h-[460px] overflow-y-auto pr-1">
          <ResponsiveContainer width="100%" height={height}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 40, bottom: 4, left: 0 }}
              barGap={BAR_GAP}
            >
              <CartesianGrid stroke="var(--gridline)" strokeDasharray="2 4" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis
                type="category"
                dataKey="name"
                width={ROW_AXIS_WIDTH}
                tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "var(--baseline)" }}
              />
              {tooltip}
              {bars}
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* The pinned value axis: same margins and axis width, so its ticks sit
            exactly under the scrolling plot's gridlines. */}
        <PinnedAxis layout="rows" />
      </>
    );
  }

  return (
    <div className="flex items-stretch">
      <PinnedAxis layout="columns" />
      <div className="min-w-0 flex-1 overflow-x-auto">
        <div style={{ minWidth: extent }}>
          <ResponsiveContainer width="100%" height={PLOT_HEIGHT + 44}>
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
              barGap={BAR_GAP}
            >
              <CartesianGrid stroke="var(--gridline)" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "var(--baseline)" }}
              />
              <YAxis domain={[0, 100]} width={0} tick={false} axisLine={false} />
              {tooltip}
              {bars}
              {/* Windowing the benchmark axis is the other half of zoom: fewer
                  groups on screen means each group gets more room. */}
              <Brush
                dataKey="name"
                height={22}
                travellerWidth={8}
                stroke="var(--border-strong)"
                fill="var(--wash)"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/** A chart with nothing in it but the 0-100 axis, kept outside the scroller. */
function PinnedAxis({ layout }: { layout: Orientation }) {
  if (layout === "rows") {
    return (
      <div className="h-[30px] w-full pr-1">
        <ResponsiveContainer width="100%" height={30}>
          <BarChart data={[{ name: "" }]} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--baseline)" }}
            />
            <YAxis type="category" dataKey="name" width={ROW_AXIS_WIDTH} tick={false} axisLine={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div style={{ width: COLUMN_AXIS_WIDTH }} className="shrink-0">
      <ResponsiveContainer width="100%" height={PLOT_HEIGHT + 44}>
        <BarChart data={[{ name: "" }]} margin={{ top: 8, right: 0, bottom: 4, left: 0 }}>
          {/* 30px for the category labels plus 22 for the brush strip, so this
              axis ends level with the scrolling plot rather than below it. */}
          <XAxis dataKey="name" tick={false} axisLine={false} height={52} />
          <YAxis
            domain={[0, 100]}
            width={COLUMN_AXIS_WIDTH}
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface BadgeLabelProps {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  value?: number | string | null;
  index: number;
}

/** The series number at the end of a bar, so a bar names itself without the legend. */
function BadgeLabel({ x, y, width, height, value, index }: BadgeLabelProps) {
  if (value === null || value === undefined || value === "") return null;
  const px = Number(x ?? 0);
  const py = Number(y ?? 0);
  const w = Number(width ?? 0);
  const h = Number(height ?? 0);
  const isRow = w > h;

  return (
    <text
      x={isRow ? px + w + 6 : px + w / 2}
      y={isRow ? py + h / 2 + 4 : py - 4}
      textAnchor={isRow ? "start" : "middle"}
      fill={seriesColor(index)}
      fontSize={10}
      fontWeight={600}
      className="num"
    >
      {seriesBadge(index)}
    </text>
  );
}

function Leaderboard({ metric, series }: { metric: ScoreKey; series: Array<Shown & { off: boolean }> }) {
  const rank = new Map(series.filter((s) => !s.off).map((s) => [s.model.id, s.index]));
  const data = MODELS.filter((m) => typeof m.scores[metric] === "number")
    .sort((a, b) => (b.scores[metric] as number) - (a.scores[metric] as number))
    .slice(0, 12)
    .map((m) => ({ id: m.id, name: m.name, value: m.scores[metric] as number }));

  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, bottom: 4, left: 8 }}>
          <CartesianGrid stroke="var(--gridline)" strokeDasharray="2 4" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--baseline)" }}
          />
          <Tooltip cursor={{ fill: "var(--text-muted)", fillOpacity: 0.08 }} content={<RankTooltip />} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false} barSize={18}>
            {data.map((d) => {
              const i = rank.get(d.id);
              return (
                <Cell
                  key={d.id}
                  fill={i === undefined ? "var(--text-muted)" : seriesColor(i)}
                  fillOpacity={i === undefined ? 0.32 : 0.9}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function BarTooltip({
  active,
  payload,
  label,
  shown,
}: {
  active?: boolean;
  payload?: Array<{ payload: Record<string, string | number | null> }>;
  label?: string;
  shown: Shown[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="card p-3 shadow-lg">
      <p className="text-sm font-semibold text-ink">{label}</p>
      <p className="mb-2 text-xs text-ink-muted">{String(row.blurb)}</p>
      <ul className="space-y-1">
        {shown.map(({ model, index }) => (
          <li key={model.id} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-2 text-ink-secondary">
              <SeriesBadge index={index} />
              {model.name}
            </span>
            <span className="num text-ink">
              {typeof row[model.id] === "number" ? row[model.id] : "not published"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RankTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { name: string; value: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="card p-3 shadow-lg">
      <p className="text-sm font-semibold text-ink">{p.name}</p>
      <p className="num text-xs text-ink-secondary">Score {p.value}</p>
    </div>
  );
}

function ControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-xs text-ink-muted">{label}</span>
      {children}
    </span>
  );
}

function ModeChip({
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
