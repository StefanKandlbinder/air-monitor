"use client";

import { useQuery } from "@tanstack/react-query";
import type { OpenAQLocation } from "@/lib/types";
import { assertResponseOk } from "@/lib/fetch-error";

const STALE_TIME = 1000 * 60 * 60 * 24 * 7; // 7 days

export function useLocationsQuery() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const res = await fetch("/api/stations");
      await assertResponseOk(res);
      const data = (await res.json()) as { locations: OpenAQLocation[] };
      return data.locations;
    },
    staleTime: STALE_TIME,
  });
}

export function useSingleLocationQuery(locationId: number, skip: boolean) {
  return useQuery({
    queryKey: ["location", locationId],
    enabled: !skip,
    queryFn: async () => {
      const res = await fetch(`/api/stations/${locationId}`);
      await assertResponseOk(res);
      const data = (await res.json()) as { location: OpenAQLocation | null };
      return data.location;
    },
    staleTime: STALE_TIME,
  });
}

export function useLocationSearchQuery(lat: number | null, lon: number | null) {
  return useQuery({
    queryKey: ["location-search", lat, lon],
    enabled: lat !== null && lon !== null,
    queryFn: async () => {
      const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
      const res = await fetch(`/api/search?${params.toString()}`);
      await assertResponseOk(res);
      const data = (await res.json()) as { locations: OpenAQLocation[] };
      return data.locations;
    },
    staleTime: STALE_TIME,
  });
}
