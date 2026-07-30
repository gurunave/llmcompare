"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import { licenceColor, providerColor } from "@/lib/accent";
import { formatPrice, formatScore, formatTokens } from "@/lib/format";
import { MAX_SELECTION, MODELS, PROVIDERS } from "@/lib/models";
import { withSelection } from "@/lib/selection";
import type { DerivedModel } from "@/lib/types";

type SortKey = "name" | "provider" | "context" | "price" | "speed" | "capability" | "swebench";
type SortDir = "asc" | "desc";
type LicenseFilter = "all" | "open" | "proprietary";

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "name", label: "Model", numeric: false },
  { key: "provider", label: "Provider", numeric: false },
  { key: "context", label: "Context", numeric: true },
  { key: "price", label: "$ / 1M", numeric: true },
  { key: "speed", label: "tok/s", numeric: true },
  { key: "capability", label: "Mean", numeric: true },
  { key: "swebench", label: "SWE-b", numeric: true },
];

function sortValue(m: DerivedModel, key: SortKey): string | number {
  switch (key) {
    case "name":
      return m.name.toLowerCase();
    case "provider":
      return m.provider.toLowerCase();
    case "context":
      return m.context;
    case "price":
      return m.blendedPrice;
    case "speed":
      return m.speed;
    case "capability":
      return m.capability ?? -1;
    case "swebench":
      return m.scores.swebench ?? -1;
  }
}

export function ModelBrowser({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("all");
  const [license, setLicense] = useState<LicenseFilter>("all");
  const [localOnly, setLocalOnly] = useState(false);
  const [multimodal, setMultimodal] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "capability",
    dir: "desc",
  });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = MODELS.filter((m) => {
      if (q && !`${m.name} ${m.provider} ${m.tags.join(" ")}`.toLowerCase().includes(q)) return false;
      if (provider !== "all" && m.provider !== provider) return false;
      if (license !== "all" && m.license !== license) return false;
      if (localOnly && !["laptop", "workstation"].includes(m.localTier ?? "")) return false;
      if (multimodal && !m.modalities.includes("image")) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [query, provider, license, localOnly, multimodal, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "name" || key === "provider" ? "asc" : "desc" }
    );
  }

  const full = selected.length >= MAX_SELECTION;

  return (
    <section className="card card-accent p-4 sm:p-5">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-ink">Browse models</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          {rows.length} of {MODELS.length} models. Pick up to {MAX_SELECTION} to compare.
        </p>
      </header>

      {/* Filters live in one row above the data, per the interaction spec. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, provider or tag…"
          aria-label="Search models"
          className="field sm:max-w-xs"
        />
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          aria-label="Filter by provider"
          className="field sm:w-auto"
        >
          <option value="all">All providers</option>
          {PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-1.5">
          {(["all", "open", "proprietary"] as LicenseFilter[]).map((l) => (
            <FilterChip key={l} active={license === l} onClick={() => setLicense(l)}>
              {l === "all" ? "Any weights" : l === "open" ? "Open weights" : "Proprietary"}
            </FilterChip>
          ))}
          <FilterChip active={localOnly} onClick={() => setLocalOnly((v) => !v)}>
            Runs on a workstation
          </FilterChip>
          <FilterChip active={multimodal} onClick={() => setMultimodal((v) => !v)}>
            Sees images
          </FilterChip>
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="data-table w-full min-w-[760px] border-collapse text-[0.9375rem]">
          {/* 85 rows deep, so the header follows the scroll. */}
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
                  <td className="py-2.5 pr-4">
                    <Link
                      href={withSelection(`/models/${m.id}`, selected)}
                      className="font-medium text-ink hover:text-accent-text hover:underline"
                    >
                      {m.name}
                    </Link>
                    {/* Only the open badge is drawn — on a mostly proprietary
                        catalog the inverse badge would repeat on every row. */}
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
                    {formatTokens(m.context)}
                  </td>
                  <td className="num py-2.5 pr-4 text-right text-ink-secondary">
                    {formatPrice(m.blendedPrice)}
                  </td>
                  <td className="num py-2.5 pr-4 text-right text-ink-secondary">{m.speed}</td>
                  <td className="num py-2.5 pr-4 text-right">
                    <ScoreCell value={m.capability} />
                  </td>
                  <td className="num py-2.5 pr-4 text-right">
                    <ScoreCell value={m.scores.swebench} />
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
    </section>
  );
}

/**
 * The number stays in ink and carries the value; the bar under it is a length
 * encoding for scanning a column at a glance, not a second color code.
 */
function ScoreCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-ink-muted">—</span>;
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <span className="text-ink">{formatScore(value)}</span>
      <span className="block h-1 w-14 rounded-full bg-[var(--wash)]" aria-hidden>
        <span
          className="block h-full rounded-full bg-accent"
          style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        />
      </span>
    </span>
  );
}

function FilterChip({
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
