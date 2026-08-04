"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * The "what is this benchmark" affordance next to a picker or a row label.
 *
 * Opens on hover for a mouse and on click for everything else, because the
 * benchmark names are the least self-explanatory strings in the app and a
 * touch user has no hover to fall back on. Click also latches it open, so the
 * text can be read without holding the pointer still.
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
  const [open, setOpen] = useState(false);
  const [latched, setLatched] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!latched) return;

    function onDown(e: PointerEvent) {
      if (rootRef.current?.contains(e.target as Node)) return;
      setLatched(false);
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setLatched(false);
      setOpen(false);
      buttonRef.current?.focus();
    }

    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [latched]);

  return (
    <span ref={rootRef} className="relative inline-flex align-middle">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`About ${label}`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => {
          setLatched((l) => !l);
          setOpen((o) => !o || !latched);
        }}
        onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && !latched && setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => !latched && setOpen(false)}
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[10px] font-semibold leading-none text-ink-muted transition-colors hover:border-[var(--border-strong)] hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        i
      </button>

      {open && (
        <span
          id={id}
          role="tooltip"
          // Left-anchored and clamped to the viewport: these sit inside charts
          // and tables that scroll sideways, where a centered popover would end
          // up half off-screen.
          className="card absolute left-0 top-[calc(100%+6px)] z-30 w-[min(17rem,calc(100vw-2rem))] p-2.5 text-left shadow-lg"
        >
          {title && <span className="block text-xs font-semibold text-ink">{title}</span>}
          <span className="mt-0.5 block text-xs leading-relaxed text-ink-secondary">{body}</span>
          {source && (
            <span className="mt-1.5 block text-[11px] leading-relaxed text-ink-muted">
              Source: {source}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
