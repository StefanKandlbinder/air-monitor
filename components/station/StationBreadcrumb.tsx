"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useLocationsQuery, useSingleLocationQuery } from "@/components/station-map/queries/use-locations-query";
import { useDictionary } from "@/components/providers/DictionaryProvider";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function StationBreadcrumb({ locationId }: { locationId: number }) {
  const dict = useDictionary();
  const params = useParams<{ lang?: string }>();
  const lang = params.lang ?? "de";
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
            <Link href={`/${lang}`}>{dict.breadcrumb.map}</Link>
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
