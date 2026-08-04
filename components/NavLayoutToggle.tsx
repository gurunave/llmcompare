"use client";

import { useRootPreference } from "@/lib/rootPreference";

export type NavLayout = "rail" | "top";
const STORAGE_KEY = "llmcompare-nav";
const LAYOUTS = ["rail", "top"] as const;

/**
 * Moves the navigation between the side rail and a top bar. The layout itself
 * is CSS driven off `data-nav` on the root, set before first paint — this only
 * flips the attribute and remembers it, exactly as the theme toggle does.
 */
export function NavLayoutToggle() {
  const [layout, setLayout] = useRootPreference<NavLayout>(
    "data-nav",
    STORAGE_KEY,
    LAYOUTS,
    "rail"
  );

  const next: NavLayout = layout === "rail" ? "top" : "rail";
  const label = next === "top" ? "Move navigation to the top" : "Move navigation to the side";

  return (
    <button
      type="button"
      className="btn px-2.5"
      onClick={() => setLayout(next)}
      aria-label={label}
      title={label}
    >
      {next === "top" ? <PanelTopIcon /> : <PanelLeftIcon />}
    </button>
  );
}

/** Each icon shows the layout the button would switch to, not the current one. */
function PanelTopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
    </svg>
  );
}

function PanelLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
    </svg>
  );
}
