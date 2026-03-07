"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { MapRef } from "react-map-gl/maplibre";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { groupParameters, DARK_MAP_STYLE, LIGHT_MAP_STYLE } from "@/components/station-map/constants";
import { MapCard } from "@/components/station-map/MapCard";
import type { PlaceSelection } from "@/components/station-map/LocationSearch";
import type { UserLocation } from "@/components/station-map/types";
import type { OpenAQLocation } from "@/lib/types";

export default function StationMap() {
  const router = useRouter();
  const params = useParams<{ id?: string; period?: string }>();
  const routeLocationId =
    typeof params.id === "string" && params.id.trim()
      ? Number(params.id)
      : null;
  const routePeriod =
    typeof params.period === "string" ? params.period : "hours";

  const mapRef = useRef<MapRef | null>(null);
  const { resolvedTheme } = useTheme();
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedParameters, setSelectedParameters] = useState<string[]>([]);
  const [searchLocations, setSearchLocations] = useState<OpenAQLocation[] | null>(null);
  const [isLoadingStations, setIsLoadingStations] = useState(false);

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

  const AQI_PARAMS = new Set(["pm25", "pm2.5", "pm10", "o3", "co", "so2", "no2"]);

  const aqiLocations = useMemo(() => {
    return locations
      .map((location) => ({
        locationId: location.id,
        sensors: location.sensors
          .filter((s) => AQI_PARAMS.has(s.parameter.name.toLowerCase()))
          .map((s) => ({
            sensorId: s.id,
            param: s.parameter.name.toLowerCase() === "pm2.5" ? "pm25" : s.parameter.name.toLowerCase(),
            units: s.parameter.units,
          })),
      }))
      .filter((l) => l.sensors.length > 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations]);

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
      if (!res.ok) throw new Error("Could not load AQI");
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

  // On initial load, fly to the centroid of all default stations once.
  useEffect(() => {
    if (searchLocations) return; // don't override a search fly
    if (!filteredLocations.length || hasFlownToDataRef.current) return;
    hasFlownToDataRef.current = true;
    const longitude =
      filteredLocations.reduce((acc, l) => acc + l.coordinates.longitude, 0) /
      filteredLocations.length;
    const latitude =
      filteredLocations.reduce((acc, l) => acc + l.coordinates.latitude, 0) /
      filteredLocations.length;
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

  const fetchStationsAt = useCallback((lat: string, lng: string) => {
    setIsLoadingStations(true);
    fetch(`/api/search?lat=${lat}&lon=${lng}`)
      .then((res) => {
        if (!res.ok) return res.json().then((b: { error?: string }) => Promise.reject(new Error(b.error ?? `Server error ${res.status}`)));
        return res.json() as Promise<{ locations: OpenAQLocation[] }>;
      })
      .then((data) => setSearchLocations(data.locations))
      .catch((err) => {
        toast.error("Could not load stations for this location.", {
          description: err instanceof Error ? err.message : undefined,
        });
      })
      .finally(() => setIsLoadingStations(false));
  }, []);

  // On mount: if URL has lat/lng params, fetch stations at those coordinates
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const lat = sp.get("lat");
    const lng = sp.get("lng");
    if (lat && lng) fetchStationsAt(lat, lng);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildLocationParams = (center: { longitude: number; latitude: number; zoom: number }) =>
    new URLSearchParams({
      lat: center.latitude.toFixed(4),
      lng: center.longitude.toFixed(4),
      zoom: center.zoom.toFixed(1),
    }).toString();

  // Continuous pan/zoom — replace in place, no history entry
  const handleMoveEnd = (center: { longitude: number; latitude: number; zoom: number }): void => {
    window.history.replaceState(null, "", `?${buildLocationParams(center)}`);
  };

  // Intentional "go to" — push so back button restores previous position
  const pushLocation = (center: { longitude: number; latitude: number; zoom: number }): void => {
    window.history.pushState(null, "", `?${buildLocationParams(center)}`);
  };

  // Respond to browser back/forward — fly the map and re-fetch stations
  useEffect(() => {
    const onPopState = () => {
      const sp = new URLSearchParams(window.location.search);
      const lat = sp.get("lat");
      const lng = sp.get("lng");
      const zoom = sp.get("zoom");
      if (lat && lng) {
        if (zoom) {
          mapRef.current?.flyTo({
            center: [parseFloat(lng), parseFloat(lat)],
            zoom: parseFloat(zoom),
            duration: 600,
          });
        }
        fetchStationsAt(lat, lng);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
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
        pushLocation({ ...nextLocation, zoom: 12 });
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
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
  };

  const handleLocationSelect = (location: OpenAQLocation): void => {
    const period =
      routeLocationId !== null && routePeriod ? routePeriod : "hours";
    router.push(`/station/${location.id}/${period}`);
  };

  const handlePlaceSelect = async (place: PlaceSelection): Promise<void> => {
    mapRef.current?.flyTo({
      center: [place.lon, place.lat],
      zoom: 10,
      duration: 1000,
    });
    pushLocation({ longitude: place.lon, latitude: place.lat, zoom: 10 });

    setIsLoadingStations(true);
    try {
      const res = await fetch(`/api/search?lat=${place.lat}&lon=${place.lon}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Server error ${res.status}`);
      }
      const data = (await res.json()) as { locations: OpenAQLocation[] };
      setSearchLocations(data.locations);
      setSelectedParameters([]);
      if (data.locations.length === 0) {
        toast.info("No stations found within 25 km of this location.");
      }
    } catch (err) {
      toast.error("Could not load stations for this location.", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsLoadingStations(false);
    }
  };

  const handleClearSearch = (): void => {
    setSearchLocations(null);
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
      isLoadingStations={isLoadingStations}
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
