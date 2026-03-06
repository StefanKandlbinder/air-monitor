"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { MapRef } from "react-map-gl/maplibre";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useRangeMeasurementsQuery } from "@/components/station-map/queries/use-range-measurements-query";
import { groupComponents, DARK_MAP_STYLE, LIGHT_MAP_STYLE } from "@/components/station-map/constants";
import { DetailsPanel } from "@/components/station-map/DetailsPanel";
import { MapCard } from "@/components/station-map/MapCard";
import type { MeanType, StationSnapshotResponse, UserLocation } from "@/components/station-map/types";
import type { OfficialStation } from "@/lib/types";

function resolveRoutePeriod(period?: string): MeanType | null {
  if (!period) {
    return null;
  }

  const value = period.toLowerCase();
  if (value === "mw1" || value === "hourly" || value === "hour") {
    return "MW1";
  }

  if (value === "tmw" || value === "daily" || value === "day") {
    return "TMW";
  }

  if (value === "hmw" || value === "halfhour" || value === "half-hour") {
    return "HMW";
  }

  return null;
}

function toUpperAustriaDateParam(value: string): string {
  return value.replace("T", " ");
}

function buildLastWeekRange(): { datvon: string; datbis: string } {
  const from = new Date();
  const to = new Date();
  from.setDate(from.getDate() - 7);

  const format = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  return { datvon: format(from), datbis: format(to) };
}

const DISPLAY_COMPONENTS = ["NO2", "PM10kont", "PM25kont"] as const;
const ACTUAL_MEAN: MeanType = "MW1";

function buildSnapshot(
  station: OfficialStation,
  messwerte: { station: string; komponente: string; zeitpunkt: number; messwert: string }[],
): StationSnapshotResponse {
  const readings = DISPLAY_COMPONENTS.flatMap((component) => {
    const componentMeasurements = messwerte.filter(
      (m) => m.station === station.code && m.komponente === component,
    );

    if (!componentMeasurements.length) {
      return [];
    }

    const latest = componentMeasurements.reduce((currentLatest, candidate) =>
      candidate.zeitpunkt > currentLatest.zeitpunkt ? candidate : currentLatest,
    );
    const normalizedTimestamp =
      latest.zeitpunkt < 1_000_000_000_000 ? latest.zeitpunkt * 1000 : latest.zeitpunkt;

    return [
      {
        station: station.langname,
        stationHash: `#${station.kurzname.replace(/\s+/g, "-")}`,
        component: component.replace("kont", ""),
        mean: ACTUAL_MEAN,
        limit: component === "NO2" ? 30 : component === "PM10kont" ? 50 : 25,
        date: new Date(normalizedTimestamp),
        value: (parseFloat(latest.messwert.replace(",", ".")) * 1000).toFixed(2),
      },
    ];
  });

  return { stationCode: station.code, mean: ACTUAL_MEAN, readings };
}

