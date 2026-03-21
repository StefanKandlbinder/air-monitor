import { useCallback } from "react";

/**
 * Returns stable `get`, `set`, `has`, and `remove` helpers for a single
 * localStorage key. No state is managed — callers read/write explicitly,
 * which avoids unnecessary re-renders when the value is only needed inside
 * effects or animation callbacks.
 *
 * All methods are SSR-safe: they return `defaultValue` / `false` when
 * `window` is not available.
 */
export function useLocalStorage<T>(key: string, defaultValue: T) {
  const get = useCallback((): T => {
    if (typeof window === "undefined") return defaultValue;
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  }, [key, defaultValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = useCallback((value: T): void => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key]);

  const has = useCallback((): boolean => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(key) !== null;
  }, [key]);

  const remove = useCallback((): void => {
    localStorage.removeItem(key);
  }, [key]);

  return { get, set, has, remove };
}
