"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { MapRef } from "react-map-gl/maplibre";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useDictionary } from "@/components/providers/DictionaryProvider";
import { DARK_MAP_STYLE, LIGHT_MAP_STYLE } from "@/components/station-map/constants";
import { MapCard } from "@/components/station-map/MapCard";
import { useLocationsQuery } from "@/components/station-map/queries/use-locations-query";
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

export default function StationMap() {
  const router = useRouter();
  const params = useParams<{ id?: string; period?: string; lang?: string }>();
  const lang = params.lang ?? "de";
  const routeLocationId =
    typeof params.id === "string" && params.id.trim()
      ? Number(params.id)
      : null;
  const routePeriod =
    typeof params.period === "string" ? params.period : "hours";
  const dict = useDictionary();

  const mapRef = useRef<MapRef | null>(null);
  const { resolvedTheme } = useTheme();
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [searchLocations, setSearchLocations] = useState<OpenAQLocation[] | null>(null);

  const queryClient = useQueryClient();
  const locationsQuery = useLocationsQuery();

  useRefetchOnVisible(useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["aqi"] });
    void queryClient.invalidateQueries({ queryKey: ["locations"] });
  }, [queryClient]));

  const locations = useMemo(() => {
    const all = searchLocations ?? locationsQuery.data ?? [];
    const now = Date.now();
    return all.filter((l) => {
      const last = l.datetimeLast?.utc;
      return last && now - new Date(last).getTime() <= WEEK_MS;
    });
  }, [searchLocations, locationsQuery.data]);

  const { selectedParameters, setSelectedParameters, groupedParameters, filteredLocations, toggleParameter } =
    useParameterFilter(locations);

  const aqiLocations = useMemo(() => toAqiLocationInputs(locations), [locations]);

  const aqiQuery = useQuery({
    queryKey: ["aqi", aqiLocations.map((l) => l.locationId).sort((a, b) => a - b)],
    enabled: aqiLocations.length > 0,
    staleTime: Infinity,
    queryFn: async () => {
      const res = await fetch("/api/aqi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locations: aqiLocations }),
      });
      await assertResponseOk(res);
      return (await res.json()) as {
        colors: Record<number, string>;
        aqiValues: Record<number, number>;
        latestValues: Record<number, Record<string, { value: number; units: string }>>;
      };
    },
  });

  const mapStyle = resolvedTheme === "dark" ? DARK_MAP_STYLE : LIGHT_MAP_STYLE;

  const hasFlownToDataRef = useRef(false);

  // On initial load, fly to the centroid of all default stations once.
  useEffect(() => {
    if (searchLocations) return;
    if (!filteredLocations.length || hasFlownToDataRef.current) return;
    hasFlownToDataRef.current = true;
    const { sumLng, sumLat } = filteredLocations.reduce(
      (acc, l) => ({ sumLng: acc.sumLng + l.coordinates.longitude, sumLat: acc.sumLat + l.coordinates.latitude }),
      { sumLng: 0, sumLat: 0 },
    );
    mapRef.current?.flyTo({
      center: [sumLng / filteredLocations.length, sumLat / filteredLocations.length],
      zoom: 9.5,
      duration: 800,
    });
  }, [filteredLocations, searchLocations]);

  const loadStationsAt = useCallback(async (lat: number | string, lng: number | string): Promise<OpenAQLocation[] | null> => {
    try {
      const res = await fetch(`/api/search?lat=${lat}&lon=${lng}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Server error ${res.status}`);
      }
      const data = (await res.json()) as { locations: OpenAQLocation[]; aqi: AqiResult };
      const now = Date.now();
      const recentLocations = data.locations.filter((l) => {
        const last = l.datetimeLast?.utc;
        return last && now - new Date(last).getTime() <= WEEK_MS;
      });
      const locationIds = toAqiLocationInputs(recentLocations).map((l) => l.locationId).sort((a, b) => a - b);
      queryClient.setQueryData(["aqi", locationIds], data.aqi);
      queryClient.setQueryData(["locations"], data.locations);
      setSearchLocations(data.locations);
      return data.locations;
    } catch (err) {
      toast.error(dict.toast.couldNotLoadStations, {
        description: err instanceof Error ? err.message : undefined,
      });
      return null;
    }
  }, [dict.toast.couldNotLoadStations, queryClient]);

  const fetchStationsAt = useCallback((lat: string, lng: string) => {
    void loadStationsAt(lat, lng);
  }, [loadStationsAt]);

  const { mapCenter, searchLabel, setSearchLabel, handleMoveEnd, pushLocation } =
    useMapUrlState(mapRef, fetchStationsAt);

  const { locate, isLocating, isSupported: isGeolocationSupported } = useGeolocation(
    useCallback(async (coords) => {
      const nextLocation: UserLocation = coords;
      setUserLocation(nextLocation);
      setSearchLabel(null);
      pushLocation({ ...nextLocation, zoom: 12 });
      mapRef.current?.flyTo({
        center: [nextLocation.longitude, nextLocation.latitude],
        zoom: 12,
        duration: 1200,
      });
      const result = await loadStationsAt(nextLocation.latitude, nextLocation.longitude);
      if (result !== null && result.length === 0) toast.info(dict.toast.noStationsFound);
    }, [loadStationsAt, pushLocation, dict.toast.noStationsFound]),
    useCallback((error) => {
      toast.error(dict.toast.couldNotDetermineLocation, {
        description: error.message || dict.toast.locationLookupFailed,
      });
    }, [dict.toast.couldNotDetermineLocation, dict.toast.locationLookupFailed]),
  );

  const centerOnUserLocation = () => {
    if (!isGeolocationSupported) {
      toast.error(dict.toast.geolocationUnavailable, { description: dict.toast.geolocationNotSupported });
      return;
    }
    locate();
  };

  const handleLocationSelect = (location: OpenAQLocation): void => {
    const period =
      routeLocationId !== null && routePeriod ? routePeriod : "hours";
    router.push(`/${lang}/station/${location.id}/${period}`);
  };

  const handlePlaceSelect = async (place: PlaceSelection): Promise<void> => {
    setSearchLabel(place.label);
    mapRef.current?.flyTo({ center: [place.lon, place.lat], zoom: 10, duration: 1000 });
    pushLocation({ longitude: place.lon, latitude: place.lat, zoom: 10 }, place.label);
    const result = await loadStationsAt(place.lat, place.lon);
    if (result !== null) {
      setSelectedParameters([]);
      if (result.length === 0) toast.info(dict.toast.noStationsFound);
    }
  };

  const handleClearSearch = (): void => {
    setSearchLocations(null);
    setSearchLabel(null);
    hasFlownToDataRef.current = false; // allow re-fly to default centroid
  };

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
      locationColors={aqiQuery.data?.colors}
      locationAqiValues={aqiQuery.data?.aqiValues}
      locationLatestValues={aqiQuery.data?.latestValues}
      onSelectLocation={handleLocationSelect}
      onSelectPlace={handlePlaceSelect}
      onClearSearch={handleClearSearch}
      onMoveEnd={handleMoveEnd}
    />
  );
}
