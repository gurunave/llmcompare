"use client";

import type { ReactNode } from "react";
import {
  CONTEXT_OPTIONS,
  FAST_TOKENS_PER_SEC,
  PRICE_OPTIONS,
  releaseYears,
  type BrowseFilters,
  type LicenseFilter,
} from "@/lib/browse";
import { MODELS, PROVIDERS } from "@/lib/models";

const YEARS = releaseYears(MODELS);

interface Props {
  filters: BrowseFilters;
  onChange: (next: BrowseFilters) => void;
  /** Drop the search box and provider select where the host has its own. */
  withSearch?: boolean;
  /** Controls placed ahead of the selects on the first row. */
  leading?: ReactNode;
  /** Shown as "Clear filters" after the chips when set. */
  onClear?: () => void;
  compact?: boolean;
}

export function BrowseFilterBar({
  filters,
  onChange,
  withSearch = true,
  leading,
  onClear,
  compact = false,
}: Props) {
  function set<K extends keyof BrowseFilters>(key: K, value: BrowseFilters[K]) {
    onChange({ ...filters, [key]: value });
  }
  const field = compact ? "field py-1.5 text-xs sm:w-auto" : "field sm:w-auto";

  return (
    <div className="space-y-2">
      <div className={`flex flex-wrap items-center ${compact ? "gap-1.5" : "gap-2"}`}>
        {leading}
        {withSearch && (
          <>
            <input
              type="search"
              value={filters.query}
              onChange={(e) => set("query", e.target.value)}
              placeholder="Name, provider or tag…"
              aria-label="Search models"
              className="field sm:max-w-[15rem]"
            />
            <select
              value={filters.provider}
              onChange={(e) => set("provider", e.target.value)}
              aria-label="Filter by provider"
              className={field}
            >
              <option value="all">All providers</option>
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </>
        )}
        <select
          value={filters.minContext}
          onChange={(e) => set("minContext", Number(e.target.value))}
          aria-label="Minimum context window"
          className={field}
        >
          {CONTEXT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={String(filters.maxPrice)}
          onChange={(e) => set("maxPrice", Number(e.target.value))}
          aria-label="Maximum blended price"
          className={field}
        >
          {PRICE_OPTIONS.map((o) => (
            <option key={o.value} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={filters.releasedYear}
          onChange={(e) => set("releasedYear", e.target.value)}
          aria-label="Release year"
          className={field}
        >
          <option value="all">Any year</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              Released {y}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {(["all", "open", "proprietary"] as LicenseFilter[]).map((l) => (
          <FilterChip key={l} active={filters.license === l} onClick={() => set("license", l)}>
            {l === "all" ? "Any weights" : l === "open" ? "Open weights" : "Proprietary"}
          </FilterChip>
        ))}
        <FilterChip active={filters.localOnly} onClick={() => set("localOnly", !filters.localOnly)}>
          Runs on a workstation
        </FilterChip>
        <FilterChip active={filters.multimodal} onClick={() => set("multimodal", !filters.multimodal)}>
          Sees images
        </FilterChip>
        <FilterChip active={filters.reasoning} onClick={() => set("reasoning", !filters.reasoning)}>
          Reasoning
        </FilterChip>
        <FilterChip active={filters.fast} onClick={() => set("fast", !filters.fast)}>
          Fast ({FAST_TOKENS_PER_SEC}+ tok/s)
        </FilterChip>
        {onClear && (
          <button type="button" onClick={onClear} className="link ml-1 text-xs font-medium">
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
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
