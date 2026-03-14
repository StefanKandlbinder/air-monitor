"use client";

import { useQuery } from "@tanstack/react-query";
import type { OpenAQLatestResult } from "@/lib/types";
import { assertResponseOk } from "@/lib/fetch-error";

type LatestResponse = {
  locationId: number;
  latest: OpenAQLatestResult[];
};

export function useLatestQuery(locationId: number | null) {
  return useQuery({
    queryKey: ["latest", locationId],
    enabled: !!locationId,
    queryFn: async () => {
      const params = new URLSearchParams({ locationId: String(locationId) });
      const res = await fetch(`/api/latest?${params.toString()}`);
      await assertResponseOk(res);
      return (await res.json()) as LatestResponse;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
