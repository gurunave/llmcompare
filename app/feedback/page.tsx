"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";

const FEEDBACK_EMAIL = "naveen.kumar@elmeasure.com";

const CATEGORIES = [
  { key: "bug", label: "Bug report" },
  { key: "feature", label: "Feature request" },
  { key: "data", label: "Data correction" },
  { key: "general", label: "General feedback" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

export default function FeedbackPage() {
  const [category, setCategory] = useState<CategoryKey>("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const categoryLabel = CATEGORIES.find((c) => c.key === category)?.label ?? "General feedback";
  const canSend = message.trim().length > 0;

  function openEmail() {
    const subjectLine = `[LLM Compare] [${categoryLabel}] ${subject.trim() || categoryLabel}`;
    const bodyLines = [
      message.trim(),
      "",
      "—",
      `From: ${name.trim() || "Anonymous"}${email.trim() ? ` <${email.trim()}>` : ""}`,
      `Page: ${window.location.href}`,
    ];
    const href = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
    window.location.href = href;
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 lg:py-8">
      <PageHeader
        title="Feedback"
        lead={`Spot a wrong number, want a model added, or have an idea for the site? This opens your own email app with the message filled in and addressed to ${FEEDBACK_EMAIL} — nothing is sent from here.`}
      />

      <section className="card card-accent space-y-4 p-4 sm:p-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Category</label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                aria-pressed={category === c.key}
                onClick={() => setCategory(c.key)}
                className={`chip ${category === c.key ? "chip-active" : "hover:border-[var(--border-strong)]"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="fb-subject" className="mb-1.5 block text-sm font-medium text-ink">
            Subject <span className="font-normal text-ink-muted">(optional — makes it easier to filter later)</span>
          </label>
          <input
            id="fb-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={categoryLabel}
            className="field"
          />
        </div>

        <div>
          <label htmlFor="fb-message" className="mb-1.5 block text-sm font-medium text-ink">
            Message
          </label>
          <textarea
            id="fb-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            placeholder="What's wrong, missing, or could be better?"
            className="field"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="fb-name" className="mb-1.5 block text-sm font-medium text-ink">
              Your name <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              id="fb-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="fb-email" className="mb-1.5 block text-sm font-medium text-ink">
              Your email <span className="font-normal text-ink-muted">(optional, for a reply)</span>
            </label>
            <input
              id="fb-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
            />
          </div>
        </div>

        <div>
          <button type="button" disabled={!canSend} onClick={openEmail} className="btn btn-primary">
            Open email to send
          </button>
          <p className="mt-2 text-xs text-ink-muted">
            The subject is tagged with the category — {"“"}[{categoryLabel}]{"”"} — so incoming
            feedback can be filtered by a mail rule.
          </p>
        </div>
      </section>
    </main>
  );
}
