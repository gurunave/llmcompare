"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ModelBrowser } from "@/components/ModelBrowser";
import { Recommender } from "@/components/Recommender";
import { SelectionBar } from "@/components/SelectionBar";
import { SpecTable } from "@/components/SpecTable";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BenchmarkPanel } from "@/components/charts/BenchmarkPanel";
import { RadarPanel } from "@/components/charts/RadarPanel";
import { ScatterPanel } from "@/components/charts/ScatterPanel";
import { formatMonth } from "@/lib/format";
import { MAX_SELECTION, MODELS, MODELS_BY_ID, catalog } from "@/lib/models";

const DEFAULT_SELECTION = ["claude-opus-5", "gpt-5", "gemini-3-pro"];

const PRESETS: { label: string; ids: string[] }[] = [
  { label: "Frontier three", ids: ["claude-opus-5", "gpt-5", "gemini-3-pro"] },
  { label: "Best value", ids: ["gemini-3-flash", "deepseek-v3-2", "grok-4-fast", "gpt-5-mini"] },
  { label: "Open weights", ids: ["deepseek-v3-2", "qwen3-235b", "kimi-k2", "gpt-oss-120b"] },
  { label: "Runs on a laptop", ids: ["qwen3-8b", "gemma-3-4b", "llama-3-1-8b", "phi-4-mini"] },
];

function readSelectionFromUrl(): string[] | null {
  const raw = new URLSearchParams(window.location.search).get("m");
  if (!raw) return null;
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter((id) => MODELS_BY_ID.has(id))
    .slice(0, MAX_SELECTION);
  return ids.length ? ids : null;
}

export default function Page() {
  const [selected, setSelected] = useState<string[]>(DEFAULT_SELECTION);
  const [hydrated, setHydrated] = useState(false);

  // The URL is the shareable state. Read it once on mount, then keep it in sync.
  useEffect(() => {
    const fromUrl = readSelectionFromUrl();
    if (fromUrl) setSelected(fromUrl);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const url = new URL(window.location.href);
    if (selected.length) url.searchParams.set("m", selected.join(","));
    else url.searchParams.delete("m");
    window.history.replaceState(null, "", url);
  }, [selected, hydrated]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SELECTION) return prev;
      return [...prev, id];
    });
  }, []);

  const models = useMemo(
    () => selected.map((id) => MODELS_BY_ID.get(id)).filter((m): m is NonNullable<typeof m> => !!m),
    [selected]
  );

  return (
    <div className="min-h-screen">
      <header className="mx-auto max-w-6xl px-4 pb-4 pt-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              LLM Compare
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-ink-secondary">
              {MODELS.length} language models from {new Set(MODELS.map((m) => m.provider)).size}{" "}
              providers — capability, price, speed and context, side by side.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <SelectionBar
        models={models}
        onRemove={toggle}
        onClear={() => setSelected([])}
      />

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <Recommender selected={selected} onToggle={toggle} />

        {models.length === 0 && (
          <section className="card p-4 sm:p-5">
            <h2 className="text-base font-semibold text-ink">Nothing selected</h2>
            <p className="mt-0.5 text-sm text-ink-secondary">
              Pick models in the table below, or start from a preset.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="chip hover:border-[var(--border-strong)]"
                  onClick={() => setSelected(p.ids.slice(0, MAX_SELECTION))}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {models.length > 0 && <RadarPanel models={models} />}
          <div className={models.length > 0 ? "" : "lg:col-span-2"}>
            <ScatterPanel all={MODELS} selected={models} />
          </div>
        </div>

        {models.length > 0 && (
          <>
            <BenchmarkPanel selected={models} />
            <SpecTable models={models} />
          </>
        )}

        <ModelBrowser selected={selected} onToggle={toggle} />

        <footer className="card p-4 text-xs leading-relaxed text-ink-muted sm:p-5">
          <p>
            <strong className="text-ink-secondary">Data last reviewed:</strong>{" "}
            {formatMonth(catalog.meta.lastReviewed.slice(0, 7))}. {catalog.meta.disclaimer}
          </p>
          <p className="mt-2">
            Edit <code className="text-ink-secondary">data/models.json</code> to correct a figure or
            add a model — the charts, filters and normalization all derive from that file.
          </p>
        </footer>
      </main>
    </div>
  );
}
