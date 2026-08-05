"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

/** Panel width, and the gaps it keeps from the trigger and the viewport edge. */
const WIDTH = 300;
const GAP = 6;
const MARGIN = 8;

export interface MultiOption {
  id: string;
  label: string;
  /** Secondary line — the provider behind a model, or a model count. */
  hint?: string;
  /** Dot color, when the option already has an identity elsewhere in the app. */
  tint?: string;
  /** Extra text the search matches on, beyond the label and the hint. */
  search?: string;
}

interface Placement {
  top: number;
  left: number;
  width: number;
}

interface Props {
  /** Names the control on its trigger and in the accessible label. */
  label: string;
  options: MultiOption[];
  /** Chosen ids. Empty means "no filter", which is not the same as "none". */
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  /** Shown on the trigger while nothing is chosen — "All providers". */
  emptyLabel?: string;
}

/**
 * A checkbox list behind a chip: pick any number of options, empty means the
 * filter is off. A native multiple-select can do this in principle, but it
 * needs ctrl-click to add a second value and cannot be searched, which rules
 * it out for a list of eighty-odd models.
 *
 * The panel is portalled to the body for the same reason the info hint is:
 * every chart card sets `overflow: hidden` to clip its accent stripe, so an
 * absolutely-positioned panel would be cut off at the card's edge.
 */
export function MultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "Search…",
  emptyLabel,
}: Props) {
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [query, setQuery] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const open = placement !== null;

  const chosen = useMemo(() => new Set(value), [value]);

  const matches = useMemo(() => {
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return options;
    return options.filter((o) => {
      const haystack = `${o.label} ${o.hint ?? ""} ${o.search ?? ""}`.toLowerCase();
      return tokens.every((t) => haystack.includes(t));
    });
  }, [options, query]);

  const position = useCallback(() => {
    const trigger = buttonRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const width = Math.min(WIDTH, window.innerWidth - MARGIN * 2);
    // Prefer left-aligned with the trigger; flip to right-aligned when that
    // would run off the window, which is what happens to a card's header row.
    const left =
      r.left + width + MARGIN > window.innerWidth
        ? Math.max(MARGIN, r.right - width)
        : Math.max(MARGIN, r.left);
    setPlacement({ top: r.bottom + GAP, left, width });
  }, []);

  const close = useCallback(() => setPlacement(null), []);

  useEffect(() => {
    if (!open) return;

    // Fixed coordinates go stale as soon as anything scrolls, and this can sit
    // inside a scroller — capture catches those too, not only the window.
    function reposition() {
      position();
    }
    function onDown(e: PointerEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      close();
      buttonRef.current?.focus();
    }

    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, position, close]);

  function toggle(optionId: string) {
    onChange(
      chosen.has(optionId) ? value.filter((v) => v !== optionId) : [...value, optionId]
    );
  }

  const summary = value.length === 0 ? (emptyLabel ?? `All ${label.toLowerCase()}`) : String(value.length);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => (open ? close() : position())}
        className={`chip ${value.length ? "chip-active" : "hover:border-[var(--border-strong)]"}`}
      >
        <span className="font-medium">{label}</span>
        <span className="num text-ink-muted">{summary}</span>
        <span aria-hidden className="text-[9px] leading-none">
          ▾
        </span>
      </button>

      {placement &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            id={id}
            role="dialog"
            aria-label={label}
            style={{ top: placement.top, left: placement.left, width: placement.width }}
            className="card fixed z-50 whitespace-normal p-2.5 text-left shadow-lg"
          >
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              aria-label={`Search ${label.toLowerCase()}`}
              className="field py-1.5 text-xs"
            />

            <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
              <span className="text-ink-muted">
                {value.length ? `${value.length} selected` : "No filter"}
              </span>
              <span className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => onChange(Array.from(new Set([...value, ...matches.map((o) => o.id)])))}
                  disabled={matches.length === 0}
                  className="link disabled:pointer-events-none disabled:opacity-40"
                >
                  {query ? "Add matches" : "Select all"}
                </button>
                <button
                  type="button"
                  onClick={() => onChange([])}
                  disabled={value.length === 0}
                  className="link disabled:pointer-events-none disabled:opacity-40"
                >
                  Clear
                </button>
              </span>
            </div>

            <ul className="mt-2 max-h-64 space-y-0.5 overflow-y-auto">
              {matches.map((o) => (
                <li key={o.id}>
                  <label className="flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-[var(--wash)]">
                    <input
                      type="checkbox"
                      checked={chosen.has(o.id)}
                      onChange={() => toggle(o.id)}
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[var(--accent)]"
                    />
                    {o.tint && (
                      <span
                        className="dot mt-1"
                        style={{ "--tint": o.tint } as CSSProperties}
                        aria-hidden
                      />
                    )}
                    <span className="min-w-0">
                      <span className="block text-ink">{o.label}</span>
                      {o.hint && <span className="block text-ink-muted">{o.hint}</span>}
                    </span>
                  </label>
                </li>
              ))}
              {matches.length === 0 && (
                <li className="px-1.5 py-3 text-center text-xs text-ink-muted">No matches.</li>
              )}
            </ul>
          </div>,
          document.body
        )}
    </>
  );
}
