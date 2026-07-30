"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MAX_SELECTION } from "@/lib/models";
import { useSelection, withSelection } from "@/lib/selection";
import { seriesColor } from "@/lib/series";

export function SelectionTray() {
  const { ids, models, toggle, clear } = useSelection();
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the address bar already holds the shareable URL */
    }
  }

  return (
    <section aria-label="Selected models">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
        Selection · {models.length}/{MAX_SELECTION}
      </h2>

      {models.length === 0 ? (
        <p className="text-sm text-ink-secondary">
          Nothing selected yet. Pick models on the{" "}
          <Link href="/" className="underline underline-offset-2 hover:text-ink">
            browse page
          </Link>
          .
        </p>
      ) : (
        <>
          <ul className="space-y-1">
            {models.map((m, i) => (
              <li
                key={m.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--wash)]"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: seriesColor(i) }}
                  aria-hidden
                />
                <Link
                  href={withSelection(`/models/${m.id}`, ids)}
                  className="min-w-0 flex-1 truncate text-sm text-ink hover:underline"
                  title={m.name}
                >
                  {m.name}
                </Link>
                <button
                  type="button"
                  onClick={() => toggle(m.id)}
                  aria-label={`Remove ${m.name} from the selection`}
                  className="rounded px-1 text-ink-muted hover:text-ink"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {pathname !== "/compare" && (
              <Link href={withSelection("/compare", ids)} className="btn btn-primary py-1.5 text-xs">
                Compare
              </Link>
            )}
            <button type="button" className="btn py-1.5 text-xs" onClick={share}>
              {copied ? "Copied" : "Share"}
            </button>
            <button type="button" className="btn py-1.5 text-xs" onClick={clear}>
              Clear
            </button>
          </div>
        </>
      )}
    </section>
  );
}
