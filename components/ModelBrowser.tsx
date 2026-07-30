"use client";

import { useMemo, useState } from "react";
import { formatPrice, formatScore, formatTokens } from "@/lib/format";
import { MAX_SELECTION, MODELS, PROVIDERS } from "@/lib/models";
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
    <section className="card p-4 sm:p-5">
      <header className="mb-4">
        <h2 className="text-base font-semibold text-ink">Browse models</h2>
        <p className="mt-0.5 text-sm text-ink-secondary">
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
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-hairline">
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
                      className={`inline-flex items-center gap-1 hover:text-ink ${active ? "text-ink" : "text-ink-muted"}`}
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
                  className={`border-b border-hairline last:border-0 ${isSelected ? "bg-[var(--wash)]" : ""}`}
                >
                  <td className="py-2 pr-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={disabled}
                      onChange={() => onToggle(m.id)}
                      aria-label={`Compare ${m.name}`}
                      className="h-4 w-4 accent-[var(--series-1)] disabled:opacity-30"
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <span className="font-medium text-ink">{m.name}</span>
                    {m.license === "open" && (
                      <span className="ml-2 rounded border border-hairline px-1 py-0.5 text-[10px] uppercase tracking-wide text-ink-muted">
                        open
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-ink-secondary">{m.provider}</td>
                  <td className="num py-2 pr-4 text-right text-ink-secondary">
                    {formatTokens(m.context)}
                  </td>
                  <td className="num py-2 pr-4 text-right text-ink-secondary">
                    {formatPrice(m.blendedPrice)}
                  </td>
                  <td className="num py-2 pr-4 text-right text-ink-secondary">{m.speed}</td>
                  <td className="num py-2 pr-4 text-right text-ink">
                    {formatScore(m.capability)}
                  </td>
                  <td className="num py-2 pr-4 text-right text-ink-secondary">
                    {formatScore(m.scores.swebench)}
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
