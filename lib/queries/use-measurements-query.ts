"use client";

import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import type { MeasurementsResponse, Rollup } from "@/lib/types";
import { assertResponseOk } from "@/lib/fetch-error";

type DateRange = {
  dateFrom: string;
  dateTo: string;
};

const RATE_LIMIT_RETRY = (failureCount: number, error: unknown) => {
  if (error instanceof Error && error.message === "openaq.rateLimited") {
    return failureCount < 4;
  }
  return failureCount < 1;
};

const RATE_LIMIT_DELAY = (failureCount: number) =>
  Math.min(2000 * 2 ** failureCount, 30000);

async function fetchMeasurements(
  locationId: number,
  rollup: Rollup,
  dateFrom: string
): Promise<MeasurementsResponse> {
  const params = new URLSearchParams({ locationId: String(locationId), rollup, dateFrom });
  const res = await fetch(`/api/measurements?${params.toString()}`);
  await assertResponseOk(res);
  return res.json() as Promise<MeasurementsResponse>;
}

export function useMeasurementsQuery(
  locationId: number | null,
  rollup: Rollup,
  dateRange: DateRange | null
) {
  return useQuery({
    queryKey: ["measurements", locationId, rollup, dateRange?.dateFrom ?? null],
    enabled: !!locationId && !!dateRange,
    staleTime: 1000 * 60 * 5,
    retry: RATE_LIMIT_RETRY,
    retryDelay: RATE_LIMIT_DELAY,
    queryFn: () => {
      if (!locationId || !dateRange) throw new Error("Missing locationId or dateRange");
      return fetchMeasurements(locationId, rollup, dateRange.dateFrom);
    },
  });
}

export function useSparklineMeasurementsQuery(locationId: number | null) {
  return useQuery({
    queryKey: ["measurements", locationId, "hours", "sparkline-7d"],
    enabled: !!locationId,
    staleTime: 1000 * 60 * 60,
    queryFn: () => {
      if (!locationId) throw new Error("Missing locationId");
      return fetchMeasurements(locationId, "hours", dayjs().subtract(7, "day").toISOString());
    },
  });
}
