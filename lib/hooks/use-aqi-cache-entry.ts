"use client";

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

type AqiCacheEntry = {
  colors: Record<number, string>;
  aqiValues: Record<number, number>;
  latestValues: Record<number, Record<string, { value: number; units: string }>>;
  subIndices?: Record<number, Record<string, number>>;
};

export function useAqiCacheEntry(locationId: number) {
  const queryClient = useQueryClient();

  return useMemo(() => {
    const match = queryClient
      .getQueriesData<AqiCacheEntry>({ queryKey: ["aqi"] })
      .find(([, d]) => d?.colors?.[locationId] !== undefined);
    if (!match) return null;
    const [queryKey, data] = match;
    return {
      result: {
        color: data!.colors[locationId],
        aqiValue: data!.aqiValues?.[locationId] ?? null,
        latestValues: data!.latestValues?.[locationId] ?? {},
        subIndices: data!.subIndices?.[locationId] ?? {},
      },
      allColors: data!.colors,
      updatedAt: queryClient.getQueryState(queryKey)?.dataUpdatedAt,
    };
  }, [queryClient, locationId]);
}
