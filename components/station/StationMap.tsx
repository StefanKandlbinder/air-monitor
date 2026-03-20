"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import type { MapRef } from "react-map-gl/maplibre";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useDictionary } from "@/components/providers/DictionaryProvider";
import { DARK_MAP_STYLE, LIGHT_MAP_STYLE } from "@/components/station-map/constants";
import { MapCard } from "@/components/station-map/MapCard";
import type { PlaceSelection } from "@/components/station-map/LocationSearch";
import type { UserLocation } from "@/components/station-map/types";
import { toAqiLocationInputs } from "@/lib/aqi";
import { assertResponseOk } from "@/lib/fetch-error";
import type { AqiResult } from "@/lib/server/map-data";
import { WEEK_MS } from "@/lib/time";
import { useRefetchOnVisible } from "@/lib/hooks/use-refetch-on-visible";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
import { useParameterFilter } from "@/lib/hooks/use-parameter-filter";
import { useMapUrlState } from "@/lib/hooks/use-map-url-state";
import type { OpenAQLocation } from "@/lib/types";

type MapData = { locations: OpenAQLocation[]; aqi: AqiResult };

async function fetchDefaultMapData(): Promise<MapData> {
  const res = await fetch("/api/stations");
  await assertResponseOk(res);
  const { locations } = (await res.json()) as { locations: OpenAQLocation[] };
  const now = Date.now();
  const recent = locations.filter((l) => {
    const last = l.datetimeLast?.utc;
    return last && now - new Date(last).getTime() <= WEEK_MS;
  });
  if (recent.length === 0) {
    return { locations: [], aqi: { colors: {}, aqiValues: {}, latestValues: {}, subIndices: {} } };
  }
  const aqiRes = await fetch("/api/aqi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locations: toAqiLocationInputs(recent) }),
  });
  await assertResponseOk(aqiRes);
  const aqi = (await aqiRes.json()) as AqiResult;
  return { locations: recent, aqi };
}

async function fetchSearchMapData(lat: number, lon: number): Promise<MapData> {
  const res = await fetch(`/api/search?lat=${lat}&lon=${lon}`);
  await assertResponseOk(res);
  const { locations, aqi } = (await res.json()) as MapData;
  return { locations, aqi };
}

export default function StationMap() {
  const router = useRouter();
  const params = useParams<{ id?: string; period?: string; lang?: string }>();
  const lang = params.lang ?? "de";
  const routeLocationId =
    typeof params.id === "string" && params.id.trim() ? Number(params.id) : null;
  const routePeriod = typeof params.period === "string" ? params.period : "hours";
  const dict = useDictionary();

  const mapRef = useRef<MapRef | null>(null);
  const { resolvedTheme } = useTheme();
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [searchCoords, setSearchCoords] = useState<{ lat: number; lon: number } | null>(null);

  const queryClient = useQueryClient();

  // Single query: locations + AQI always fetched together → never out of sync
  const mapDataQuery = useQuery({
    queryKey: ["map-data", searchCoords?.lat ?? null, searchCoords?.lon ?? null] as const,
    // Read lat/lon from queryKey to avoid any stale-closure issues
    queryFn: ({ queryKey: [, lat, lon] }) =>
      lat !== null && lon !== null
        ? fetchSearchMapData(lat, lon)
        : fetchDefaultMapData(),
    placeholderData: keepPreviousData, // keep previous markers visible while loading new location
  });

  useRefetchOnVisible(
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: ["map-data"] });
    }, [queryClient]),
  );

  // Error toast
  useEffect(() => {
    if (!mapDataQuery.isError) return;
    toast.error(dict.toast.couldNotLoadStations, {
      description: mapDataQuery.error instanceof Error ? mapDataQuery.error.message : undefined,
    });
  }, [mapDataQuery.isError, mapDataQuery.error, dict.toast.couldNotLoadStations]);

  // "No stations found" toast when a search returns empty results
  const lastEmptyToastKey = useRef<string | null>(null);
  useEffect(() => {
    if (mapDataQuery.isPlaceholderData || !mapDataQuery.data || searchCoords === null) return;
    if (mapDataQuery.data.locations.length === 0) {
      const key = `${searchCoords.lat},${searchCoords.lon}`;
      if (lastEmptyToastKey.current !== key) {
        lastEmptyToastKey.current = key;
        toast.info(dict.toast.noStationsFound);
      }
    }
  }, [mapDataQuery.data, mapDataQuery.isPlaceholderData, searchCoords, dict.toast.noStationsFound]);

  const allLocations = mapDataQuery.data?.locations ?? [];
  const { selectedParameters, setSelectedParameters, groupedParameters, filteredLocations, toggleParameter } =
    useParameterFilter(allLocations);

