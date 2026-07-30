"use client";

import { useState } from "react";
import { MAX_SELECTION } from "@/lib/models";
import { seriesColor } from "@/lib/series";
import type { DerivedModel } from "@/lib/types";

export function SelectionBar({
  models,
  onRemove,
  onClear,
}: {
  models: DerivedModel[];
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the URL in the address bar is already shareable */
    }
  }

  return (
    <div className="sticky top-0 z-20 border-b border-hairline bg-plane/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
        <span className="text-sm text-ink-muted">
          {models.length === 0
            ? `Select up to ${MAX_SELECTION} models`
            : `${models.length} of ${MAX_SELECTION} selected`}
        </span>

        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {models.map((m, i) => (
            <span key={m.id} className="chip pr-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: seriesColor(i) }}
                aria-hidden
              />
              <span className="text-ink">{m.name}</span>
              <button
                type="button"
                onClick={() => onRemove(m.id)}
                aria-label={`Remove ${m.name} from the comparison`}
                className="ml-0.5 rounded px-1 text-ink-muted hover:text-ink"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {models.length > 0 && (
          <div className="ml-auto flex items-center gap-1.5">
            <button type="button" className="btn py-1.5 text-xs" onClick={share}>
              {copied ? "Link copied" : "Share"}
            </button>
            <button type="button" className="btn py-1.5 text-xs" onClick={onClear}>
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
