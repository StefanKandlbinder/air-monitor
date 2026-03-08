"use client";

import type { RefObject } from "react";
import { LocateFixed, X } from "lucide-react";
import type { MapRef } from "react-map-gl/maplibre";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FilterPopover } from "@/components/station-map/FilterPopover";
import { LocationSearch, type PlaceSelection } from "@/components/station-map/LocationSearch";
import { StationMapCore } from "@/components/station-map/StationMapCore";
import type { GroupedParameters, UserLocation } from "@/components/station-map/types";
import type { OpenAQLocation } from "@/lib/types";

type MapCardProps = {
  mapRef: RefObject<MapRef | null>;
  mapCenter: { longitude: number; latitude: number; zoom: number };
  mapStyle: string;
  filteredLocations: OpenAQLocation[];
  locationColors?: Record<number, string>;
  locationAqiValues?: Record<number, number>;
  locationLatestValues?: Record<number, Record<string, { value: number; units: string }>>;
  selectedParameters: string[];
  groupedParameters: GroupedParameters;
  isLocating: boolean;
  userLocation: UserLocation | null;
  isLoadingStations: boolean;
  selectedLabel?: string | null;
  onToggleParameter: (parameter: string) => void;
  onClearParameters: () => void;
  onCenterOnUserLocation: () => void;
  onSelectLocation: (location: OpenAQLocation) => void;
  onSelectPlace: (place: PlaceSelection) => void;
  onClearSearch: () => void;
  onMoveEnd?: (center: { longitude: number; latitude: number; zoom: number }) => void;
};

export function MapCard({
  mapRef,
  mapCenter,
  mapStyle,
  filteredLocations,
  locationColors,
  locationAqiValues,
  locationLatestValues,
  selectedParameters,
  groupedParameters,
  isLocating,
  userLocation,
  isLoadingStations,
  selectedLabel,
  onToggleParameter,
  onClearParameters,
  onCenterOnUserLocation,
  onSelectLocation,
  onSelectPlace,
  onClearSearch,
  onMoveEnd,
}: MapCardProps) {
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-2xl">Linz Air Monitor</CardTitle>
            <CardDescription>
              Live station map powered by OpenAQ.
            </CardDescription>
          </div>
          <Badge variant="secondary">{filteredLocations.length} stations</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col">
        <div className="mb-3 flex flex-wrap gap-2">
          <LocationSearch onSelectPlace={onSelectPlace} isLoadingStations={isLoadingStations} selectedLabel={selectedLabel} />
          <FilterPopover
            groupedParameters={groupedParameters}
            selectedParameters={selectedParameters}
            onToggleParameter={onToggleParameter}
            onClear={onClearParameters}
          />
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={onCenterOnUserLocation}
            disabled={isLocating}
            className="ml-auto"
          >
            <LocateFixed className="mr-1 h-4 w-4" />
            {isLocating ? "Locating..." : "My location"}
          </Button>
        </div>
        {selectedParameters.length ? (
          <p className="mb-2 text-xs text-muted-foreground">
            Active filters: {selectedParameters.join(", ")}
          </p>
        ) : null}
        <div className="relative h-[600px] overflow-hidden rounded-lg border border-border/60">
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
            onSelectLocation={onSelectLocation}
            onMoveEnd={onMoveEnd}
          />
        </div>
      </CardContent>
    </Card>
  );
}
