"use client";

import { useState } from "react";
import {
  CartesianGrid,
  LabelList,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { InfoHint } from "@/components/InfoHint";
import { ChartCard } from "@/components/ChartCard";
import { SeriesLegend } from "@/components/SeriesLegend";
import {
  QUANTS,
  formatGiB,
  formatTokPerSec,
  logTicks,
  usableBytes,
  type Fit,
  type QuantKey,
  type Rig,
} from "@/lib/hardware";
import {
  DEFAULT_SCORE,
  METRIC_BY_KEY,
  SCORE_METRICS,
  metricOf,
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
  quant: string;
  fits: boolean;
  detail: string;
  speed: string | null;
}

/** Past this many labeled points the names come off and the badges carry identity. */
const NAMED_LABEL_LIMIT = 5;

/**
 * How to name the y-axis metric mid-sentence, with the verb that goes with it.
 *
 * The verb is not decoration: a model *publishes* a benchmark result, but the
 * capability index and the category scores are derived here from whatever it
 * published, so saying a model "does not publish a coding score" would describe
 * the wrong thing. Benchmark labels are proper nouns and keep their capitals;
 * the derived quantities are common nouns and take an article.
 */
function scoreWording(metric: Metric): { singular: string; plural: string } {
  if (metric.key === "capability") {
    return { singular: "has a capability index", plural: "have a capability index" };
  }
  if (metric.key.startsWith("cat:")) {
    const noun = metric.label.toLowerCase();
    return { singular: `has ${article(noun)} ${noun}`, plural: `have ${article(noun)} ${noun}` };
  }
  return { singular: `publishes ${metric.label}`, plural: `publish ${metric.label}` };
}

function article(noun: string): string {
  return /^[aeiou]/.test(noun) ? "an" : "a";
}

export function FitPanel({
  fits,
  rig,
  floor,
  selected,
  hidden,
  onToggle,
  onSolo,
  onShowAll,
}: {
  fits: Fit[];
  rig: Rig;
  floor: QuantKey;
  selected: DerivedModel[];
  hidden?: Set<string>;
  onToggle?: (id: string) => void;
  onSolo?: (id: string) => void;
  onShowAll?: () => void;
}) {
  const [scoreKey, setScoreKey] = useState(DEFAULT_SCORE);
  const metric = metricOf(scoreKey, DEFAULT_SCORE);

  const budget = usableBytes(rig);
  const floorIndex = QUANTS.findIndex((q) => q.key === floor);
  const GIB = 1024 ** 3;

  // Sizable is the fixed population: everything with weights to measure. What
  // the chosen benchmark then drops out of it is a separate, reportable number.
  const sizable = fits.filter((f) => f.verdict !== "unsizable");

  // A model that fits is plotted where it actually lands; one that does not is
  // plotted at the smallest size the quality floor allows, which is the honest
  // answer to "how far past my card is it?".
  const points: Point[] = sizable
    .map((f) => {
      const score = metric.value(f.model);
      if (score === null || !Number.isFinite(score)) return null;
      const shown = f.best ?? f.ladder[floorIndex] ?? f.ladder[f.ladder.length - 1];
      return {
        id: f.model.id,
        name: f.model.name,
        provider: f.model.provider,
        x: shown.total / GIB,
        y: score,
        quant: shown.quant.label,
        fits: Boolean(f.best),
        detail: `${formatGiB(shown.weights)} weights + ${formatGiB(shown.kv)} cache`,
        speed: f.throughput ? `${formatTokPerSec(f.throughput)} tok/s` : null,
      };
    })
    .filter((p): p is Point => p !== null);

  const picker = <ScorePicker value={metric.key} onChange={setScoreKey} />;

  if (!points.length) {
    return (
      <ChartCard
        title={`Footprint against ${metric.label}`}
        subtitle="Nothing to plot yet."
        actions={picker}
      >
        <p className="py-10 text-center text-sm text-ink-secondary">
          {sizable.length
            ? `No sizable model in the catalog ${scoreWording(metric).singular}.`
            : "No model in the catalog can be sized against this configuration."}
        </p>
      </ChartCard>
    );
  }

  const shownIds = new Set(selected.filter((m) => !hidden?.has(m.id)).map((m) => m.id));
  const highlights = selected
    .map((m, i) => ({ point: points.find((p) => p.id === m.id), index: i }))
    .filter((h): h is { point: Point; index: number } =>
      Boolean(h.point) && shownIds.has(h.point!.id)
    );
  const highlighted = new Set(highlights.map((h) => h.point.id));

  const cloud = points.filter((p) => !highlighted.has(p.id));
  const fitting = cloud.filter((p) => p.fits);
  const oversize = cloud.filter((p) => !p.fits);

  const xs = points.map((p) => p.x);
  const budgetGiB = budget / GIB;
  const lo = Math.min(...xs, budgetGiB) * 0.7;
  const hi = Math.max(...xs, budgetGiB) * 1.4;

  const fitCount = points.filter((p) => p.fits).length;

  // A selected model can be missing from the plot for two unrelated reasons, and
  // conflating them would answer the wrong question: one has no weights to size,
  // the other has weights but no score on the benchmark now on the y-axis.
  const sizableIds = new Set(sizable.map((f) => f.model.id));
  const plottedIds = new Set(points.map((p) => p.id));
  const hostedSelected = selected.filter((m) => !sizableIds.has(m.id)).length;
  const unscoredSelected = selected.filter(
    (m) => sizableIds.has(m.id) && !plottedIds.has(m.id)
  ).length;
  const unscored = sizable.length - points.length;

  return (
    <ChartCard
      title={`Footprint against ${metric.label}`}
      subtitle={`Every open-weight model at the best quantization your floor allows. Everything left of the line fits in ${rig.label}.`}
      note={`The x-axis is logarithmic — the catalog spans three orders of magnitude in size. Footprint is weights plus KV cache plus runtime overhead. ${fitCount} of ${points.length} plotted models land inside the budget.${
        unscored > 0
          ? ` ${unscored} sizable ${unscored === 1 ? "model does" : "models do"} not ${scoreWording(metric).plural} and ${unscored === 1 ? "is" : "are"} omitted.`
          : ""
      }`}
      actions={picker}
    >
      <div className="h-[380px] w-full sm:h-[440px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 28, right: 40, bottom: 28, left: 4 }}>
            <CartesianGrid stroke="var(--gridline)" strokeDasharray="2 4" />
            {/* The runnable region, washed rather than outlined — it is context
                for the line, not a mark of its own. */}
            <ReferenceArea
              x1={lo}
              x2={budgetGiB}
              fill="var(--open)"
              fillOpacity={0.07}
              ifOverflow="hidden"
            />
            <XAxis
              type="number"
              dataKey="x"
              scale="log"
              domain={[lo, hi]}
              ticks={logTicks(lo, hi)}
              tickFormatter={(v: number) => (v >= 1 ? `${Math.round(v)}` : v.toFixed(1))}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--baseline)" }}
              label={{
                value: "Memory footprint, GB (log)",
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
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--baseline)" }}
              width={64}
              label={{
                value: metric.axisLabel,
                angle: -90,
                position: "insideLeft",
                fill: "var(--text-muted)",
                fontSize: 12,
                style: { textAnchor: "middle" },
              }}
            />
            <ReferenceLine
              x={budgetGiB}
              stroke="var(--accent)"
              strokeWidth={2}
              strokeDasharray="6 4"
              label={{
                value: `${formatGiB(budget)} usable`,
                position: "top",
                fill: "var(--accent-text)",
                fontSize: 11,
              }}
            />
            <Tooltip content={<FitTooltip metric={metric} />} cursor={{ strokeDasharray: "3 3" }} />
            <Scatter
              name="Fits"
              data={fitting}
              fill="var(--open)"
              fillOpacity={0.55}
              stroke="var(--surface-1)"
              strokeWidth={2}
              isAnimationActive={false}
            />
            {/* Too big is drawn hollow as well as dim, so the two states survive
                a greyscale print. */}
            <Scatter
              name="Too big"
              data={oversize}
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth={1.5}
              strokeOpacity={0.6}
              isAnimationActive={false}
            />
            {highlights.map(({ point, index }) => (
              <Scatter
                key={point.id}
                name={point.name}
                data={[point]}
                fill={seriesColor(index)}
                fillOpacity={0.85}
                stroke="var(--surface-1)"
                strokeWidth={2}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="name"
                  content={(props) => (
                    <PointLabel
                      {...props}
                      index={index}
                      withName={highlights.length <= NAMED_LABEL_LIMIT}
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
          <CloudKey color="var(--open)" label="Fits your hardware" solid />
          <CloudKey color="var(--text-muted)" label="Too big at this quality floor" />
        </div>
        <SeriesLegend
          models={selected}
          hidden={hidden}
          onToggle={onToggle}
          onSolo={onSolo}
          onShowAll={onShowAll}
        />
        {hostedSelected > 0 && (
          <p className="text-xs text-ink-muted">
            {hostedSelected} of the selected {hostedSelected === 1 ? "model is" : "models are"}{" "}
            hosted only, with no weights to size — {hostedSelected === 1 ? "it has" : "they have"}{" "}
            no position on this plot.
          </p>
        )}
        {unscoredSelected > 0 && (
          <p className="text-xs text-ink-muted">
            {unscoredSelected} of the selected {unscoredSelected === 1 ? "model" : "models"} can be
            sized but {unscoredSelected === 1 ? "does" : "do"} not {scoreWording(metric).plural}, so{" "}
            {unscoredSelected === 1 ? "it is" : "they are"} off the plot until you pick another
            score.
          </p>
        )}
      </div>
    </ChartCard>
  );
}

/**
 * Which capability metric the y-axis carries — the mean, or any one benchmark
 * behind it. A plain select, so it works on touch and by keyboard.
 */
function ScorePicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  const current = METRIC_BY_KEY.get(value);
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-ink-secondary">
      <span className="font-medium">Score</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Benchmark on the vertical axis"
        className="field w-auto py-1.5 text-xs"
      >
        {SCORE_METRICS.map((m) => (
          <option key={m.key} value={m.key}>
            {m.label}
          </option>
        ))}
      </select>
      {current?.hint && (
        <InfoHint
          label={current.label}
          title={current.label}
          body={current.hint}
          source={current.source}
        />
      )}
    </label>
  );
}

function CloudKey({ color, label, solid }: { color: string; label: string; solid?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-ink-secondary">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={
          solid
            ? { background: color, opacity: 0.6 }
            : { border: `1.5px solid ${color}`, opacity: 0.7 }
        }
        aria-hidden
      />
      {label}
    </span>
  );
}

interface PointLabelProps {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  value?: string | number;
  index: number;
  withName: boolean;
}

function PointLabel({ x, y, width, height, value, index, withName }: PointLabelProps) {
  const cx = Number(x ?? 0) + Number(width ?? 0) / 2;
  const cy = Number(y ?? 0) + Number(height ?? 0) / 2;
  const badgeX = cx - (Number(width ?? 0) / 2 + 12);
  const color = seriesColor(index);

  return (
    <g>
      <circle cx={badgeX} cy={cy} r={8} fill="var(--surface-1)" stroke={color} strokeWidth={2} />
      <text x={badgeX} y={cy} dy={3.5} textAnchor="middle" fill={color} fontSize={10} fontWeight={600}>
        {seriesBadge(index)}
      </text>
      {withName && (
        <text
          x={badgeX - 12}
          y={cy}
          dy={4}
          textAnchor="end"
          fill="var(--text-primary)"
          fontSize={12}
        >
          {value}
        </text>
      )}
    </g>
  );
}

function FitTooltip({
  active,
  payload,
  metric,
}: {
  active?: boolean;
  payload?: Array<{ payload: Point }>;
  metric: Metric;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="card p-3 shadow-lg">
      <p className="text-sm font-semibold text-ink">{p.name}</p>
      <p className="mb-2 text-xs text-ink-muted">
        {p.provider} · {p.fits ? `fits at ${p.quant}` : `too big, even at ${p.quant}`}
      </p>
      <dl className="space-y-0.5 text-xs">
        <Row label="Footprint" value={`${p.x.toFixed(1)} GB`} />
        <Row label="Made of" value={p.detail} />
        <Row label={metric.label} value={metric.format(p.y)} />
        {p.speed && <Row label="Est. speed" value={p.speed} />}
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
