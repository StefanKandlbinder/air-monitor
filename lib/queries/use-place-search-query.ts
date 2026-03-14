"use client";

import { useQuery } from "@tanstack/react-query";
import type { NominatimResult } from "@/lib/types";
import { assertResponseOk } from "@/lib/fetch-error";

export type { NominatimResult };

async function searchPlaces(query: string, limit = 6): Promise<NominatimResult[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const res = await fetch(`/api/places?${params.toString()}`);
  await assertResponseOk(res);
  const data = (await res.json()) as { results: NominatimResult[] };
  return data.results;
}

export function usePlaceSearchQuery(query: string) {
  return useQuery({
    queryKey: ["nominatim", query],
    enabled: query.trim().length >= 2,
    queryFn: () => searchPlaces(query),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
}
