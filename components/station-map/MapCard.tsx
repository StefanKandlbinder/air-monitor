"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import { LocateFixed } from "lucide-react";
import Map, {
  Marker,
  NavigationControl,
  Popup,
  type MapRef,
} from "react-map-gl/maplibre";
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
import { HoverPopupCard } from "@/components/station-map/HoverPopupCard";
import type {
  GroupedComponents,
  StationSnapshotResponse,
  UserLocation,
} from "@/components/station-map/types";
import type { OfficialStation } from "@/lib/types";

type MapCardProps = {
  mapRef: RefObject<MapRef | null>;
  mapCenter: { longitude: number; latitude: number; zoom: number };
  mapStyle: string;
  filteredStations: OfficialStation[];
  activeHoveredStation: OfficialStation | null;
  hoveredSnapshot: StationSnapshotResponse | null;
  hoveredSnapshotLoading: boolean;
  selectedComponents: string[];
  groupedComponents: GroupedComponents;
  isLocating: boolean;
  userLocation: UserLocation | null;
  onToggleComponent: (component: string) => void;
  onClearComponents: () => void;
  onCenterOnUserLocation: () => void;
  onSelectStation: (station: OfficialStation) => void;
  onHoverStationChange: Dispatch<SetStateAction<OfficialStation | null>>;
};

export function MapCard({
  mapRef,
  mapCenter,
  mapStyle,
  filteredStations,
  activeHoveredStation,
  hoveredSnapshot,
  hoveredSnapshotLoading,
  selectedComponents,
  groupedComponents,
  isLocating,
  userLocation,
  onToggleComponent,
  onClearComponents,
  onCenterOnUserLocation,
  onSelectStation,
  onHoverStationChange,
}: MapCardProps) {
  return (
    <Card className="flex h-full flex-col border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-2xl">Linz Air Monitor</CardTitle>
            <CardDescription>
              Live station map from Upper Austria environmental data.
            </CardDescription>
          </div>
          <Badge variant="secondary">{filteredStations.length} stations</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div className="mb-3 flex gap-2">
          <FilterPopover
            groupedComponents={groupedComponents}
            selectedComponents={selectedComponents}
            onToggleComponent={onToggleComponent}
            onClear={onClearComponents}
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
        {selectedComponents.length ? (
          <p className="mb-2 text-xs text-muted-foreground">
            Active filters: {selectedComponents.join(", ")}
          </p>
        ) : null}
        <div className="relative h-full min-h-[560px] flex-1 overflow-hidden rounded-lg border border-border/60">
          <Map
            ref={mapRef}
            initialViewState={mapCenter}
            mapStyle={mapStyle}
            style={{ width: "100%", height: "100%" }}
          >
            <NavigationControl position="top-right" />
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
            {filteredStations.map((station) => (
              <Marker
                key={station.code}
                longitude={station.geoLaenge}
                latitude={station.geoBreite}
                anchor="bottom"
              >
                <button
                  className="h-4 w-4 rounded-full border-2 border-white bg-cyan-400 shadow-[0_0_0_6px_rgba(8,145,178,0.25)] transition hover:scale-110"
                  onClick={() => onSelectStation(station)}
                  onMouseEnter={() => onHoverStationChange(station)}
                  onMouseLeave={() =>
                    onHoverStationChange((current) =>
                      current?.code === station.code ? null : current,
                    )
                  }
                  onFocus={() => onHoverStationChange(station)}
                  onBlur={() =>
                    onHoverStationChange((current) =>
                      current?.code === station.code ? null : current,
                    )
                  }
                  type="button"
                  aria-label={`Open ${station.kurzname}`}
                />
              </Marker>
            ))}

            {activeHoveredStation ? (
              <Popup
                longitude={activeHoveredStation.geoLaenge}
                latitude={activeHoveredStation.geoBreite}
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
                  station={activeHoveredStation}
                  snapshot={hoveredSnapshot}
                  isLoading={hoveredSnapshotLoading}
                />
              </Popup>
            ) : null}
          </Map>
        </div>
      </CardContent>
    </Card>
  );
}
