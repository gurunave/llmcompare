"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { NavLayoutToggle } from "@/components/NavLayoutToggle";
import { SelectionPopover } from "@/components/SelectionPopover";
import { SelectionTray } from "@/components/SelectionTray";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MODELS } from "@/lib/models";
import { useSelection, withSelection } from "@/lib/selection";

/** Each section carries one of the categorical hues, so the rail reads as a map. */
const NAV = [
  { href: "/", label: "Browse", tint: "var(--series-1)", match: (p: string) => p === "/" },
  {
    href: "/compare",
    label: "Compare",
    tint: "var(--series-3)",
    match: (p: string) => p.startsWith("/compare"),
  },
  {
    href: "/recommend",
    label: "Recommend",
    tint: "var(--series-4)",
    match: (p: string) => p.startsWith("/recommend"),
  },
  {
    href: "/hardware",
    label: "Hardware",
    tint: "var(--series-5)",
    match: (p: string) => p.startsWith("/hardware"),
  },
  {
    href: "/methodology",
    label: "Methodology",
    tint: "var(--series-2)",
    match: (p: string) => p.startsWith("/methodology"),
  },
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
    // Both chromes are rendered and CSS shows one, keyed off `data-nav` on the
    // root. The alternative — branching in React — cannot know the reader's
    // choice until hydration, which is a visible jump on every load.
    <div className="shell min-h-screen lg:flex">
      {/* Top-bar layout. Hidden below lg, where the drawer is the better answer
          regardless of which layout was chosen. */}
      <header className="nav-top sticky top-0 z-30 hidden items-center gap-4 border-b border-hairline bg-surface/90 px-4 py-2.5 backdrop-blur lg:flex">
        <Link href={withSelection("/", ids)} className="shrink-0">
          <span className="block bg-gradient-to-r from-series-1 via-series-3 to-series-4 bg-clip-text font-bold tracking-tight text-transparent">
            LLM Compare
          </span>
        </Link>

        <nav aria-label="Sections">
          <NavList pathname={pathname} ids={ids} row />
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <SelectionPopover />
          <NavLayoutToggle />
          <ThemeToggle />
        </div>
      </header>

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
        <Link
          href={withSelection("/", ids)}
          className="bg-gradient-to-r from-series-1 via-series-3 to-series-4 bg-clip-text font-bold text-transparent"
        >
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
        className={`nav-rail fixed inset-y-0 left-0 z-50 w-72 shrink-0 overflow-y-auto border-r border-hairline bg-surface p-4 transition-transform lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-5 hidden items-start justify-between gap-2 lg:flex">
          <Link href={withSelection("/", ids)}>
            <span className="block bg-gradient-to-r from-series-1 via-series-3 to-series-4 bg-clip-text text-lg font-bold tracking-tight text-transparent">
              LLM Compare
            </span>
            <span className="mt-0.5 block text-xs text-ink-muted">
              {MODELS.length} models · {new Set(MODELS.map((m) => m.provider)).size} providers
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            <NavLayoutToggle />
            <ThemeToggle />
          </div>
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
          <NavList pathname={pathname} ids={ids} />
        </nav>

        <div className="mt-6 border-t border-hairline pt-4">
          <SelectionTray />
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/**
 * The section links, in a column for the rail or a row for the top bar. One
 * list rendered twice rather than two lists to keep in step — only the spacing
 * and padding differ between them.
 */
function NavList({
  pathname,
  ids,
  row,
}: {
  pathname: string;
  ids: string[];
  row?: boolean;
}) {
  return (
    <ul className={row ? "flex items-center gap-0.5" : "space-y-0.5"}>
      {NAV.map((item) => {
        const active = item.match(pathname);
        return (
          <li key={item.href}>
            <Link
              href={withSelection(item.href, ids)}
              aria-current={active ? "page" : undefined}
              style={{ "--tint": item.tint } as CSSProperties}
              className={`flex items-center gap-2.5 rounded-lg text-sm transition-colors ${
                row ? "px-2.5 py-1.5" : "px-3 py-2"
              } ${
                active
                  ? "bg-[color-mix(in_srgb,var(--tint)_14%,transparent)] font-semibold text-ink"
                  : "text-ink-secondary hover:bg-[var(--wash)] hover:text-ink"
              }`}
            >
              <span
                aria-hidden
                className={`h-2 w-2 shrink-0 rounded-full transition-opacity ${
                  active ? "opacity-100" : "opacity-40"
                }`}
                style={{ background: "var(--tint)" }}
              />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
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
