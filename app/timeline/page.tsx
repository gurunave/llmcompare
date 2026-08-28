"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { TimelineFeed } from "@/components/TimelineFeed";
import { TimelineTable } from "@/components/TimelineTable";
import { TimelinePanel } from "@/components/charts/TimelinePanel";
import { formatMonth } from "@/lib/format";
import { MODELS, PROVIDERS } from "@/lib/models";
import { useSelection } from "@/lib/selection";
import { byReleaseDesc } from "@/lib/timeline";

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
  const [provider, setProvider] = useState("all");
  const [license, setLicense] = useState<LicenseFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MODELS.filter((m) => {
      if (q && !`${m.name} ${m.provider} ${m.tags.join(" ")}`.toLowerCase().includes(q))
        return false;
      if (provider !== "all" && m.provider !== provider) return false;
      if (license !== "all" && m.license !== license) return false;
      return true;
    }).sort(byReleaseDesc);
  }, [query, provider, license]);

  const filtering = query.trim() !== "" || provider !== "all" || license !== "all";

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 lg:py-8">
      <PageHeader
        title="Timeline"
        lead={
          NEWEST && OLDEST
            ? `${MODELS.length} models from ${formatMonth(OLDEST.released)} to ${formatMonth(
                NEWEST.released
              )}. Plotted against capability, read as a feed, or sorted in a table.`
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
