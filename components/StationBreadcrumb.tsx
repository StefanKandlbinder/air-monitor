"use client";

import Link from "next/link";
import { useLocationsQuery, useSingleLocationQuery } from "@/components/station-map/queries/use-locations-query";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function StationBreadcrumb({ locationId }: { locationId: number }) {
  const locationsQuery = useLocationsQuery();
  const nameFromCache = locationsQuery.data?.find((l) => l.id === locationId)?.name ?? null;
  const singleQuery = useSingleLocationQuery(
    locationId,
    locationsQuery.isPending || nameFromCache !== null
  );

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
