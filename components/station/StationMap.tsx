"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import type { MapRef } from "react-map-gl/maplibre";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useDictionary } from "@/components/providers/DictionaryProvider";
import { DARK_MAP_STYLE, LIGHT_MAP_STYLE } from "@/components/station-map/constants";
import { MapCard } from "@/components/station-map/MapCard";
import type { PlaceSelection } from "@/components/station-map/LocationSearch";
import type { UserLocation } from "@/components/station-map/types";
import { assertResponseOk } from "@/lib/fetchError";
import type { AqiResult } from "@/lib/server/mapData";
import { useRefetchOnVisible } from "@/lib/hooks/useRefetchOnVisible";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import { useMapUrlState } from "@/lib/hooks/useMapUrlState";
import type { OpenAQLocation } from "@/lib/types";

type MapData = { locations: OpenAQLocation[]; aqi: AqiResult };

// Default to Linz center — matches the hardcoded coords in /api/stations so the server cache is reused
const DEFAULT_COORDS = { lat: 48.3069, lon: 14.2858 };

async function fetchSearchMapData(lat: number, lon: number): Promise<MapData> {
  const res = await fetch(`/api/search?lat=${lat}&lon=${lon}`, { cache: "no-store" });
  await assertResponseOk(res);
  const { locations = [], aqi } = (await res.json()) as Partial<MapData>;
  return { locations, aqi: aqi ?? { colors: {}, aqiValues: {}, latestValues: {}, subIndices: {} } };
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
  const searchParams = useSearchParams();
  // Always initialized: URL params (from saved position) → default Linz coords
  const [searchCoords, setSearchCoords] = useState(() => {
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    return lat && lng ? { lat: parseFloat(lat), lon: parseFloat(lng) } : DEFAULT_COORDS;
  });

  const queryClient = useQueryClient();

  // Single query: locations + AQI always fetched together → never out of sync
  const mapDataQuery = useQuery({
    queryKey: ["map-data", searchCoords.lat, searchCoords.lon] as const,
    queryFn: ({ queryKey: [, lat, lon] }) => fetchSearchMapData(lat, lon),
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
    if (mapDataQuery.isPlaceholderData || !mapDataQuery.data) return;
    if (mapDataQuery.data.locations.length === 0) {
      const key = `${searchCoords.lat},${searchCoords.lon}`;
      if (lastEmptyToastKey.current !== key) {
        lastEmptyToastKey.current = key;
        toast.info(dict.toast.noStationsFound);
      }
    }
  }, [mapDataQuery.data, mapDataQuery.isPlaceholderData, searchCoords, dict.toast.noStationsFound]);

  const allLocations = mapDataQuery.data?.locations ?? [];

const mapStyle = resolvedTheme === "dark" ? DARK_MAP_STYLE : LIGHT_MAP_STYLE;

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
  };

  const handleClearSearch = (): void => {
    setSearchCoords(DEFAULT_COORDS);
    setSearchLabel(null);
  };

  const aqi = mapDataQuery.data?.aqi;

  return (
    <MapCard
      mapRef={mapRef}
      mapCenter={mapCenter}
      mapStyle={mapStyle}
      filteredLocations={allLocations}
      isLocating={isLocating}
      userLocation={userLocation}
      selectedLabel={searchLabel}
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
