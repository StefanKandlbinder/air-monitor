"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMeasurementsQuery } from "@/components/station-map/queries/use-range-measurements-query";
import { DetailsPanel } from "@/components/station-map/DetailsPanel";
import type { StationSnapshotResponse } from "@/components/station-map/types";
import type { AirQualityReading, OpenAQLocation, Rollup } from "@/lib/types";

const PARAMETER_LIMITS: Record<string, number> = { no2: 30, pm10: 50, pm25: 25 };
const PARAMETER_DISPLAY_NAMES: Record<string, string> = { no2: "NO2", pm10: "PM10", pm25: "PM2.5" };

const HOUR_MS = 60 * 60 * 1000;

function floorToHour(ms: number): string {
  return new Date(Math.floor(ms / HOUR_MS) * HOUR_MS).toISOString();
}

function buildLastWeekRange(): { dateFrom: string; dateTo: string } {
  const now = Date.now();
  return { dateFrom: floorToHour(now - 7 * 24 * HOUR_MS), dateTo: floorToHour(now) };
}

function resolveRollup(period: string): Rollup {
  const value = period.toLowerCase();
  if (value === "days" || value === "daily" || value === "day") return "days";
  return "hours";
}

export default function StationDetails() {
  const params = useParams<{ id: string; period: string }>();

  const locationId = Number(params.id);
  const [rollup, setRollup] = useState<Rollup>(() =>
    resolveRollup(params.period ?? "hours")
  );

  const [weeklyRange] = useState(() => buildLastWeekRange());
  const [dateFrom, setDateFrom] = useState(() => weeklyRange.dateFrom);
  const [dateTo, setDateTo] = useState(() => weeklyRange.dateTo);

  const activeDateRange =
    dateFrom && dateTo ? { dateFrom, dateTo } : weeklyRange;

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

  const locationFromCache = useMemo(
    () => locationsQuery.data?.find((l) => l.id === locationId) ?? null,
    [locationsQuery.data, locationId]
  );

  const singleLocationQuery = useQuery({
    queryKey: ["location", locationId],
    enabled: !locationsQuery.isPending && locationFromCache === null,
    queryFn: async () => {
      const res = await fetch(`/api/stations/${locationId}`);
      if (!res.ok) throw new Error("Could not load station");
      const data = (await res.json()) as { location: OpenAQLocation | null };
      return data.location;
    },
    staleTime: 1000 * 60 * 60 * 24 * 7,
  });

  const location = locationFromCache ?? singleLocationQuery.data ?? null;

  const queryClient = useQueryClient();

  const cachedAqi = useMemo(() => {
    type Entry = { colors: Record<number, string>; aqiValues: Record<number, number>; latestValues: Record<number, Record<string, { value: number; units: string }>>; subIndices?: Record<number, Record<string, number>> };
    for (const q of queryClient.getQueryCache().findAll({ queryKey: ["aqi"] })) {
      const d = q.state.data as Entry | undefined;
      if (d?.colors?.[locationId] !== undefined) {
        return { color: d.colors[locationId], aqiValue: d.aqiValues?.[locationId] ?? null, latestValues: d.latestValues?.[locationId] ?? {}, subIndices: d.subIndices?.[locationId] ?? {} };
      }
    }
    return null;
  }, [queryClient, locationId]);

  const aqiSensors = useMemo(() => {
    if (!location) return [];
    const AQI = new Set(["pm25", "pm2.5", "pm10", "o3", "co", "so2", "no2"]);
    return location.sensors
      .filter((s) => AQI.has(s.parameter.name.toLowerCase()))
      .map((s) => ({
        sensorId: s.id,
        param: s.parameter.name.toLowerCase() === "pm2.5" ? "pm25" : s.parameter.name.toLowerCase(),
        units: s.parameter.units,
      }));
  }, [location]);

  const aqiQuery = useQuery({
    queryKey: ["aqi-single", locationId, aqiSensors],
    enabled: (cachedAqi === null || cachedAqi.aqiValue === null) && aqiSensors.length > 0,
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      const res = await fetch("/api/aqi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locations: [{ locationId, sensors: aqiSensors }] }),
      });
      if (!res.ok) throw new Error("Could not load AQI");
      const d = (await res.json()) as { colors: Record<number, string>; aqiValues: Record<number, number>; latestValues: Record<number, Record<string, { value: number; units: string }>>; subIndices?: Record<number, Record<string, number>> };
      return { color: d.colors[locationId], aqiValue: d.aqiValues?.[locationId] ?? null, latestValues: d.latestValues?.[locationId] ?? {}, subIndices: d.subIndices?.[locationId] ?? {} };
    },
  });

  const measurementsQuery = useMeasurementsQuery(locationId, rollup, activeDateRange);

  // Skip cached AQI entries with no value (stale pre-fix cache)
  const validCachedAqi = cachedAqi?.aqiValue != null ? cachedAqi : null;
  const aqiData = validCachedAqi ?? aqiQuery.data ?? null;

  // Build current-values snapshot from aqiData.latestValues — same source as the map
  const snapshot = useMemo<StationSnapshotResponse | null>(() => {
    if (!location || !aqiData?.latestValues) return null;
    const readings: AirQualityReading[] = Object.entries(aqiData.latestValues)
      .filter(([param]) => PARAMETER_LIMITS[param] != null)
      .map(([parameter, v]) => {
        const { value, units, timestamp } = v as { value: number; units: string; timestamp?: string };
        return {
          parameter,
          displayName: PARAMETER_DISPLAY_NAMES[parameter] ?? parameter.toUpperCase(),
          value,
          unit: units,
          limit: PARAMETER_LIMITS[parameter],
          timestamp: timestamp ? new Date(timestamp).getTime() : 0,
        };
      });
    if (!readings.length) return null;
    return { locationId: location.id, rollup: "hours", readings };
  }, [location, aqiData]);

  const isLoading =
    locationsQuery.isPending ||
    singleLocationQuery.isFetching ||
    aqiQuery.isFetching ||
    measurementsQuery.isPending;

  const handleRollupChange = (nextRollup: Rollup): void => {
    setRollup(nextRollup);
    window.history.replaceState(null, "", `/station/${locationId}/${nextRollup}`);
  };

  return (
    <DetailsPanel
      isLoading={isLoading}
      activeSelectedLocation={location}
      locations={locationsQuery.data ?? []}
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
