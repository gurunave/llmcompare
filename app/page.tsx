"use client";

import { ModelBrowser } from "@/components/ModelBrowser";
import { PageHeader } from "@/components/PageHeader";
import { ScatterPanel } from "@/components/charts/ScatterPanel";
import { MAX_SELECTION, MODELS } from "@/lib/models";
import { useSelection } from "@/lib/selection";

const PRESETS: { label: string; ids: string[] }[] = [
  { label: "Frontier three", ids: ["claude-opus-5", "gpt-5", "gemini-3-pro"] },
  { label: "Best value", ids: ["gemini-3-flash", "deepseek-v3-2", "grok-4-fast", "gpt-5-mini"] },
  { label: "Open weights", ids: ["deepseek-v3-2", "qwen3-235b", "kimi-k2", "gpt-oss-120b"] },
  { label: "Runs on a laptop", ids: ["qwen3-8b", "gemma-3-4b", "llama-3-1-8b", "phi-4-mini"] },
];

export default function BrowsePage() {
  const { ids, models, toggle, select } = useSelection();

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 lg:py-8">
      <PageHeader
        title="Browse models"
        lead={`${MODELS.length} language models from ${new Set(MODELS.map((m) => m.provider)).size} providers. Select up to ${MAX_SELECTION}, then head to Compare.`}
      />

      {models.length === 0 && (
        <section className="card p-4 sm:p-5">
          <h2 className="text-base font-semibold text-ink">Start from a preset</h2>
          <p className="mt-0.5 text-sm text-ink-secondary">
            Or pick your own from the table below.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="chip hover:border-[var(--border-strong)]"
                onClick={() => select(p.ids)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <ScatterPanel all={MODELS} selected={models} />

      <ModelBrowser selected={ids} onToggle={toggle} />
    </main>
  );
}
