"use client";

import { useQuery } from "@tanstack/react-query";
import type { OpenAQCountry } from "@/lib/types";
import { assertResponseOk } from "@/lib/fetch-error";

export function useCountriesQuery() {
  return useQuery({
    queryKey: ["countries"],
    queryFn: async () => {
      const res = await fetch("/api/countries");
      await assertResponseOk(res);
      const data = (await res.json()) as { countries: OpenAQCountry[] };
      return data.countries;
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}
