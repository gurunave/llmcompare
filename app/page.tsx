"use client";

import type { CSSProperties } from "react";
import { ModelBrowser } from "@/components/ModelBrowser";
import { PageHeader } from "@/components/PageHeader";
import { ScatterPanel } from "@/components/charts/ScatterPanel";
import { MAX_SELECTION, MODELS } from "@/lib/models";
import { useSelection } from "@/lib/selection";

const PRESETS: { label: string; tint: string; ids: string[] }[] = [
  {
    label: "Frontier three",
    tint: "var(--series-1)",
    ids: ["claude-opus-5", "gpt-5", "gemini-3-pro"],
  },
  {
    label: "Best value",
    tint: "var(--series-3)",
    ids: ["gemini-3-flash", "deepseek-v3-2", "grok-4-fast", "gpt-5-mini"],
  },
  {
    label: "Open weights",
    tint: "var(--series-4)",
    ids: ["deepseek-v3-2", "qwen3-235b", "kimi-k2-thinking", "glm-4-5-air"],
  },
  {
    label: "Runs on a laptop",
    tint: "var(--series-2)",
    ids: ["qwen3-4b", "gemma-3-4b", "nemotron-nano-9b", "granite-4-micro"],
  },
  {
    label: "Fully open training",
    tint: "var(--series-7)",
    ids: ["olmo-3-32b", "smollm3-3b", "apertus-70b", "olmo-3-7b"],
  },
];

export default function BrowsePage() {
  const { ids, models, hidden, toggle, select, toggleVisible, solo, showAll } = useSelection();

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 lg:py-8">
      <PageHeader
        title="Browse models"
        lead={`${MODELS.length} language models from ${new Set(MODELS.map((m) => m.provider)).size} providers. Select up to ${MAX_SELECTION}, then head to Compare.`}
      />

      {models.length === 0 && (
        <section className="card card-accent p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-ink">Start from a preset</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Or pick your own from the table below.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="chip text-ink hover:brightness-110"
                style={
                  {
                    "--tint": p.tint,
                    background: `color-mix(in srgb, ${p.tint} 14%, transparent)`,
                    borderColor: `color-mix(in srgb, ${p.tint} 45%, transparent)`,
                  } as CSSProperties
                }
                onClick={() => select(p.ids)}
              >
                <span className="dot" aria-hidden />
                {p.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <ScatterPanel
        all={MODELS}
        selected={models}
        hidden={hidden}
        onToggle={toggleVisible}
        onSolo={solo}
        onShowAll={showAll}
      />

      <ModelBrowser selected={ids} onToggle={toggle} />
    </main>
  );
}
