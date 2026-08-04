"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Popover width, and the gap it keeps from the trigger and the viewport edge. */
const WIDTH = 272;
const GAP = 6;
const MARGIN = 8;

interface Placement {
  top: number;
  left: number;
  width: number;
}

/**
 * The "what is this benchmark" affordance next to a picker or a row label.
 *
 * Opens on hover for a mouse and on click for everything else, because the
 * benchmark names are the least self-explanatory strings in the app and a
 * touch user has no hover to fall back on. Click also latches it open, so the
 * text can be read without holding the pointer still.
 *
 * The panel is portalled to the body and positioned from the trigger's own
 * rectangle rather than being absolutely placed beside it. Every chart card
 * sets `overflow: hidden` to clip its accent stripe, and the spec table scrolls
 * sideways inside that — an absolutely-positioned panel is cut off by whichever
 * comes first. Portalling is the only placement that escapes both, and it also
 * lets the panel flip to the left of the trigger near the right edge of the
 * window instead of being clamped half off-screen.
 */
export function InfoHint({
  label,
  title,
  body,
  source,
}: {
  /** Names the subject in the accessible label — "About SWE-bench Pro". */
  label: string;
  title?: string;
  body: string;
  source?: string;
}) {
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [latched, setLatched] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const open = placement !== null;

  const position = useCallback(() => {
    const trigger = buttonRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const width = Math.min(WIDTH, window.innerWidth - MARGIN * 2);
    // Prefer left-aligned with the trigger; flip to right-aligned when that
    // would overflow, which is what happens to a picker in a card's header.
    const left =
      r.left + width + MARGIN > window.innerWidth
        ? Math.max(MARGIN, r.right - width)
        : Math.max(MARGIN, r.left);
    setPlacement({ top: r.bottom + GAP, left, width });
  }, []);

  const close = useCallback(() => {
    setPlacement(null);
    setLatched(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    // Fixed coordinates go stale the moment anything scrolls, and these live
    // inside scrollers — capture catches those too, not just the window.
    function onScrollOrResize() {
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

    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, position, close]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`About ${label}`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => {
          if (latched) {
            close();
            return;
          }
          setLatched(true);
          position();
        }}
        onPointerEnter={(e) => e.pointerType === "mouse" && position()}
        onPointerLeave={(e) => e.pointerType === "mouse" && !latched && setPlacement(null)}
        onFocus={position}
        onBlur={() => !latched && setPlacement(null)}
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[var(--border)] align-middle text-[10px] font-semibold leading-none text-ink-muted transition-colors hover:border-[var(--border-strong)] hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        i
      </button>

      {placement &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            id={id}
            role="tooltip"
            style={{ top: placement.top, left: placement.left, width: placement.width }}
            // whitespace-normal is not redundant: the spec table's row headers
            // set whitespace-nowrap, and a panel that inherited it ran off as
            // one unbroken line. Portalling escapes that today, but the panel
            // should not depend on where it happens to be mounted.
            className="card fixed z-50 whitespace-normal p-2.5 text-left shadow-lg"
          >
            {title && <p className="text-xs font-semibold text-ink">{title}</p>}
            <p className="mt-0.5 text-xs leading-relaxed text-ink-secondary">{body}</p>
            {source && (
              <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">Source: {source}</p>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
