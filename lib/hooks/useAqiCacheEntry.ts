"use client";

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

type AqiCacheEntry = {
  colors: Record<number, string>;
  aqiValues: Record<number, number>;
  latestValues: Record<number, Record<string, { value: number; units: string }>>;
  subIndices?: Record<number, Record<string, number>>;
};

function buildEntry(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: readonly unknown[],
  data: AqiCacheEntry,
  locationId: number,
) {
  return {
    result: {
      color: data.colors[locationId],
      aqiValue: data.aqiValues?.[locationId] ?? null,
      latestValues: data.latestValues?.[locationId] ?? {},
      subIndices: data.subIndices?.[locationId] ?? {},
    },
    allColors: data.colors,
    updatedAt: queryClient.getQueryState(queryKey)?.dataUpdatedAt,
  };
}

export function useAqiCacheEntry(locationId: number) {
  const queryClient = useQueryClient();

  return useMemo(() => {
    // Check the standalone "aqi" cache
    const aqiMatch = queryClient
      .getQueriesData<AqiCacheEntry>({ queryKey: ["aqi"] })
      .find(([, d]) => d?.colors?.[locationId] !== undefined);
    if (aqiMatch) {
      return buildEntry(queryClient, aqiMatch[0], aqiMatch[1]!, locationId);
    }

    // Check the "map-data" cache (explore page stores { locations, aqi: AqiCacheEntry })
    const mapDataMatch = queryClient
      .getQueriesData<{ locations: unknown[]; aqi: AqiCacheEntry }>({ queryKey: ["map-data"] })
      .find(([, d]) => d?.aqi?.colors?.[locationId] !== undefined);
    if (mapDataMatch) {
      return buildEntry(queryClient, mapDataMatch[0], mapDataMatch[1]!.aqi, locationId);
    }

    return null;
  }, [queryClient, locationId]);
}
