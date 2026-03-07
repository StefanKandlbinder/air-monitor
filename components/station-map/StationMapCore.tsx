"use client";

import { useState } from "react";
import type { RefObject } from "react";
import Map, {
  Marker,
  NavigationControl,
  Popup,
  type MapRef,
} from "react-map-gl/maplibre";
import { HoverPopupCard } from "@/components/station-map/HoverPopupCard";
import type { UserLocation } from "@/components/station-map/types";
import { AQI_COLORS } from "@/lib/aqi-colors";
import type { OpenAQLocation } from "@/lib/types";

type MapCenter = { longitude: number; latitude: number; zoom: number };

type StationMapCoreProps = {
  mapRef?: RefObject<MapRef | null>;
  mapStyle: string;
  initialViewState: MapCenter;
  locations: OpenAQLocation[];
  locationColors?: Record<number, string>;
  locationAqiValues?: Record<number, number>;
  locationLatestValues?: Record<number, Record<string, { value: number; units: string }>>;
  userLocation?: UserLocation | null;
  showNavigation?: boolean;
  onSelectLocation: (location: OpenAQLocation) => void;
  onMoveEnd?: (center: MapCenter) => void;
};

export const DEFAULT_MARKER_COLOR = AQI_COLORS.noData;

export function StationMapCore({
  mapRef,
  mapStyle,
  initialViewState,
  locations,
  locationColors,
  locationAqiValues,
  locationLatestValues,
  userLocation,
  showNavigation = true,
  onSelectLocation,
  onMoveEnd,
}: StationMapCoreProps) {
  const [hoveredLocation, setHoveredLocation] = useState<OpenAQLocation | null>(null);

  return (
    <Map
      ref={mapRef}
      initialViewState={initialViewState}
      mapStyle={mapStyle}
      style={{ width: "100%", height: "100%" }}
      onLoad={onMoveEnd ? (e) => {
        const { lng, lat } = e.target.getCenter();
        const zoom = e.target.getZoom();
        onMoveEnd({ longitude: lng, latitude: lat, zoom });
      } : undefined}
      onMoveEnd={onMoveEnd ? (e) => {
        const { lng, lat } = e.target.getCenter();
        const zoom = e.target.getZoom();
        onMoveEnd({ longitude: lng, latitude: lat, zoom });
      } : undefined}
    >
      {showNavigation ? <NavigationControl position="top-right" /> : null}

      {userLocation ? (
        <Marker
          longitude={userLocation.longitude}
          latitude={userLocation.latitude}
          anchor="bottom"
        >
          <div
            className="h-4 w-4 rounded-full border-2 border-white bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.25)]"
            aria-label="Your current location"
          />
        </Marker>
      ) : null}

      {locations.map((location) => (
        <Marker
          key={location.id}
          longitude={location.coordinates.longitude}
          latitude={location.coordinates.latitude}
          anchor="bottom"
        >
          <button
            className="h-4 w-4 rounded-full border-2 border-white transition hover:scale-110"
            style={{
              backgroundColor: locationColors?.[location.id] ?? DEFAULT_MARKER_COLOR,
              boxShadow: `0 0 0 6px ${(locationColors?.[location.id] ?? DEFAULT_MARKER_COLOR)}40`,
            }}
            onClick={() => onSelectLocation(location)}
            onMouseEnter={() => setHoveredLocation(location)}
            onMouseLeave={() =>
              setHoveredLocation((current) =>
                current?.id === location.id ? null : current
              )
            }
            onFocus={() => setHoveredLocation(location)}
            onBlur={() =>
              setHoveredLocation((current) =>
                current?.id === location.id ? null : current
              )
            }
            type="button"
            aria-label={`Open ${location.name}`}
          />
        </Marker>
      ))}

      {hoveredLocation ? (
        <Popup
          longitude={hoveredLocation.coordinates.longitude}
          latitude={hoveredLocation.coordinates.latitude}
          anchor="top"
          closeOnClick={false}
          closeButton={false}
          style={{
            maxWidth: "none",
            padding: 0,
            border: "none",
            backgroundColor: "transparent",
          }}
        >
          <HoverPopupCard
            location={hoveredLocation}
            aqiValue={locationAqiValues?.[hoveredLocation.id]}
            aqiColor={locationColors?.[hoveredLocation.id]}
            latestValues={locationLatestValues?.[hoveredLocation.id]}
          />
        </Popup>
      ) : null}
    </Map>
  );
}
