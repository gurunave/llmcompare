"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import { licenceColor, providerColor } from "@/lib/accent";
import { formatMonth, formatPrice, formatScore, formatTokens } from "@/lib/format";
import { MAX_SELECTION } from "@/lib/models";
import { withSelection } from "@/lib/selection";
import { monthIndex } from "@/lib/timeline";
import type { DerivedModel } from "@/lib/types";

type SortKey = "released" | "cutoff" | "name" | "provider" | "capability" | "price";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "released", label: "Released", numeric: false },
  { key: "cutoff", label: "Cutoff", numeric: false },
  { key: "name", label: "Model", numeric: false },
  { key: "provider", label: "Provider", numeric: false },
  { key: "capability", label: "Index", numeric: true },
  { key: "price", label: "$ / 1M", numeric: true },
];

function sortValue(m: DerivedModel, key: SortKey): string | number {
  switch (key) {
    case "released":
      return monthIndex(m.released);
    case "cutoff":
      return monthIndex(m.cutoff);
    case "name":
      return m.name.toLowerCase();
    case "provider":
      return m.provider.toLowerCase();
    case "capability":
      return m.capability ?? -1;
    case "price":
      return m.blendedPrice;
  }
}

export function TimelineTable({
  models,
  selected,
  onToggle,
}: {
  models: DerivedModel[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "released",
    dir: "desc",
  });

  const rows = useMemo(() => {
    return [...models].sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      const cmp =
        typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      // Same release month, most recently reviewed first is meaningless, so fall
      // back to name — a stable, readable order for ties.
      return (sort.dir === "asc" ? cmp : -cmp) || a.name.localeCompare(b.name);
    });
  }, [models, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "name" || key === "provider" ? "asc" : "desc" }
    );
  }

  const full = selected.length >= MAX_SELECTION;

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="data-table w-full min-w-[720px] border-collapse text-[0.9375rem]">
        <thead className="sticky top-0 z-10 bg-surface">
          <tr className="border-b-2 border-[var(--border-strong)]">
            <th scope="col" className="w-10 py-2 pr-2">
              <span className="sr-only">Select</span>
            </th>
            {COLUMNS.map((c) => {
              const active = sort.key === c.key;
              return (
                <th
                  key={c.key}
                  scope="col"
                  className={`py-2 pr-4 font-medium ${c.numeric ? "text-right" : "text-left"}`}
                  aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(c.key)}
                    className={`inline-flex items-center gap-1 hover:text-ink ${
                      active ? "text-accent-text" : "text-ink-muted"
                    }`}
                  >
                    {c.label}
                    <span aria-hidden className="text-[10px]">
                      {active ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => {
            const isSelected = selected.includes(m.id);
            const disabled = full && !isSelected;
            return (
              <tr
                key={m.id}
                className={`border-b border-hairline last:border-0 ${
                  isSelected ? "bg-[var(--accent-wash)]" : ""
                }`}
              >
                <td className="py-2.5 pr-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={disabled}
                    onChange={() => onToggle(m.id)}
                    aria-label={`Compare ${m.name}`}
                    className="h-4 w-4 accent-[var(--accent)] disabled:opacity-30"
                  />
                </td>
                <td className="num py-2.5 pr-4 text-ink">{formatMonth(m.released)}</td>
                <td className="num py-2.5 pr-4 text-ink-secondary">{formatMonth(m.cutoff)}</td>
                <td className="py-2.5 pr-4">
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
                </td>
                <td className="py-2.5 pr-4 text-ink-secondary">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="dot"
                      style={{ "--tint": providerColor(m.provider) } as CSSProperties}
                      aria-hidden
                    />
                    {m.provider}
                  </span>
                </td>
                <td className="num py-2.5 pr-4 text-right text-ink-secondary">
                  {m.capability !== null ? formatScore(m.capability) : "—"}
                </td>
                <td className="num py-2.5 pr-4 text-right text-ink-secondary">
                  {formatPrice(m.blendedPrice)}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length + 1} className="py-8 text-center text-ink-muted">
                No models match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
