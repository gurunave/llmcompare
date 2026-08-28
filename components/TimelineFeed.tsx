"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { licenceColor, providerColor } from "@/lib/accent";
import { formatMonth, formatPrice, formatScore, formatTokens } from "@/lib/format";
import { MAX_SELECTION } from "@/lib/models";
import { withSelection } from "@/lib/selection";
import { groupByMonth } from "@/lib/timeline";
import type { DerivedModel } from "@/lib/types";

/**
 * A reverse-chronological changelog — the most literal reading of "when did
 * these ship." Each month is its own heading so a reader can scan cadence
 * (a quiet month next to a burst of releases) without a chart in the way.
 */
export function TimelineFeed({
  models,
  selected,
  onToggle,
}: {
  models: DerivedModel[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const months = groupByMonth(models);
  const full = selected.length >= MAX_SELECTION;

  if (months.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-ink-muted">
        No models match these filters.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {months.map(({ month, models: inMonth }) => (
        <section key={month}>
          <h3 className="mb-2 flex items-baseline gap-2 text-sm font-semibold text-ink">
            {formatMonth(month)}
            <span className="text-xs font-normal text-ink-muted">
              {inMonth.length} model{inMonth.length === 1 ? "" : "s"}
            </span>
          </h3>
          <ul className="divide-y divide-hairline overflow-hidden rounded-lg border border-hairline">
            {inMonth.map((m) => {
              const isSelected = selected.includes(m.id);
              const disabled = full && !isSelected;
              return (
                <li
                  key={m.id}
                  className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2.5 ${
                    isSelected ? "bg-[var(--accent-wash)]" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={disabled}
                    onChange={() => onToggle(m.id)}
                    aria-label={`Compare ${m.name}`}
                    className="h-4 w-4 shrink-0 accent-[var(--accent)] disabled:opacity-30"
                  />

                  <span
                    className="dot shrink-0"
                    style={{ "--tint": providerColor(m.provider) } as CSSProperties}
                    aria-hidden
                  />

                  <div className="min-w-0 flex-1">
                    <Link
                      href={withSelection(`/models/${m.id}`, selected)}
                      className="font-medium text-ink hover:text-accent-text hover:underline"
                    >
                      {m.name}
                    </Link>
                    {m.license === "open" && (
                      <span
                        className="badge ml-2 align-middle"
                        style={{ "--tint": licenceColor("open") } as CSSProperties}
                      >
                        open
                      </span>
                    )}
                    <span className="ml-2 text-sm text-ink-secondary">{m.provider}</span>
                  </div>

                  <div className="num flex shrink-0 items-center gap-4 text-xs text-ink-secondary">
                    <span title="Capability index">
                      {m.capability !== null ? formatScore(m.capability) : "—"}
                    </span>
                    <span title="Blended price per 1M tokens">{formatPrice(m.blendedPrice)}</span>
                    <span title="Context window">{formatTokens(m.context)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
