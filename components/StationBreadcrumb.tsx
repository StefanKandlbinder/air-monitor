"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { OpenAQLocation } from "@/lib/types";

export default function StationBreadcrumb({ locationId }: { locationId: number }) {
  const locationsQuery = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const response = await fetch("/api/stations");
      if (!response.ok) throw new Error("Could not load stations");
      const data = (await response.json()) as { locations: OpenAQLocation[] };
      return data.locations;
    },
    staleTime: 1000 * 60 * 60 * 24 * 7,
  });

  const nameFromCache = locationsQuery.data?.find((l) => l.id === locationId)?.name ?? null;

  const singleQuery = useQuery({
    queryKey: ["location", locationId],
    enabled: !locationsQuery.isPending && nameFromCache === null,
    queryFn: async () => {
      const res = await fetch(`/api/stations/${locationId}`);
      if (!res.ok) throw new Error("Could not load station");
      const data = (await res.json()) as { location: OpenAQLocation | null };
      return data.location;
    },
    staleTime: 1000 * 60 * 60 * 24 * 7,
  });

  const name = nameFromCache ?? singleQuery.data?.name ?? String(locationId);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/">Map</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{name}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
