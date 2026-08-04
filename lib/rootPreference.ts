"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A reader preference kept as a data attribute on `<html>` — the theme, and
 * which side the navigation sits on. The attribute is written before first
 * paint by the inline script in the layout, so there is no flash, and the CSS
 * keys off it directly.
 *
 * The attribute is therefore the single source of truth, and a component must
 * read it rather than hold a copy. Both toggles are rendered more than once —
 * the rail and the top bar each carry their own, and both are in the DOM at all
 * times with CSS showing one. A component that snapshotted the attribute into
 * state at mount went stale the moment any *other* instance changed it: the
 * copy that then became visible still held the old value, so its first click
 * recomputed the same value it was already on and appeared to do nothing. That
 * is the two-clicks-to-switch bug.
 *
 * Subscribing every instance to the attribute keeps them in step, whoever
 * changed it and however — including the pre-paint script and another tab.
 */
export function useRootPreference<T extends string>(
  attribute: string,
  storageKey: string,
  values: readonly T[],
  fallback: T
): [T, (next: T) => void] {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const observer = new MutationObserver(onChange);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: [attribute],
      });
      // Another tab writing the same key is the other way this can change
      // underneath a live page.
      const onStorage = (e: StorageEvent) => e.key === storageKey && onChange();
      window.addEventListener("storage", onStorage);
      return () => {
        observer.disconnect();
        window.removeEventListener("storage", onStorage);
      };
    },
    [attribute, storageKey]
  );

  const getSnapshot = useCallback((): T => {
    const current = document.documentElement.getAttribute(attribute);
    return values.includes(current as T) ? (current as T) : fallback;
  }, [attribute, values, fallback]);

  // The server has no DOM to read, so it renders the same default the layout
  // stamps on `<html>`; the first client render then reconciles to the real one.
  const getServerSnapshot = useCallback(() => fallback, [fallback]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const set = useCallback(
    (next: T) => {
      document.documentElement.setAttribute(attribute, next);
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        /* storage unavailable — the toggle still works for this session */
      }
    },
    [attribute, storageKey]
  );

  return [value, set];
}
