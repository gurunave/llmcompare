"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MAX_SELECTION, MODELS_BY_ID } from "./models";
import type { DerivedModel } from "./types";

const STORAGE_KEY = "llmcompare-selection";
const DEFAULT_SELECTION = ["claude-opus-5", "gpt-5", "gemini-3-pro"];

interface SelectionValue {
  ids: string[];
  models: DerivedModel[];
  toggle: (id: string) => void;
  select: (ids: string[]) => void;
  clear: () => void;
  isFull: boolean;
}

const SelectionContext = createContext<SelectionValue | null>(null);

function sanitize(ids: string[]): string[] {
  const seen = new Set<string>();
  return ids
    .map((s) => s.trim())
    .filter((id) => MODELS_BY_ID.has(id) && !seen.has(id) && seen.add(id))
    .slice(0, MAX_SELECTION);
}

function readInitial(): string[] | null {
  const fromUrl = new URLSearchParams(window.location.search).get("m");
  if (fromUrl) {
    const ids = sanitize(fromUrl.split(","));
    if (ids.length) return ids;
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const ids = sanitize(JSON.parse(stored));
      if (ids.length) return ids;
    }
  } catch {
    /* unparseable or unavailable storage falls through to the default */
  }
  return null;
}

/**
 * The selection is shared by every route. A ?m= query wins on load so shared
 * links always show what the sender saw; otherwise the last visit is restored.
 * Both the URL and localStorage are kept in sync afterwards.
 */
export function SelectionProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>(DEFAULT_SELECTION);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const initial = readInitial();
    if (initial) setIds(initial);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    // Built by hand rather than with URLSearchParams, which percent-encodes the
    // commas — legal, but it makes a shared link far uglier than it needs to be.
    const query = ids.length ? `?m=${ids.join(",")}` : "";
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query}${window.location.hash}`
    );

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      /* storage unavailable — the URL still carries the selection */
    }
  }, [ids, hydrated]);

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SELECTION) return prev;
      return [...prev, id];
    });
  }, []);

  const select = useCallback((next: string[]) => setIds(sanitize(next)), []);
  const clear = useCallback(() => setIds([]), []);

  const value = useMemo<SelectionValue>(
    () => ({
      ids,
      models: ids
        .map((id) => MODELS_BY_ID.get(id))
        .filter((m): m is DerivedModel => Boolean(m)),
      toggle,
      select,
      clear,
      isFull: ids.length >= MAX_SELECTION,
    }),
    [ids, toggle, select, clear]
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useSelection(): SelectionValue {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelection must be used inside SelectionProvider");
  return ctx;
}

/** Builds a link that carries the current selection to another route. */
export function withSelection(href: string, ids: string[]): string {
  return ids.length ? `${href}?m=${ids.join(",")}` : href;
}
