"use client";

import { seriesBadge, seriesColor, seriesDash } from "@/lib/series";
import type { DerivedModel } from "@/lib/types";

/**
 * The numbered mark every surface shares. The digit is the identity channel —
 * it stays legible when the palette wraps past eight series — and it sits in
 * the series color on the card surface, which keeps contrast in both themes
 * without needing a light and a dark text color.
 */
export function SeriesBadge({ index, muted }: { index: number; muted?: boolean }) {
  const color = seriesColor(index);
  return (
    <span
      className="num inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-semibold leading-none"
      style={{
        color,
        borderWidth: 2,
        borderStyle: "solid",
        borderColor: color,
        background: "var(--surface-1)",
        opacity: muted ? 0.4 : 1,
      }}
      aria-hidden
    >
      {seriesBadge(index)}
    </span>
  );
}

interface Props {
  /** The full selection — position sets color and badge, so it must not be pre-filtered. */
  models: DerivedModel[];
  hidden?: Set<string>;
  onToggle?: (id: string) => void;
  onSolo?: (id: string) => void;
  onShowAll?: () => void;
  /** Radar strokes are dashed per series; the legend mark echoes the pattern. */
  showDash?: boolean;
}

/**
 * Legend and visibility control in one. A chip is a real toggle button: click
 * hides that series everywhere on the page, shift-click isolates it. Hidden
 * state is carried by the strike-through and the hollow mark as well as by
 * opacity, so it survives a greyscale print or a colorblind reader.
 */
export function SeriesLegend({ models, hidden, onToggle, onSolo, onShowAll, showDash }: Props) {
  if (models.length < 2) return null;
  const hiddenCount = models.filter((m) => hidden?.has(m.id)).length;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {models.map((m, i) => {
        const off = Boolean(hidden?.has(m.id));
        const interactive = Boolean(onToggle);
        const content = (
          <>
            <SeriesBadge index={i} muted={off} />
            {showDash && (
              <svg width="16" height="8" aria-hidden className="shrink-0">
                <line
                  x1="0"
                  y1="4"
                  x2="16"
                  y2="4"
                  stroke={seriesColor(i)}
                  strokeWidth="2"
                  strokeDasharray={seriesDash(i)}
                  strokeLinecap="round"
                  opacity={off ? 0.35 : 1}
                />
              </svg>
            )}
            <span className={off ? "text-ink-muted line-through" : "text-ink-secondary"}>
              {m.name}
            </span>
          </>
        );

        if (!interactive) {
          return (
            <span key={m.id} className="inline-flex items-center gap-1.5 text-xs">
              {content}
            </span>
          );
        }

        return (
          <button
            key={m.id}
            type="button"
            aria-pressed={!off}
            title={`${off ? "Show" : "Hide"} ${m.name} · shift-click to isolate`}
            onClick={(e) => {
              if (e.shiftKey && onSolo) onSolo(m.id);
              else onToggle?.(m.id);
            }}
            className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-xs hover:bg-[var(--wash)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            {content}
          </button>
        );
      })}

      {hiddenCount > 0 && onShowAll && (
        <button
          type="button"
          onClick={onShowAll}
          className="rounded-md px-1.5 py-0.5 text-xs font-medium text-accent-text hover:bg-[var(--wash)]"
        >
          Show all ({hiddenCount} hidden)
        </button>
      )}
    </div>
  );
}

/** Empty state for a chart whose every series has been toggled off. */
export function AllHidden({ onShowAll }: { onShowAll?: () => void }) {
  return (
    <div className="flex h-[240px] flex-col items-center justify-center gap-3 text-center">
      <p className="text-sm text-ink-secondary">Every series is hidden.</p>
      {onShowAll && (
        <button type="button" className="btn py-1.5 text-xs" onClick={onShowAll}>
          Show all
        </button>
      )}
    </div>
  );
}