export default function StationMap() {
  const router = useRouter();
  const params = useParams<{ id?: string; period?: string }>();
  const routeStationCode =
    typeof params.id === "string" && params.id.trim()
      ? params.id.toUpperCase()
      : null;
  const routeMean = resolveRoutePeriod(
    typeof params.period === "string" ? params.period : undefined,
  );
  const mapRef = useRef<MapRef | null>(null);
  const { resolvedTheme } = useTheme();
  const [localSelectedStationCode, setLocalSelectedStationCode] = useState<string | null>(
    null,
  );
  const [hoveredStation, setHoveredStation] = useState<OfficialStation | null>(
    null,
  );
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [localMean, setLocalMean] = useState<MeanType>("MW1");
  const [weeklyRange] = useState(() => buildLastWeekRange());
  const [dateFrom, setDateFrom] = useState(() =>
    weeklyRange.datvon.replace(" ", "T"),
  );
  const [dateTo, setDateTo] = useState(() =>
    weeklyRange.datbis.replace(" ", "T"),
  );
  const selectedStationCode = routeStationCode ?? localSelectedStationCode;
  const mean = routeMean ?? localMean;
  const activeDateRange =
    dateFrom && dateTo
      ? {
          datvon: toUpperAustriaDateParam(dateFrom),
          datbis: toUpperAustriaDateParam(dateTo),
        }
      : null;
  const stationsQuery = useQuery({
    queryKey: ["stations"],
    queryFn: async () => {
      const response = await fetch("/api/stations");
      if (!response.ok) {
        throw new Error("Could not load stations");
      }
      const data = (await response.json()) as { stations: OfficialStation[] };
      return data.stations;
    },
    staleTime: 1000 * 60 * 60 * 24 * 30,
  });

  const stations = useMemo(
    () => stationsQuery.data ?? [],
    [stationsQuery.data],
  );
  const availableComponents = useMemo(() => {
    const components = new Set<string>();
    for (const station of stations) {
      for (const component of station.komponentenCodes) {
        components.add(component);
      }
    }
    return Array.from(components).sort((a, b) => a.localeCompare(b));
  }, [stations]);
  const groupedComponents = useMemo(
    () => groupComponents(availableComponents),
    [availableComponents],
  );
  const filteredStations = useMemo(() => {
    if (!selectedComponents.length) {
      return stations;
    }

    return stations.filter((station) =>
      selectedComponents.every((component) =>
        station.komponentenCodes.includes(component),
      ),
    );
  }, [selectedComponents, stations]);
  const visibleStationCodes = useMemo(
    () => new Set(filteredStations.map((station) => station.code)),
    [filteredStations],
  );
  const selectedStation = useMemo(
    () =>
      selectedStationCode
        ? stations.find((station) => station.code === selectedStationCode) ?? null
        : null,
    [selectedStationCode, stations],
  );
  const activeSelectedStation =
    selectedStation && visibleStationCodes.has(selectedStation.code)
      ? selectedStation
      : null;
  const activeHoveredStation =
    hoveredStation && visibleStationCodes.has(hoveredStation.code)
      ? hoveredStation
      : null;
  const rangeMeasurementsQuery = useRangeMeasurementsQuery(ACTUAL_MEAN, activeDateRange);
  const statisticsRange = activeDateRange ?? weeklyRange;
  const weeklyMeasurementsQuery = useRangeMeasurementsQuery(mean, statisticsRange);
  const snapshot = useMemo<StationSnapshotResponse | null>(
    () =>
      activeSelectedStation && rangeMeasurementsQuery.data
        ? buildSnapshot(activeSelectedStation, rangeMeasurementsQuery.data.messwerte)
        : null,
    [activeSelectedStation, rangeMeasurementsQuery.data],
  );
  const hoveredSnapshot = useMemo<StationSnapshotResponse | null>(
    () =>
      activeHoveredStation && rangeMeasurementsQuery.data
        ? buildSnapshot(activeHoveredStation, rangeMeasurementsQuery.data.messwerte)
        : null,
    [activeHoveredStation, rangeMeasurementsQuery.data],
  );
  const isLoading =
    stationsQuery.isPending ||
    (!!activeSelectedStation &&
      (rangeMeasurementsQuery.isPending || rangeMeasurementsQuery.isFetching));
  const mapStyle = resolvedTheme === "dark" ? DARK_MAP_STYLE : LIGHT_MAP_STYLE;

  const mapCenter = useMemo(() => {
    if (!filteredStations.length) {
      return { longitude: 14.2858, latitude: 48.3069, zoom: 10 };
    }

    const longitude =
      filteredStations.reduce((acc, station) => acc + station.geoLaenge, 0) /
      filteredStations.length;
    const latitude =
      filteredStations.reduce((acc, station) => acc + station.geoBreite, 0) /
      filteredStations.length;

    return { longitude, latitude, zoom: 9.5 };
  }, [filteredStations]);

  const toggleComponentFilter = (component: string): void => {
    setSelectedComponents((current) =>
      current.includes(component)
        ? current.filter((item) => item !== component)
        : [...current, component],
    );
  };

  const centerOnUserLocation = (): void => {
    if (!navigator.geolocation) {
      toast.error("Geolocation unavailable", {
        description: "Geolocation is not supported by this browser.",
      });
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation: UserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setUserLocation(nextLocation);
        mapRef.current?.flyTo({
          center: [nextLocation.longitude, nextLocation.latitude],
          zoom: 12,
          duration: 1200,
        });
        setIsLocating(false);
      },
      (error) => {
        toast.error("Could not determine your location", {
          description: error.message || "Location lookup failed.",
        });
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const handleStationSelect = (station: OfficialStation): void => {
    setLocalSelectedStationCode(station.code);
    router.push(`/station/${station.code}/${mean}`);
  };

  const handleMeanChange = (nextMean: MeanType): void => {
    setLocalMean(nextMean);
    if (selectedStationCode) {
      router.push(`/station/${selectedStationCode}/${nextMean}`);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr]">
      <MapCard
        mapRef={mapRef}
        mapCenter={mapCenter}
        mapStyle={mapStyle}
        filteredStations={filteredStations}
        activeHoveredStation={activeHoveredStation}
        hoveredSnapshot={hoveredSnapshot}
        hoveredSnapshotLoading={rangeMeasurementsQuery.isPending || rangeMeasurementsQuery.isFetching}
        selectedComponents={selectedComponents}
        groupedComponents={groupedComponents}
        isLocating={isLocating}
        userLocation={userLocation}
        onToggleComponent={toggleComponentFilter}
        onClearComponents={() => setSelectedComponents([])}
        onCenterOnUserLocation={centerOnUserLocation}
        onSelectStation={handleStationSelect}
        onHoverStationChange={setHoveredStation}
      />
      <DetailsPanel
        isLoading={isLoading}
        activeSelectedStation={activeSelectedStation}
        snapshot={snapshot}
        mean={mean}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onClearDateRange={() => {
          setDateFrom("");
          setDateTo("");
        }}
        onMeanChange={handleMeanChange}
        weeklyMeasurements={
          activeSelectedStation
            ? (weeklyMeasurementsQuery.data?.messwerte ?? []).filter(
                (item) => item.station === activeSelectedStation.code,
              )
            : []
        }
        weeklyLoading={weeklyMeasurementsQuery.isPending || weeklyMeasurementsQuery.isFetching}
      />
    </div>
  );
}
