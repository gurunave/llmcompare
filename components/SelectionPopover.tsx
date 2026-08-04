"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SelectionTray } from "@/components/SelectionTray";
import { MAX_SELECTION } from "@/lib/models";
import { useSelection } from "@/lib/selection";

/**
 * The tray, in a panel, for the top-bar layout. The rail can afford to keep the
 * selection on screen at all times; a top bar cannot, and a row of ten chips
 * would have to drop the reordering and visibility controls to fit. So the
 * whole tray moves behind one button rather than being cut down to size.
 */
export function SelectionPopover() {
  const { models, hidden } = useSelection();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function onDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }

    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const hiddenCount = models.filter((m) => hidden.has(m.id)).length;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="btn py-1.5 text-sm"
      >
        Selection
        <span className="num text-xs text-ink-muted">
          {models.length}/{MAX_SELECTION}
        </span>
        {/* A count alone would not say that some of them are switched off in
            the charts, and that is not visible anywhere else in this layout. */}
        {hiddenCount > 0 && (
          <span className="num text-xs text-ink-muted" title={`${hiddenCount} hidden in charts`}>
            · {hiddenCount} hidden
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Selected models"
          className="absolute right-0 z-40 mt-1 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-hairline bg-surface p-3 shadow-lg"
        >
          <SelectionTray heading={false} />
        </div>
      )}
    </div>
  );
}
