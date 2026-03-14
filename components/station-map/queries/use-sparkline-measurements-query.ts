"use client";

import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import type { OpenAQMeasurement } from "@/lib/types";

type MeasurementsResponse = {
  measurements: OpenAQMeasurement[];
};

export function useSparklineMeasurementsQuery(locationId: number | null) {
  return useQuery({
    queryKey: ["measurements", locationId, "hours", "sparkline-7d"],
    enabled: !!locationId,
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      if (!locationId) throw new Error("Missing locationId");

      const dateFrom = dayjs().subtract(7, "day").toISOString();
      const searchParams = new URLSearchParams({
        locationId: String(locationId),
        rollup: "hours",
        dateFrom,
      });

      const response = await fetch(`/api/measurements?${searchParams.toString()}`);
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Could not load sparkline measurements");
      }

      return (await response.json()) as MeasurementsResponse;
    },
  });
}
