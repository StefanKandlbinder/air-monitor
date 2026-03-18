"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { MapRef } from "react-map-gl/maplibre";

type MapCenter = { longitude: number; latitude: number; zoom: number };

function readMapCenterFromUrl(): MapCenter {
  if (typeof window === "undefined") {
    return { longitude: 14.2978, latitude: 48.3233, zoom: 12 };
  }
  const sp = new URLSearchParams(window.location.search);
  const lat = sp.get("lat");
  const lng = sp.get("lng");
  const zoom = sp.get("zoom");
  return {
    longitude: lng ? parseFloat(lng) : 14.2978,
    latitude: lat ? parseFloat(lat) : 48.3233,
    zoom: zoom ? parseFloat(zoom) : 12,
  };
}

function buildLocationParams(
  center: MapCenter,
  label?: string,
): string {
  const params: Record<string, string> = {
    lat: center.latitude.toFixed(4),
    lng: center.longitude.toFixed(4),
    zoom: center.zoom.toFixed(1),
  };
  if (label) params.label = label;
  return new URLSearchParams(params).toString();
}

export function useMapUrlState(
  mapRef: RefObject<MapRef | null>,
  onFetchAt: (lat: string, lng: string) => void,
) {
  const [mapCenter] = useState(readMapCenterFromUrl);
  const [searchLabel, setSearchLabel] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("label");
  });
  const popstateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On mount: if URL has lat/lng, fetch stations there
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const lat = sp.get("lat");
    const lng = sp.get("lng");
    if (lat && lng) onFetchAt(lat, lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Respond to browser back/forward
  useEffect(() => {
    const onPopState = () => {
      const sp = new URLSearchParams(window.location.search);
      const lat = sp.get("lat");
      const lng = sp.get("lng");
      const zoom = sp.get("zoom");
      const label = sp.get("label");
      setSearchLabel(label);
      if (lat && lng) {
        if (zoom) {
          mapRef.current?.flyTo({
            center: [parseFloat(lng), parseFloat(lat)],
            zoom: parseFloat(zoom),
            duration: 600,
          });
        }
        if (popstateDebounceRef.current) clearTimeout(popstateDebounceRef.current);
        popstateDebounceRef.current = setTimeout(() => onFetchAt(lat, lng), 150);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      if (popstateDebounceRef.current) clearTimeout(popstateDebounceRef.current);
    };
  }, [mapRef, onFetchAt]);

  const handleMoveEnd = (center: MapCenter) => {
    window.history.replaceState(
      null,
      "",
      `?${buildLocationParams(center, searchLabel ?? undefined)}`,
    );
  };

  const pushLocation = (center: MapCenter, label?: string) => {
    window.history.pushState(null, "", `?${buildLocationParams(center, label)}`);
  };

  return { mapCenter, searchLabel, setSearchLabel, handleMoveEnd, pushLocation };
}
