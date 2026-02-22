"use client";

import { useQuery } from "@tanstack/react-query";
import type { MeanType } from "@/components/station-map/types";
import type { Measurement } from "@/lib/types";

type DateRange = {
  datvon: string;
  datbis: string;
};

type RangeMeasurementsResponse = {
  mean: MeanType;
  datvon: string;
  datbis: string;
  messwerte: Measurement[];
};

export function useRangeMeasurementsQuery(
  mean: MeanType,
  dateRange: DateRange | null,
) {
  return useQuery({
    queryKey: [
      "range-measurements",
      mean,
      dateRange?.datvon ?? null,
      dateRange?.datbis ?? null,
    ],
    enabled: !!dateRange,
    queryFn: async () => {
      if (!dateRange) {
        throw new Error("Missing date range");
      }

      const searchParams = new URLSearchParams({
        mean,
        datvon: dateRange.datvon,
        datbis: dateRange.datbis,
      });

      const response = await fetch(`/api/measurements?${searchParams.toString()}`);
      if (!response.ok) {
        throw new Error("Could not load range measurements");
      }

      return (await response.json()) as RangeMeasurementsResponse;
    },
  });
}
