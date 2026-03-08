"use client";

import { useQuery } from "@tanstack/react-query";
import type { OpenAQMeasurement, Rollup } from "@/lib/types";

type DateRange = {
  dateFrom: string;
  dateTo: string;
};

type MeasurementsResponse = {
  locationId: number;
  rollup: Rollup;
  dateFrom: string;
  dateTo: string;
  measurements: OpenAQMeasurement[];
};

export function useMeasurementsQuery(
  locationId: number | null,
  rollup: Rollup,
  dateRange: DateRange | null
) {
  return useQuery({
    queryKey: [
      "measurements",
      locationId,
      rollup,
      dateRange?.dateFrom ?? null,
    ],
    enabled: !!locationId && !!dateRange,
    staleTime: 1000 * 60 * 5,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("429")) {
        return failureCount < 4;
      }
      return failureCount < 1;
    },
    retryDelay: (failureCount) => Math.min(2000 * 2 ** failureCount, 30000),
    queryFn: async () => {
      if (!locationId || !dateRange) {
        throw new Error("Missing locationId or dateRange");
      }

      const searchParams = new URLSearchParams({
        locationId: String(locationId),
        rollup,
        dateFrom: dateRange.dateFrom,
      });

      const response = await fetch(
        `/api/measurements?${searchParams.toString()}`
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Could not load measurements");
      }

      return (await response.json()) as MeasurementsResponse;
    },
  });
}
