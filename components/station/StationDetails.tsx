"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useMeasurementsQuery } from "@/components/station-map/queries/use-range-measurements-query";
import { assertResponseOk } from "@/lib/fetch-error";
import { useAqiCacheEntry } from "@/lib/hooks/useAqiCacheEntry";
import { useLocationsQuery, useSingleLocationQuery } from "@/components/station-map/queries/use-locations-query";
import { DetailsPanel } from "@/components/station-map/DetailsPanel";
import type { StationSnapshotResponse } from "@/components/station-map/types";
import { getAqiSensorParams, PARAM_LABELS, PARAMETER_LIMITS } from "@/lib/aqi";
import { HOUR_MS, floorToHourIso } from "@/lib/time";
import type { AirQualityReading, Rollup } from "@/lib/types";


type AqiResult = {
  color: string;
  aqiValue: number | null;
  latestValues: Record<string, { value: number; units: string }>;
  subIndices: Record<string, number>;
};

function buildLastWeekRange(): { dateFrom: string; dateTo: string } {
  const now = Date.now();
  return { dateFrom: floorToHourIso(now - 7 * 24 * HOUR_MS), dateTo: floorToHourIso(now) };
}

function resolveRollup(period: string): Rollup {
  const value = period.toLowerCase();
  if (value === "days" || value === "daily" || value === "day") return "days";
  return "hours";
}

export default function StationDetails() {
  const params = useParams<{ id: string; period: string; lang?: string }>();
  const lang = params.lang ?? "de";

  const locationId = Number(params.id);
  const [rollup, setRollup] = useState<Rollup>(() =>
    resolveRollup(params.period ?? "hours")
  );

  const [weeklyRange] = useState(() => buildLastWeekRange());
  const [dateFrom, setDateFrom] = useState(() => weeklyRange.dateFrom);
  const [dateTo, setDateTo] = useState(() => weeklyRange.dateTo);

  const activeDateRange =
    dateFrom && dateTo ? { dateFrom, dateTo } : weeklyRange;

  const locationsQuery = useLocationsQuery();

  const locationFromCache = useMemo(
    () => locationsQuery.data?.find((l) => l.id === locationId) ?? null,
    [locationsQuery.data, locationId]
  );

  const singleLocationQuery = useSingleLocationQuery(
    locationId,
    locationsQuery.isPending || locationFromCache !== null
  );

  const location = locationFromCache ?? singleLocationQuery.data ?? null;

  const mapCacheEntry = useAqiCacheEntry(locationId);

  const aqiLocation = useMemo(() => {
    if (!location) return null;
    const sensorParams = getAqiSensorParams(location.sensors);
    if (!Object.keys(sensorParams).length) return null;
    return { locationId: location.id, sensorParams };
  }, [location]);

  const aqiQuery = useQuery({
    queryKey: ["aqi-single", locationId],
    enabled: aqiLocation !== null,
    staleTime: 1000 * 60 * 60,
    initialData: mapCacheEntry?.result,
    initialDataUpdatedAt: mapCacheEntry?.updatedAt,
    queryFn: async () => {
      const res = await fetch("/api/aqi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locations: [aqiLocation] }),
      });
      await assertResponseOk(res);
      const d = (await res.json()) as { colors: Record<number, string>; aqiValues: Record<number, number>; latestValues: Record<number, Record<string, { value: number; units: string }>>; subIndices?: Record<number, Record<string, number>> };
      return { color: d.colors[locationId], aqiValue: d.aqiValues?.[locationId] ?? null, latestValues: d.latestValues?.[locationId] ?? {}, subIndices: d.subIndices?.[locationId] ?? {} };
    },
  });

  const measurementsQuery = useMeasurementsQuery(locationId, rollup, activeDateRange);

  const aqiData = aqiQuery.data ?? null;

  // Build current-values snapshot from aqiData.latestValues
  const snapshot = useMemo<StationSnapshotResponse | null>(() => {
    if (!location || !aqiData?.latestValues) return null;
    const readings: AirQualityReading[] = Object.entries(aqiData.latestValues)
      .filter(([param]) => PARAMETER_LIMITS[param] != null)
      .map(([parameter, v]) => {
        const { value, units, timestamp } = v as { value: number; units: string; timestamp?: string };
        return {
          parameter,
          displayName: PARAM_LABELS[parameter] ?? parameter.toUpperCase(),
          value,
          unit: units,
          limit: PARAMETER_LIMITS[parameter],
          timestamp: timestamp ? new Date(timestamp).getTime() : 0,
        };
      });
    if (!readings.length) return null;
    return { locationId: location.id, rollup: "hours", readings };
  }, [location, aqiData]);

  const locationColors = useMemo(
    () => mapCacheEntry?.allColors ?? (aqiData?.color ? { [locationId]: aqiData.color } : undefined),
    [mapCacheEntry?.allColors, aqiData?.color, locationId]
  );


  const isLoading =
    locationsQuery.isPending ||
    singleLocationQuery.isFetching ||
    aqiQuery.isFetching ||
    measurementsQuery.isPending;

  const handleRollupChange = (nextRollup: Rollup): void => {
    setRollup(nextRollup);
    window.history.replaceState(null, "", `/${lang}/station/${locationId}/${nextRollup}`);
  };

  return (
    <DetailsPanel
      isLoading={isLoading}
      activeSelectedLocation={location}
      locations={locationsQuery.data ?? []}
      locationColors={locationColors}
      snapshot={snapshot}
      aqiColor={aqiData?.color}
      aqiValue={aqiData?.aqiValue ?? null}
      aqiSubIndices={aqiData?.subIndices ?? {}}
      rollup={rollup}
      dateFrom={dateFrom}
      dateTo={dateTo}
      onDateFromChange={setDateFrom}
      onDateToChange={setDateTo}
      onClearDateRange={() => {
        const range = buildLastWeekRange();
        setDateFrom(range.dateFrom);
        setDateTo(range.dateTo);
      }}
      onRollupChange={handleRollupChange}
      measurements={measurementsQuery.data?.measurements ?? []}
      measurementsLoading={
        measurementsQuery.isPending || measurementsQuery.isFetching
      }
    />
  );
}
