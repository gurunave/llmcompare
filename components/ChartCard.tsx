import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  note?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function ChartCard({ title, subtitle, note, actions, children }: Props) {
  return (
    <section className="card p-4 sm:p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-ink-secondary">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
      </header>
      {children}
      {note && <p className="mt-3 text-xs text-ink-muted">{note}</p>}
    </section>
  );
}

/** Legend chip — the colored mark carries identity, the text stays in ink tokens. */
export function LegendItem({
  color,
  dash,
  label,
}: {
  color: string;
  dash?: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-ink-secondary">
      <svg width="18" height="10" aria-hidden className="shrink-0">
        <line
          x1="0"
          y1="5"
          x2="18"
          y2="5"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={dash}
          strokeLinecap="round"
        />
      </svg>
      {label}
    </span>
  );
}
