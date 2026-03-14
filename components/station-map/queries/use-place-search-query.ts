"use client";

import { useQuery } from "@tanstack/react-query";
import type { NominatimResult } from "@/app/api/places/route";

async function searchPlaces(query: string, limit = 6): Promise<NominatimResult[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const res = await fetch(`/api/places?${params.toString()}`);
  if (!res.ok) throw new Error("Could not search places");
  const data = (await res.json()) as { results: NominatimResult[] };
  return data.results;
}

export type { NominatimResult };

export function usePlaceSearchQuery(query: string) {
  return useQuery({
    queryKey: ["nominatim", query],
    enabled: query.trim().length >= 2,
    queryFn: () => searchPlaces(query),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
}
