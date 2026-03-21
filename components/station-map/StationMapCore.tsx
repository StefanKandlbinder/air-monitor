"use client";

import { useRef, useState } from "react";
import type { RefObject } from "react";
import Map, { Marker, Popup, type MapRef } from "react-map-gl/maplibre";
import { HoverPopupCard } from "@/components/station-map/HoverPopupCard";
import { MapNavigation } from "@/components/station-map/MapNavigation";
import type { UserLocation } from "@/components/station-map/types";
import { AQI_COLORS } from "@/lib/aqiColors";
import type { OpenAQLocation } from "@/lib/types";
import { useDictionary } from "@/components/providers/DictionaryProvider";
import { useTouchDevice } from "@/lib/hooks/useTouchDevice";

type MapCenter = { longitude: number; latitude: number; zoom: number };

type StationMapCoreProps = {
  mapRef?: RefObject<MapRef | null>;
  mapStyle: string;
  initialViewState: MapCenter;
  locations: OpenAQLocation[];
  locationColors?: Record<number, string>;
  locationAqiValues?: Record<number, number>;
  locationLatestValues?: Record<
    number,
    Record<string, { value: number; units: string }>
  >;
  userLocation?: UserLocation | null;
  showNavigation?: boolean;
  isLocating?: boolean;
  onCenterOnUserLocation?: () => void;
  onSelectLocation: (location: OpenAQLocation) => void;
  onMoveEnd?: (center: MapCenter) => void;
};

export const DEFAULT_MARKER_COLOR = AQI_COLORS.noData;

export function StationMapCore({
  mapRef: externalMapRef,
  mapStyle,
  initialViewState,
  locations,
  locationColors,
  locationAqiValues,
  locationLatestValues,
  userLocation,
  showNavigation = true,
  isLocating = false,
  onCenterOnUserLocation,
  onSelectLocation,
  onMoveEnd,
}: StationMapCoreProps) {
  const dict = useDictionary();
  const [hoveredLocation, setHoveredLocation] = useState<OpenAQLocation | null>(
    null,
  );
  const [clickedLocation, setClickedLocation] = useState<OpenAQLocation | null>(
    null,
  );
  const isTouchDevice = useTouchDevice();
  const [bearing, setBearing] = useState(0);
  const internalRef = useRef<MapRef | null>(null);
  const activeRef = externalMapRef ?? internalRef;

  const map = () => activeRef.current;

  return (
    <div className="relative h-full w-full">
      <Map
        ref={activeRef}
        initialViewState={initialViewState}
        mapStyle={mapStyle}
        style={{ width: "100%", height: "100%" }}
        onMoveEnd={
          onMoveEnd
            ? (e) => {
                const { lng, lat } = e.target.getCenter();
                onMoveEnd({
                  longitude: lng,
                  latitude: lat,
                  zoom: e.target.getZoom(),
                });
              }
            : undefined
        }
        onRotate={(e) => setBearing(e.target.getBearing())}
      >
        {userLocation ? (
          <Marker
            longitude={userLocation.longitude}
            latitude={userLocation.latitude}
            anchor="bottom"
          >
            <div
              className="relative flex items-center justify-center"
              aria-label={dict.map.yourCurrentLocation}
            >
              <div className="absolute h-4 w-4 rounded-full bg-emerald-500 opacity-75 animate-ping" />
              <div className="h-4 w-4 rounded-full border-2 border-white bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.25)]" />
            </div>
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
              className={`${isTouchDevice ? "h-10 w-10" : "h-5 w-5"} cursor-pointer flex items-center justify-center rounded-full transition hover:scale-110`}
              onClick={() => {
                if (isTouchDevice) {
                  setClickedLocation((current) =>
                    current?.id === location.id ? null : location,
                  );
                } else {
                  onSelectLocation(location);
                }
              }}
              onMouseEnter={() =>
                !isTouchDevice && setHoveredLocation(location)
              }
              onMouseLeave={() =>
                !isTouchDevice &&
                setHoveredLocation((current) =>
                  current?.id === location.id ? null : current,
                )
              }
              onFocus={() => {
                if (isTouchDevice) return;
                setHoveredLocation(location);
                map()?.easeTo({
                  center: [location.coordinates.longitude, location.coordinates.latitude],
                  duration: 500,
                });
              }}
              onBlur={() =>
                !isTouchDevice &&
                setHoveredLocation((current) =>
                  current?.id === location.id ? null : current,
                )
              }
              type="button"
              aria-label={`Open ${location.name}`}
            >
              <div
                className="h-5 w-5 rounded-full border-2 border-white"
                style={{
                  backgroundColor:
                    locationColors?.[location.id] ?? DEFAULT_MARKER_COLOR,
                  boxShadow: `0 0 0 6px ${locationColors?.[location.id] ?? DEFAULT_MARKER_COLOR}40`,
                }}
              />
            </button>
          </Marker>
        ))}

        {(isTouchDevice ? clickedLocation : hoveredLocation) ? (
          <Popup
            longitude={
              (isTouchDevice ? clickedLocation! : hoveredLocation!).coordinates
                .longitude
            }
            latitude={
              (isTouchDevice ? clickedLocation! : hoveredLocation!).coordinates
                .latitude
            }
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
            {(() => {
              const loc = isTouchDevice ? clickedLocation! : hoveredLocation!;
              return (
                <HoverPopupCard
                  location={loc}
                  aqiValue={locationAqiValues?.[loc.id]}
                  aqiColor={locationColors?.[loc.id]}
                  latestValues={locationLatestValues?.[loc.id]}
                  onGoToDetail={
                    isTouchDevice
                      ? () => {
                          setClickedLocation(null);
                          onSelectLocation(loc);
                        }
                      : undefined
                  }
                />
              );
            })()}
          </Popup>
        ) : null}
      </Map>

      {showNavigation ? (
        <MapNavigation
          bearing={bearing}
          isLocating={isLocating}
          onZoomIn={() => map()?.zoomIn()}
          onZoomOut={() => map()?.zoomOut()}
          onResetNorth={() => map()?.resetNorth({ duration: 300 })}
          onCenterOnUserLocation={onCenterOnUserLocation}
        />
      ) : null}
    </div>
  );
}
