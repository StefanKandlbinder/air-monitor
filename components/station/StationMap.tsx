"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { MapRef } from "react-map-gl/maplibre";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useDictionary } from "@/components/providers/DictionaryProvider";
import { groupParameters, DARK_MAP_STYLE, LIGHT_MAP_STYLE } from "@/components/station-map/constants";
import { MapCard } from "@/components/station-map/MapCard";
import { useLocationsQuery } from "@/components/station-map/queries/use-locations-query";
import type { PlaceSelection } from "@/components/station-map/LocationSearch";
import type { UserLocation } from "@/components/station-map/types";
import { getAqiSensorParams } from "@/lib/aqi";
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
  const [isLocating, setIsLocating] = useState(false);
  const [selectedParameters, setSelectedParameters] = useState<string[]>([]);
  const [searchLocations, setSearchLocations] = useState<OpenAQLocation[] | null>(null);
  const [searchLabel, setSearchLabel] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("label");
  });
  const [isLoadingStations, setIsLoadingStations] = useState(false);

  const locationsQuery = useLocationsQuery();

  const locations = useMemo(
    () => searchLocations ?? locationsQuery.data ?? [],
    [searchLocations, locationsQuery.data]
  );

  const availableParameters = useMemo(() => {
    const parameters = new Set<string>();
    for (const location of locations) {
      for (const sensor of location.sensors) {
        parameters.add(sensor.parameter.name.toLowerCase());
      }
    }
    return Array.from(parameters).sort();
  }, [locations]);

  const groupedParameters = useMemo(
    () => groupParameters(availableParameters),
    [availableParameters]
  );

  const aqiLocations = useMemo(
    () =>
      locations
        .map((l) => ({ locationId: l.id, sensorParams: getAqiSensorParams(l.sensors) }))
        .filter((l) => Object.keys(l.sensorParams).length > 0),
    [locations]
  );

  const aqiQuery = useQuery({
    queryKey: ["aqi", aqiLocations],
    enabled: aqiLocations.length > 0,
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      const res = await fetch("/api/aqi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locations: aqiLocations }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { errorCode?: string };
        throw new Error(body.errorCode ?? "openaq.unknown");
      }
      return (await res.json()) as {
        colors: Record<number, string>;
        aqiValues: Record<number, number>;
        latestValues: Record<number, Record<string, { value: number; units: string }>>;
      };
    },
  });

  const filteredLocations = useMemo(() => {
    if (!selectedParameters.length) return locations;
    return locations.filter((location) =>
      selectedParameters.every((param) =>
        location.sensors.some((s) => s.parameter.name.toLowerCase() === param)
      )
    );
  }, [selectedParameters, locations]);

  const mapStyle = resolvedTheme === "dark" ? DARK_MAP_STYLE : LIGHT_MAP_STYLE;

  const hasFlownToDataRef = useRef(false);
  const popstateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On initial load, fly to the centroid of all default stations once.
  useEffect(() => {
    if (searchLocations) return; // don't override a search fly
    if (!filteredLocations.length || hasFlownToDataRef.current) return;
    hasFlownToDataRef.current = true;
    const { sumLng, sumLat } = filteredLocations.reduce(
      (acc, l) => ({ sumLng: acc.sumLng + l.coordinates.longitude, sumLat: acc.sumLat + l.coordinates.latitude }),
      { sumLng: 0, sumLat: 0 }
    );
    const longitude = sumLng / filteredLocations.length;
    const latitude = sumLat / filteredLocations.length;
    mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 9.5, duration: 800 });
  }, [filteredLocations, searchLocations]);

  const [mapCenter] = useState(() => {
    if (typeof window === "undefined") {
      return { longitude: 14.2978, latitude: 48.3233, zoom: 12 };
    }
    const sp = new URLSearchParams(window.location.search);
    const lat = sp.get("lat");
    const lng = sp.get("lng");
    const zoom = sp.get("zoom");
    return {
      longitude: lng ? parseFloat(lng) : 14.2978,
      latitude: lat ? parseFloat(lat) : 48.3233,
      zoom: zoom ? parseFloat(zoom) : 12,
    };
  });

  const loadStationsAt = useCallback(async (lat: number | string, lng: number | string): Promise<OpenAQLocation[] | null> => {
    setIsLoadingStations(true);
    try {
      const res = await fetch(`/api/search?lat=${lat}&lon=${lng}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Server error ${res.status}`);
      }
      const data = (await res.json()) as { locations: OpenAQLocation[] };
      setSearchLocations(data.locations);
      return data.locations;
    } catch (err) {
      toast.error(dict.toast.couldNotLoadStations, {
        description: err instanceof Error ? err.message : undefined,
      });
      return null;
    } finally {
      setIsLoadingStations(false);
    }
  }, []);

  const fetchStationsAt = useCallback((lat: string, lng: string) => {
    void loadStationsAt(lat, lng);
  }, [loadStationsAt]);

  // On mount: if URL has lat/lng params, fetch stations at those coordinates
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const lat = sp.get("lat");
    const lng = sp.get("lng");
    if (lat && lng) fetchStationsAt(lat, lng);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildLocationParams = (center: { longitude: number; latitude: number; zoom: number }, label?: string) => {
    const params: Record<string, string> = {
      lat: center.latitude.toFixed(4),
      lng: center.longitude.toFixed(4),
      zoom: center.zoom.toFixed(1),
    };
    if (label) params.label = label;
    return new URLSearchParams(params).toString();
  };

  // Continuous pan/zoom — replace in place, no history entry (preserve current label)
  const handleMoveEnd = (center: { longitude: number; latitude: number; zoom: number }): void => {
    window.history.replaceState(null, "", `?${buildLocationParams(center, searchLabel ?? undefined)}`);
  };

  // Intentional "go to" — push so back button restores previous position
  const pushLocation = (center: { longitude: number; latitude: number; zoom: number }, label?: string): void => {
    window.history.pushState(null, "", `?${buildLocationParams(center, label)}`);
  };

  // Respond to browser back/forward — fly the map and re-fetch stations
  useEffect(() => {
    const onPopState = () => {
      const sp = new URLSearchParams(window.location.search);
      const lat = sp.get("lat");
      const lng = sp.get("lng");
      const zoom = sp.get("zoom");
      const label = sp.get("label");
      setSearchLabel(label);
      if (lat && lng) {
        if (zoom) {
          mapRef.current?.flyTo({
            center: [parseFloat(lng), parseFloat(lat)],
            zoom: parseFloat(zoom),
            duration: 600,
          });
        }
        if (popstateDebounceRef.current) clearTimeout(popstateDebounceRef.current);
        popstateDebounceRef.current = setTimeout(() => fetchStationsAt(lat, lng), 150);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      if (popstateDebounceRef.current) clearTimeout(popstateDebounceRef.current);
    };
  }, [fetchStationsAt]);

  const toggleParameterFilter = (parameter: string): void => {
    setSelectedParameters((current) =>
      current.includes(parameter)
        ? current.filter((item) => item !== parameter)
        : [...current, parameter]
    );
  };

  const centerOnUserLocation = (): void => {
    if (!navigator.geolocation) {
      toast.error(dict.toast.geolocationUnavailable, {
        description: dict.toast.geolocationNotSupported,
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
        setSearchLabel(null);
        pushLocation({ ...nextLocation, zoom: 12 });
        mapRef.current?.flyTo({
          center: [nextLocation.longitude, nextLocation.latitude],
          zoom: 12,
          duration: 1200,
        });
        setIsLocating(false);
      },
      (error) => {
        toast.error(dict.toast.couldNotDetermineLocation, {
          description: error.message || dict.toast.locationLookupFailed,
        });
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
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
      onToggleParameter={toggleParameterFilter}
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
