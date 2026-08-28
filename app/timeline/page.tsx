"use client";

import { useMemo, useState } from "react";
import { MultiSelect, type MultiOption } from "@/components/MultiSelect";
import { PageHeader } from "@/components/PageHeader";
import { TimelineFeed } from "@/components/TimelineFeed";
import { TimelineTable } from "@/components/TimelineTable";
import { TimelinePanel } from "@/components/charts/TimelinePanel";
import { providerColor } from "@/lib/accent";
import { formatMonth } from "@/lib/format";
import { MODELS } from "@/lib/models";
import { useSelection } from "@/lib/selection";
import { byReleaseDesc } from "@/lib/timeline";
import type { DerivedModel } from "@/lib/types";

type View = "chart" | "feed" | "table";
type LicenseFilter = "all" | "open" | "proprietary";

const VIEWS: { key: View; label: string }[] = [
  { key: "chart", label: "Chart" },
  { key: "feed", label: "Feed" },
  { key: "table", label: "Table" },
];

const SORTED = [...MODELS].sort(byReleaseDesc);
const NEWEST = SORTED[0];
const OLDEST = SORTED[SORTED.length - 1];

export default function TimelinePage() {
  const { ids, models, hidden, toggle, toggleVisible, solo, showAll } = useSelection();

  const [view, setView] = useState<View>("chart");
  const [query, setQuery] = useState("");
  const [providers, setProviders] = useState<string[]>([]);
  const [license, setLicense] = useState<LicenseFilter>("all");

  const providerOptions = useMemo(() => buildProviderOptions(MODELS), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byProvider = new Set(providers);
    return MODELS.filter((m) => {
      if (q && !`${m.name} ${m.provider} ${m.tags.join(" ")}`.toLowerCase().includes(q))
        return false;
      if (byProvider.size > 0 && !byProvider.has(m.provider)) return false;
      if (license !== "all" && m.license !== license) return false;
      return true;
    }).sort(byReleaseDesc);
  }, [query, providers, license]);

  const filtering = query.trim() !== "" || providers.length > 0 || license !== "all";

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 lg:py-8">
      <PageHeader
        title="Timeline"
        lead={
          NEWEST && OLDEST
            ? `${MODELS.length} models from ${formatMonth(OLDEST.released)} to ${formatMonth(
                NEWEST.released
              )}. Plotted against any benchmark, read as a feed, or sorted in a table.`
            : undefined
        }
        actions={<ViewSwitch view={view} onChange={setView} />}
      />

      {/* One filter set drives all three views, so switching views never loses
          the reader's place. */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, provider or tag…"
          aria-label="Search models"
          className="field sm:max-w-xs"
        />
        <MultiSelect
          label="Providers"
          emptyLabel="All"
          placeholder="Search providers…"
          options={providerOptions}
          value={providers}
          onChange={setProviders}
        />
        <div className="flex flex-wrap gap-1.5">
          {(["all", "open", "proprietary"] as LicenseFilter[]).map((l) => (
            <FilterChip key={l} active={license === l} onClick={() => setLicense(l)}>
              {l === "all" ? "Any weights" : l === "open" ? "Open weights" : "Proprietary"}
            </FilterChip>
          ))}
        </div>
        {filtering && (
          <span className="text-xs text-ink-muted">
            {filtered.length} of {MODELS.length}
          </span>
        )}
      </div>

      {view === "chart" && (
        <TimelinePanel
          pool={filtered}
          selected={models}
          hidden={hidden}
          onToggle={toggleVisible}
          onSolo={solo}
          onShowAll={showAll}
        />
      )}
      {view === "feed" && <TimelineFeed models={filtered} selected={ids} onToggle={toggle} />}
      {view === "table" && <TimelineTable models={filtered} selected={ids} onToggle={toggle} />}
    </main>
  );
}

function ViewSwitch({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div className="flex gap-1.5" role="group" aria-label="View">
      {VIEWS.map((v) => (
        <button
          key={v.key}
          type="button"
          aria-pressed={view === v.key}
          onClick={() => onChange(v.key)}
          className={`chip ${view === v.key ? "chip-active" : "hover:border-[var(--border-strong)]"}`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

function buildProviderOptions(all: DerivedModel[]): MultiOption[] {
  const counts = new Map<string, number>();
  for (const m of all) counts.set(m.provider, (counts.get(m.provider) ?? 0) + 1);
  return Array.from(counts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([provider, count]) => ({
      id: provider,
      label: provider,
      hint: `${count} model${count === 1 ? "" : "s"}`,
      tint: providerColor(provider),
    }));
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
