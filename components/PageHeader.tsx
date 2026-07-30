import Link from "next/link";
import type { ReactNode } from "react";

interface Crumb {
  label: string;
  href?: string;
}

export function PageHeader({
  title,
  lead,
  crumbs,
  actions,
  badges,
}: {
  title: string;
  lead?: string;
  crumbs?: Crumb[];
  actions?: ReactNode;
  /** Identity chips shown under the lead — provider, licence, tags. */
  badges?: ReactNode;
}) {
  return (
    <header className="mb-5">
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
            {crumbs.map((c, i) => (
              <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden>›</span>}
                {c.href ? (
                  <Link href={c.href} className="text-accent-text hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-ink-secondary">{c.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="border-l-4 border-accent pl-3">
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
          {lead && (
            <p className="mt-1.5 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-secondary">
              {lead}
            </p>
          )}
          {badges && <div className="mt-2.5 flex flex-wrap items-center gap-1.5">{badges}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
      </div>
    </header>
  );
}
