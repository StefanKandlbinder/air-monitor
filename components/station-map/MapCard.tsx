"use client";

import type { RefObject } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import {
  LocationSearch,
  type PlaceSelection,
} from "@/components/station-map/LocationSearch";
import { StationMapCore } from "@/components/station-map/StationMapCore";
import type { UserLocation } from "@/components/station-map/types";
import type { OpenAQLocation } from "@/lib/types";

type MapCardProps = {
  mapRef: RefObject<MapRef | null>;
  mapCenter: { longitude: number; latitude: number; zoom: number };
  mapStyle: string;
  filteredLocations: OpenAQLocation[];
  locationColors?: Record<number, string>;
  locationAqiValues?: Record<number, number>;
  locationLatestValues?: Record<
    number,
    Record<string, { value: number; units: string }>
  >;
  isLocating: boolean;
  userLocation: UserLocation | null;
  selectedLabel?: string | null;
  onCenterOnUserLocation: () => void;
  onSelectLocation: (location: OpenAQLocation) => void;
  onSelectPlace: (place: PlaceSelection) => void;
  onClearSearch: () => void;
  onMoveEnd?: (center: {
    longitude: number;
    latitude: number;
    zoom: number;
  }) => void;
};

export function MapCard({
  mapRef,
  mapCenter,
  mapStyle,
  filteredLocations,
  locationColors,
  locationAqiValues,
  locationLatestValues,
  isLocating,
  userLocation,
  selectedLabel,
  onCenterOnUserLocation,
  onSelectLocation,
  onSelectPlace,
  onMoveEnd,
}: MapCardProps) {
  return (
    <div
      className="explore-map relative overflow-hidden h-full"
    >
      {/* Full-height map */}
      <StationMapCore
        mapRef={mapRef}
        mapStyle={mapStyle}
        initialViewState={mapCenter}
        locations={filteredLocations}
        locationColors={locationColors}
        locationAqiValues={locationAqiValues}
        locationLatestValues={locationLatestValues}
        userLocation={userLocation}
        showNavigation
        isLocating={isLocating}
        onCenterOnUserLocation={onCenterOnUserLocation}
        onSelectLocation={onSelectLocation}
        onMoveEnd={onMoveEnd}
      />

      {/* Toolbar overlay */}
      <div className="absolute left-4 top-[calc(3.5rem+1rem)] z-10 flex flex-wrap items-center gap-2">
        <LocationSearch
          onSelectPlace={onSelectPlace}
          selectedLabel={selectedLabel}
        />
      </div>

      {/* {selectedParameters.length ? (
        <p className="absolute bottom-4 left-4 z-10 rounded-md bg-background/80 px-2 py-1 text-xs text-muted-foreground backdrop-blur">
          Active filters: {selectedParameters.join(", ")}
        </p>
      ) : null} */}
    </div>
  );
}
