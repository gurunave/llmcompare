"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CUSTOM_ID, DEVICES, DEVICE_BY_ID, DEVICE_GROUPS } from "@/lib/hardware";

interface Option {
  id: string;
  label: string;
  /** Memory and bandwidth, the two numbers that decide between two cards. */
  hint: string;
  /** Name and group, matched as substrings — "4090" finds the RTX 4090. */
  text: string;
  /**
   * Memory, bandwidth and device count, matched only as whole numbers: "96"
   * should mean a 96 GB card, not every card whose bandwidth happens to read
   * 896 or 960.
   */
  nums: string[];
  /** The note. Searched for words, never for digits: half the notes quote a
      number ("496 GB of LPDDR5X") that would answer a query about a card size
      with a card that is nothing like it. */
  prose: string;
}

interface OptionGroup {
  group: string;
  options: Option[];
}

/**
 * Both sides of the match are normalized the same way: "2 × RTX 4090" is
 * searchable as "2 x rtx 4090", so a keyboard that cannot type × still finds it.
 */
function normalize(s: string): string {
  return s.toLowerCase().replace(/×/g, "x");
}

const ALL_GROUPS: OptionGroup[] = [
  ...DEVICE_GROUPS.map((g) => ({
    group: g.group,
    options: g.devices.map((d) => ({
      id: d.id,
      label: d.label,
      // Device count is already in the labels that have one ("8 × H100"),
      // and the room it took was coming out of the name.
      hint: `${d.memoryGB} GB · ${d.bandwidthGBs} GB/s`,
      text: normalize(`${d.label} ${g.group}`),
      nums: [String(d.memoryGB), String(d.bandwidthGBs), String(d.devices)],
      prose: normalize(d.note ?? ""),
    })),
  })),
  {
    group: "Something else",
    options: [
      {
        id: CUSTOM_ID,
        label: "Custom…",
        hint: "Enter your own memory and bandwidth",
        text: "custom something else own rig",
        nums: [],
        prose: "",
      },
    ],
  },
];

const DIGITS = /^\d+$/;

/** Every token has to land somewhere, so "dgx 8" narrows rather than widens. */
function filterGroups(query: string): OptionGroup[] {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return ALL_GROUPS;

  const hit = (o: Option, t: string) =>
    o.text.includes(t) ||
    (DIGITS.test(t) ? o.nums.includes(t) : o.prose.includes(t));

  return ALL_GROUPS.map((g) => ({
    group: g.group,
    options: g.options.filter((o) => tokens.every((t) => hit(o, t))),
  })).filter((g) => g.options.length > 0);
}

export function labelForDevice(id: string): string {
  if (id === CUSTOM_ID) return "Custom…";
  const d = DEVICE_BY_ID.get(id);
  return d ? `${d.label} — ${d.memoryGB} GB` : "Select hardware";
}

/**
 * A combobox rather than a native select: at 80-odd devices the native list is
 * a scroll to the bottom of a rack, and typing "dgx" or "48" should be the way
 * there. Everything the native control gave us is kept by hand — the groups,
 * full keyboard control, and a listbox a screen reader can announce.
 */
export function DeviceSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(value);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const baseId = useId();
  const listId = `${baseId}-listbox`;
  const optionId = (id: string) => `${baseId}-opt-${id}`;

  const groups = useMemo(() => filterGroups(query), [query]);
  const flat = useMemo(() => groups.flatMap((g) => g.options), [groups]);

  // The active option has to stay on something that exists: every keystroke
  // reshapes the list under it.
  useEffect(() => {
    if (!open) return;
    if (!flat.some((o) => o.id === activeId)) setActiveId(flat[0]?.id ?? "");
  }, [open, flat, activeId]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open || !activeId) return;
    listRef.current
      ?.querySelector(`[data-oid="${CSS.escape(activeId)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeId]);

  // Anything outside closes it — including a tap on the page behind, which is
  // the only way out on a touch screen with no Escape key.
  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  function openList() {
    setQuery("");
    setActiveId(value);
    setOpen(true);
  }

  function close({ refocus }: { refocus: boolean }) {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }

  function commit(id: string) {
    onChange(id);
    close({ refocus: true });
  }

  function step(delta: number) {
    if (!flat.length) return;
    const at = flat.findIndex((o) => o.id === activeId);
    const next = (at + delta + flat.length) % flat.length;
    setActiveId(flat[next].id);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        step(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        step(-1);
        break;
      case "Home":
        e.preventDefault();
        if (flat.length) setActiveId(flat[0].id);
        break;
      case "End":
        e.preventDefault();
        if (flat.length) setActiveId(flat[flat.length - 1].id);
        break;
      case "Enter":
        e.preventDefault();
        if (activeId) commit(activeId);
        break;
      case "Escape":
        e.preventDefault();
        close({ refocus: true });
        break;
      case "Tab":
        close({ refocus: false });
        break;
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Hardware"
        onClick={() => (open ? close({ refocus: false }) : openList())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openList();
          }
        }}
        className="field flex w-auto max-w-full items-center gap-2 py-1.5 text-left"
      >
        <span className="truncate">{labelForDevice(value)}</span>
        <Chevron />
      </button>

      {open && (
        <div className="absolute left-0 z-40 mt-1 w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-hairline bg-surface shadow-lg">
          <div className="border-b border-hairline p-2">
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={activeId ? optionId(activeId) : undefined}
              aria-autocomplete="list"
              aria-label="Search hardware"
              placeholder={`Search ${DEVICES.length} devices…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              className="field py-1.5 text-sm"
            />
          </div>

          <ul ref={listRef} id={listId} role="listbox" className="max-h-72 overflow-y-auto p-1">
            {groups.map((g) => (
              <li key={g.group} role="presentation">
                <div role="group" aria-label={g.group}>
                  <div
                    aria-hidden
                    className="px-2 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-ink-muted"
                  >
                    {g.group}
                  </div>
                  {g.options.map((o) => {
                    const selected = o.id === value;
                    const active = o.id === activeId;
                    return (
                      <div
                        key={o.id}
                        id={optionId(o.id)}
                        data-oid={o.id}
                        role="option"
                        aria-selected={selected}
                        onClick={() => commit(o.id)}
                        onPointerMove={() => setActiveId(o.id)}
                        className={`flex cursor-pointer items-baseline gap-2 rounded-md px-2 py-1.5 text-sm ${
                          active ? "bg-[var(--wash)]" : ""
                        }`}
                      >
                        {/* The check marks the current pick, the wash marks the
                            one the keyboard is on — two states, two channels. */}
                        <span aria-hidden className="w-3 shrink-0 text-xs text-ink-muted">
                          {selected ? "✓" : ""}
                        </span>
                        <span className={`min-w-0 flex-1 truncate ${selected ? "font-medium text-ink" : "text-ink-secondary"}`}>
                          {o.label}
                        </span>
                        <span className="num shrink-0 text-xs text-ink-muted">{o.hint}</span>
                      </div>
                    );
                  })}
                </div>
              </li>
            ))}

            {!flat.length && (
              <li role="presentation" className="px-2 py-6 text-center text-sm text-ink-secondary">
                Nothing matches “{query.trim()}”.
                <button
                  type="button"
                  onClick={() => commit(CUSTOM_ID)}
                  className="mt-2 block w-full text-xs text-ink-muted underline underline-offset-2 hover:text-ink"
                >
                  Describe it yourself instead
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function Chevron() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="ml-auto shrink-0 text-ink-muted"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
