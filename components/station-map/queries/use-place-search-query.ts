"use client";

import { useQuery } from "@tanstack/react-query";

export type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
};

async function searchPlaces(query: string, limit = 6): Promise<NominatimResult[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));
  const res = await fetch(url.toString(), { headers: { "Accept-Language": "en" } });
  return (await res.json()) as NominatimResult[];
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
