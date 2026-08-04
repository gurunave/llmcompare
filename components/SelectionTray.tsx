"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SeriesBadge } from "@/components/SeriesLegend";
import { MAX_SELECTION } from "@/lib/models";
import { useSelection, withSelection } from "@/lib/selection";

/**
 * `heading` is off when the tray sits in the top bar's popover, where the
 * button that opened it already carries the same count.
 */
export function SelectionTray({ heading = true }: { heading?: boolean }) {
  const { ids, models, hidden, toggle, clear, toggleVisible, showAll, move } = useSelection();
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

  const hiddenCount = models.filter((m) => hidden.has(m.id)).length;

  return (
    <section aria-label="Selected models">
      {heading && (
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
          Selection · {models.length}/{MAX_SELECTION}
        </h2>
      )}

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
          {/* Ten entries would push the rail's buttons off screen, so the list
              itself scrolls and the actions stay put. */}
          <ul className="max-h-[45vh] space-y-1 overflow-y-auto pr-1">
            {models.map((m, i) => {
              const off = hidden.has(m.id);
              return (
                <li
                  key={m.id}
                  className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--wash)]"
                >
                  <SeriesBadge index={i} muted={off} />
                  <Link
                    href={withSelection(`/models/${m.id}`, ids)}
                    className={`min-w-0 flex-1 truncate text-sm hover:underline ${
                      off ? "text-ink-muted line-through" : "text-ink"
                    }`}
                    title={m.name}
                  >
                    {m.name}
                  </Link>

                  {/* Order sets each model's color and badge, so it is worth
                      being able to promote the two you actually care about. */}
                  {/* Kept visible rather than revealed on hover — there is no
                      hover on a touch screen, and these are the only way to
                      change the order. */}
                  <span className="flex items-center opacity-60 group-hover:opacity-100">
                    <TrayButton
                      label={`Move ${m.name} up`}
                      disabled={i === 0}
                      onClick={() => move(m.id, -1)}
                    >
                      ↑
                    </TrayButton>
                    <TrayButton
                      label={`Move ${m.name} down`}
                      disabled={i === models.length - 1}
                      onClick={() => move(m.id, 1)}
                    >
                      ↓
                    </TrayButton>
                  </span>
                  <TrayButton
                    label={`${off ? "Show" : "Hide"} ${m.name} in charts`}
                    pressed={!off}
                    onClick={() => toggleVisible(m.id)}
                  >
                    {off ? "◌" : "●"}
                  </TrayButton>
                  <TrayButton label={`Remove ${m.name} from the selection`} onClick={() => toggle(m.id)}>
                    ×
                  </TrayButton>
                </li>
              );
            })}
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
            {hiddenCount > 0 && (
              <button type="button" className="btn py-1.5 text-xs" onClick={showAll}>
                Show all ({hiddenCount})
              </button>
            )}
            <button type="button" className="btn py-1.5 text-xs" onClick={clear}>
              Clear
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function TrayButton({
  label,
  onClick,
  disabled,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className="rounded px-1 text-xs leading-none text-ink-muted hover:text-ink disabled:opacity-25 disabled:hover:text-ink-muted"
    >
      {children}
    </button>
  );
}
