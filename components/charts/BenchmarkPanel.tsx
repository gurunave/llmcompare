"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard, LegendItem } from "@/components/ChartCard";
import { MODELS } from "@/lib/models";
import { seriesColor } from "@/lib/series";
import type { DerivedModel, ScoreKey } from "@/lib/types";

const BENCHMARKS: { key: ScoreKey; label: string; blurb: string }[] = [
  { key: "mmluPro", label: "MMLU-Pro", blurb: "broad knowledge" },
  { key: "gpqa", label: "GPQA", blurb: "science reasoning" },
  { key: "swebench", label: "SWE-bench", blurb: "real code fixes" },
  { key: "aime", label: "AIME", blurb: "competition math" },
  { key: "mmmu", label: "MMMU", blurb: "multimodal" },
];

type Mode = "selected" | "leaderboard";

export function BenchmarkPanel({ selected }: { selected: DerivedModel[] }) {
  const [mode, setMode] = useState<Mode>("selected");
  const [board, setBoard] = useState<ScoreKey>("swebench");

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

      {mode === "selected" ? (
        <GroupedBars selected={selected} />
      ) : (
        <Leaderboard metric={board} selected={selected} />
      )}
    </ChartCard>
  );
}

function GroupedBars({ selected }: { selected: DerivedModel[] }) {
  const data = BENCHMARKS.map((b) => {
    const row: Record<string, string | number | null> = { name: b.label, blurb: b.blurb };
    for (const m of selected) row[m.id] = m.scores[b.key];
    return row;
  });

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {selected.map((m, i) => (
          <LegendItem key={m.id} color={seriesColor(i)} label={m.name} />
        ))}
      </div>
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -16 }} barGap={2}>
            <CartesianGrid stroke="var(--gridline)" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--baseline)" }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--text-muted)", fillOpacity: 0.08 }}
              content={<BarTooltip selected={selected} />}
            />
            {selected.map((m, i) => (
              <Bar
                key={m.id}
                dataKey={m.id}
                name={m.name}
                fill={seriesColor(i)}
                radius={[4, 4, 0, 0]}
                stroke="var(--surface-1)"
                strokeWidth={2}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

function Leaderboard({ metric, selected }: { metric: ScoreKey; selected: DerivedModel[] }) {
  const rank = new Map(selected.map((m, i) => [m.id, i]));
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
  selected,
}: {
  active?: boolean;
  payload?: Array<{ payload: Record<string, string | number | null> }>;
  label?: string;
  selected: DerivedModel[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="card p-3 shadow-lg">
      <p className="text-sm font-semibold text-ink">{label}</p>
      <p className="mb-2 text-xs text-ink-muted">{String(row.blurb)}</p>
      <ul className="space-y-1">
        {selected.map((m, i) => (
          <li key={m.id} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-2 text-ink-secondary">
              <span className="h-2 w-2 rounded-full" style={{ background: seriesColor(i) }} aria-hidden />
              {m.name}
            </span>
            <span className="num text-ink">
              {typeof row[m.id] === "number" ? row[m.id] : "not published"}
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
