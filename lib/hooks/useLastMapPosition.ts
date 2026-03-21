"use client";

import { useSyncExternalStore } from "react";

export const MAP_POSITION_EVENT = "map-position-change";

// Module-level singleton — one value shared across all component instances,
// initialized from sessionStorage so it survives hard refreshes on the explore page.
let _lastPosition: string | null =
  typeof window !== "undefined"
    ? sessionStorage.getItem("map-last-position")
    : null;

const listeners = new Set<() => void>();

export function saveMapPosition(params: string) {
  _lastPosition = params;
  sessionStorage.setItem("map-last-position", params);
  listeners.forEach((l) => l());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function useLastMapPosition(): string | null {
  return useSyncExternalStore(subscribe, () => _lastPosition, () => null);
}

export function useExploreHref(lang: string): string {
  const lastPosition = useLastMapPosition();
  return lastPosition ? `/${lang}/explore?${lastPosition}` : `/${lang}/explore`;
}
