"use client";

import { usePathname } from "next/navigation";
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
  /** Ids currently toggled off in the charts. Always a subset of `ids`. */
  hidden: Set<string>;
  /** The selection minus whatever is toggled off — what the charts draw. */
  visible: DerivedModel[];
  toggle: (id: string) => void;
  select: (ids: string[]) => void;
  clear: () => void;
  /** Show or hide one series in the charts; the model stays selected either way. */
  toggleVisible: (id: string) => void;
  /** Hide everything else — or, if this is already the only one shown, show all. */
  solo: (id: string) => void;
  showAll: () => void;
  /** Move a model up or down the selection, which reassigns colors and badges. */
  move: (id: string, dir: -1 | 1) => void;
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

interface Stored {
  ids: string[];
  hidden: string[];
}

function readInitial(): Stored | null {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("m");
  if (fromUrl) {
    const ids = sanitize(fromUrl.split(","));
    if (ids.length) {
      const hide = params.get("hide");
      return { ids, hidden: hide ? hide.split(",").filter((id) => ids.includes(id)) : [] };
    }
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      // Older builds stored a bare id array; both shapes have to keep working.
      const parsed = JSON.parse(stored);
      const raw = Array.isArray(parsed) ? parsed : parsed?.ids;
      const ids = sanitize(Array.isArray(raw) ? raw : []);
      if (ids.length) {
        const hiddenRaw: unknown = Array.isArray(parsed?.hidden) ? parsed.hidden : [];
        const hidden = (hiddenRaw as string[]).filter((id) => ids.includes(id));
        return { ids, hidden };
      }
    }
  } catch {
    /* unparseable or unavailable storage falls through to the default */
  }
  return null;
}

/**
 * The selection is shared by every route. A ?m= query wins on load so shared
 * links always show what the sender saw — including which series they had
 * toggled off, carried in ?hide= — otherwise the last visit is restored. Both
 * the URL and localStorage are kept in sync afterwards.
 */
export function SelectionProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>(DEFAULT_SELECTION);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  // In-app links carry ?m= but not ?hide=, so the sync has to re-run on every
  // route change or a link copied after navigating would lose what was hidden.
  const pathname = usePathname();

  useEffect(() => {
    const initial = readInitial();
    if (initial) {
      setIds(initial.ids);
      setHiddenIds(initial.hidden);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    // Built by hand rather than with URLSearchParams, which percent-encodes the
    // commas — legal, but it makes a shared link far uglier than it needs to be.
    const parts = ids.length ? [`m=${ids.join(",")}`] : [];
    if (ids.length && hiddenIds.length) parts.push(`hide=${hiddenIds.join(",")}`);
    // Anything the selection does not own — the hardware page's rig and context,
    // say — rides along untouched, or this replaceState would drop it.
    const existing = new URLSearchParams(window.location.search);
    existing.forEach((value, key) => {
      if (key !== "m" && key !== "hide") parts.push(`${key}=${value}`);
    });
    const query = parts.length ? `?${parts.join("&")}` : "";
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query}${window.location.hash}`
    );

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ids, hidden: hiddenIds }));
    } catch {
      /* storage unavailable — the URL still carries the selection */
    }
  }, [ids, hiddenIds, hydrated, pathname]);

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SELECTION) return prev;
      return [...prev, id];
    });
    // A model that leaves the selection must not come back still hidden.
    setHiddenIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const select = useCallback((next: string[]) => {
    const clean = sanitize(next);
    setIds(clean);
    setHiddenIds((prev) => prev.filter((id) => clean.includes(id)));
  }, []);

  const clear = useCallback(() => {
    setIds([]);
    setHiddenIds([]);
  }, []);

  const toggleVisible = useCallback((id: string) => {
    setHiddenIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const solo = useCallback(
    (id: string) => {
      setHiddenIds((prev) => {
        const alreadySolo = !prev.includes(id) && prev.length === ids.length - 1;
        return alreadySolo ? [] : ids.filter((x) => x !== id);
      });
    },
    [ids]
  );

  const showAll = useCallback(() => setHiddenIds([]), []);

  const move = useCallback((id: string, dir: -1 | 1) => {
    setIds((prev) => {
      const from = prev.indexOf(id);
      const to = from + dir;
      if (from < 0 || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }, []);

  const value = useMemo<SelectionValue>(() => {
    const models = ids
      .map((id) => MODELS_BY_ID.get(id))
      .filter((m): m is DerivedModel => Boolean(m));
    const hidden = new Set(hiddenIds);
    return {
      ids,
      models,
      hidden,
      visible: models.filter((m) => !hidden.has(m.id)),
      toggle,
      select,
      clear,
      toggleVisible,
      solo,
      showAll,
      move,
      isFull: ids.length >= MAX_SELECTION,
    };
  }, [ids, hiddenIds, toggle, select, clear, toggleVisible, solo, showAll, move]);

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
