"use client";

import { useQuery } from "@tanstack/react-query";
import type { OpenAQLocation } from "@/lib/types";

const LOCATIONS_STALE_TIME = 1000 * 60 * 60 * 24 * 7;

export function useLocationsQuery() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const response = await fetch("/api/stations");
      if (!response.ok) throw new Error("Could not load stations");
      const data = (await response.json()) as { locations: OpenAQLocation[] };
      return data.locations;
    },
    staleTime: LOCATIONS_STALE_TIME,
  });
}

export function useSingleLocationQuery(locationId: number, skip: boolean) {
  return useQuery({
    queryKey: ["location", locationId],
    enabled: !skip,
    queryFn: async () => {
      const res = await fetch(`/api/stations/${locationId}`);
      if (!res.ok) throw new Error("Could not load station");
      const data = (await res.json()) as { location: OpenAQLocation | null };
      return data.location;
    },
    staleTime: LOCATIONS_STALE_TIME,
  });
}
