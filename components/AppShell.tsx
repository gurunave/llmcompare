"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { SelectionTray } from "@/components/SelectionTray";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MODELS } from "@/lib/models";
import { useSelection, withSelection } from "@/lib/selection";

const NAV = [
  { href: "/", label: "Browse", match: (p: string) => p === "/" },
  { href: "/compare", label: "Compare", match: (p: string) => p.startsWith("/compare") },
  { href: "/recommend", label: "Recommend", match: (p: string) => p.startsWith("/recommend") },
  { href: "/methodology", label: "Methodology", match: (p: string) => p.startsWith("/methodology") },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { ids } = useSelection();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // A route change means the drawer has served its purpose.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen lg:flex">
      {/* Mobile header — the rail collapses behind this button below lg. */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-hairline bg-plane/90 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          className="btn px-2.5 py-1.5"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
        >
          <MenuIcon />
        </button>
        <Link href={withSelection("/", ids)} className="font-semibold text-ink">
          LLM Compare
        </Link>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      {drawerOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 shrink-0 overflow-y-auto border-r border-hairline bg-surface p-4 transition-transform lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-5 hidden items-start justify-between gap-2 lg:flex">
          <Link href={withSelection("/", ids)}>
            <span className="block text-lg font-semibold tracking-tight text-ink">
              LLM Compare
            </span>
            <span className="mt-0.5 block text-xs text-ink-muted">
              {MODELS.length} models · {new Set(MODELS.map((m) => m.provider)).size} providers
            </span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="mb-4 flex items-center justify-between lg:hidden">
          <span className="text-sm font-semibold text-ink">Menu</span>
          <button
            type="button"
            className="btn px-2 py-1 text-xs"
            onClick={() => setDrawerOpen(false)}
          >
            Close
          </button>
        </div>

        <nav aria-label="Sections">
          <ul className="space-y-0.5">
            {NAV.map((item) => {
              const active = item.match(pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={withSelection(item.href, ids)}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-[var(--wash)] font-medium text-ink"
                        : "text-ink-secondary hover:bg-[var(--wash)] hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-6 border-t border-hairline pt-4">
          <SelectionTray />
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}
