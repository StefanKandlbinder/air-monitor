"use client";

import { useQuery } from "@tanstack/react-query";
import type { NominatimResult } from "@/lib/types";
import { assertResponseOk } from "@/lib/fetch-error";

export type { NominatimResult };

async function searchPlaces(query: string, lang: string, limit = 6): Promise<NominatimResult[]> {
  const params = new URLSearchParams({ q: query, lang, limit: String(limit) });
  const res = await fetch(`/api/places?${params.toString()}`);
  await assertResponseOk(res);
  const data = (await res.json()) as { results: NominatimResult[] };
  return data.results;
}

export function usePlaceSearchQuery(query: string, lang: string) {
  return useQuery({
    queryKey: ["nominatim", lang, query],
    enabled: query.trim().length >= 2,
    queryFn: () => searchPlaces(query, lang),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
}