const mapStyle = resolvedTheme === "dark" ? DARK_MAP_STYLE : LIGHT_MAP_STYLE;

  const hasFlownToDataRef = useRef(false);

  useEffect(() => {
    if (searchCoords) return;
    if (!filteredLocations.length || hasFlownToDataRef.current) return;
    hasFlownToDataRef.current = true;
    const { sumLng, sumLat } = filteredLocations.reduce(
      (acc, l) => ({
        sumLng: acc.sumLng + l.coordinates.longitude,
        sumLat: acc.sumLat + l.coordinates.latitude,
      }),
      { sumLng: 0, sumLat: 0 },
    );
    mapRef.current?.flyTo({
      center: [sumLng / filteredLocations.length, sumLat / filteredLocations.length],
      zoom: 9.5,
      duration: 800,
    });
  }, [filteredLocations, searchCoords]);

  const fetchStationsAt = useCallback((lat: string, lng: string) => {
    setSearchCoords({ lat: Number(lat), lon: Number(lng) });
  }, []);

  const { mapCenter, searchLabel, setSearchLabel, handleMoveEnd, pushLocation } =
    useMapUrlState(mapRef, fetchStationsAt);

  const { locate, isLocating, isSupported: isGeolocationSupported } = useGeolocation(
    useCallback(
      (coords) => {
        const nextLocation: UserLocation = coords;
        setUserLocation(nextLocation);
        setSearchLabel(null);
        pushLocation({ ...nextLocation, zoom: 12 });
        mapRef.current?.flyTo({
          center: [nextLocation.longitude, nextLocation.latitude],
          zoom: 12,
          duration: 1200,
        });
        setSearchCoords({ lat: nextLocation.latitude, lon: nextLocation.longitude });
      },
      [setSearchLabel, pushLocation],
    ),
    useCallback(
      (error) => {
        toast.error(dict.toast.couldNotDetermineLocation, {
          description: error.message || dict.toast.locationLookupFailed,
        });
      },
      [dict.toast.couldNotDetermineLocation, dict.toast.locationLookupFailed],
    ),
  );

  const centerOnUserLocation = () => {
    if (!isGeolocationSupported) {
      toast.error(dict.toast.geolocationUnavailable, {
        description: dict.toast.geolocationNotSupported,
      });
      return;
    }
    locate();
  };

  const handleLocationSelect = (location: OpenAQLocation): void => {
    const period = routeLocationId !== null && routePeriod ? routePeriod : "hours";
    router.push(`/${lang}/station/${location.id}/${period}`);
  };

  const handlePlaceSelect = (place: PlaceSelection): void => {
    setSearchLabel(place.label);
    mapRef.current?.flyTo({ center: [place.lon, place.lat], zoom: 10, duration: 1000 });
    pushLocation({ longitude: place.lon, latitude: place.lat, zoom: 10 }, place.label);
    setSearchCoords({ lat: place.lat, lon: place.lon });
    setSelectedParameters([]);
  };

  const handleClearSearch = (): void => {
    setSearchCoords(null);
    setSearchLabel(null);
    hasFlownToDataRef.current = false;
  };

  const aqi = mapDataQuery.data?.aqi;

  return (
    <MapCard
      mapRef={mapRef}
      mapCenter={mapCenter}
      mapStyle={mapStyle}
      filteredLocations={filteredLocations}
      selectedParameters={selectedParameters}
      groupedParameters={groupedParameters}
      isLocating={isLocating}
      userLocation={userLocation}
      selectedLabel={searchLabel}
      onToggleParameter={toggleParameter}
      onClearParameters={() => setSelectedParameters([])}
      onCenterOnUserLocation={centerOnUserLocation}
      locationColors={aqi?.colors}
      locationAqiValues={aqi?.aqiValues}
      locationLatestValues={aqi?.latestValues}
      onSelectLocation={handleLocationSelect}
      onSelectPlace={handlePlaceSelect}
      onClearSearch={handleClearSearch}
      onMoveEnd={handleMoveEnd}
    />
  );
}
