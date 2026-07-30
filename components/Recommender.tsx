"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { providerColor } from "@/lib/accent";
import { formatPrice, formatTokens } from "@/lib/format";
import { DEFAULT_ANSWERS, TASK_LABELS, recommend } from "@/lib/recommend";
import type { Answers, BudgetKey, ContextKey, DeployKey, SpeedKey, TaskKey } from "@/lib/recommend";

const BUDGETS: { key: BudgetKey; label: string }[] = [
  { key: "any", label: "Whatever it takes" },
  { key: "moderate", label: "Under $5 / 1M" },
  { key: "cheap", label: "Under $1 / 1M" },
];

const DEPLOYS: { key: DeployKey; label: string }[] = [
  { key: "any", label: "Any API" },
  { key: "open", label: "Open weights" },
  { key: "local", label: "Runs on my machine" },
];

const CONTEXTS: { key: ContextKey; label: string }[] = [
  { key: "any", label: "Standard" },
  { key: "long", label: "200K+" },
  { key: "huge", label: "1M+" },
];

const SPEEDS: { key: SpeedKey; label: string }[] = [
  { key: "any", label: "Doesn't matter" },
  { key: "fast", label: "Needs to be fast" },
];

export function Recommender({
  selected,
  onToggle,
  alwaysOpen = false,
}: {
  selected: string[];
  onToggle: (id: string) => void;
  /** On its own route the questionnaire is the content, so it never collapses. */
  alwaysOpen?: boolean;
}) {
  const [open, setOpen] = useState(alwaysOpen);
  const [answers, setAnswers] = useState<Answers>(DEFAULT_ANSWERS);
  const results = useMemo(() => recommend(answers), [answers]);

  function set<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  return (
    <section className="card p-4 sm:p-5">
      {!alwaysOpen && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-4 text-left"
        >
          <span>
            <span className="block text-base font-semibold text-ink">Not sure where to start?</span>
            <span className="mt-0.5 block text-sm text-ink-secondary">
              Answer four questions and I&apos;ll shortlist the models that fit.
            </span>
          </span>
          <span aria-hidden className="text-ink-muted">
            {open ? "▲" : "▼"}
          </span>
        </button>
      )}

      {open && (
        <div className={`space-y-4 ${alwaysOpen ? "" : "mt-5"}`}>
          <Question label="What are you mostly doing?">
            {(Object.keys(TASK_LABELS) as TaskKey[]).map((k) => (
              <Choice key={k} active={answers.task === k} onClick={() => set("task", k)}>
                {TASK_LABELS[k]}
              </Choice>
            ))}
          </Question>

          <Question label="Budget per million tokens?">
            {BUDGETS.map((b) => (
              <Choice key={b.key} active={answers.budget === b.key} onClick={() => set("budget", b.key)}>
                {b.label}
              </Choice>
            ))}
          </Question>

          <Question label="Where does it need to run?">
            {DEPLOYS.map((d) => (
              <Choice key={d.key} active={answers.deploy === d.key} onClick={() => set("deploy", d.key)}>
                {d.label}
              </Choice>
            ))}
          </Question>

          <Question label="Context window and latency?">
            {CONTEXTS.map((c) => (
              <Choice key={c.key} active={answers.context === c.key} onClick={() => set("context", c.key)}>
                {c.label}
              </Choice>
            ))}
            <span className="mx-1 h-5 w-px bg-hairline" aria-hidden />
            {SPEEDS.map((s) => (
              <Choice key={s.key} active={answers.latency === s.key} onClick={() => set("latency", s.key)}>
                {s.label}
              </Choice>
            ))}
          </Question>

          <div className="border-t border-hairline pt-4">
            {results.length === 0 ? (
              <p className="text-sm text-ink-secondary">
                Nothing in the catalog satisfies all four constraints at once — try loosening the
                budget or the context requirement.
              </p>
            ) : (
              <ol className="space-y-2">
                {results.map((r, i) => {
                  const isSelected = selected.includes(r.model.id);
                  return (
                    <li
                      key={r.model.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-hairline px-3 py-2.5"
                      style={
                        i === 0
                          ? {
                              borderColor: "var(--accent)",
                              background: "var(--accent-wash)",
                            }
                          : undefined
                      }
                    >
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                          <span
                            className={`num inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                              i === 0 ? "bg-accent text-white" : "bg-[var(--wash)] text-ink-secondary"
                            }`}
                            aria-hidden
                          >
                            {i + 1}
                          </span>
                          {r.model.name}
                          <span
                            className="badge"
                            style={
                              { "--tint": providerColor(r.model.provider) } as CSSProperties
                            }
                          >
                            <span className="dot" aria-hidden />
                            {r.model.provider}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-ink-secondary">{r.reasons.join(" · ")}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="num hidden text-xs text-ink-muted sm:inline">
                          {formatPrice(r.model.blendedPrice)}/1M · {formatTokens(r.model.context)} ctx
                        </span>
                        <button
                          type="button"
                          className="btn py-1.5 text-xs"
                          onClick={() => onToggle(r.model.id)}
                        >
                          {isSelected ? "Remove" : "Compare"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Question({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-ink">{label}</legend>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </fieldset>
  );
}

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`chip ${active ? "chip-active" : "hover:border-[var(--border-strong)]"}`}
    >
      {children}
    </button>
  );
}
