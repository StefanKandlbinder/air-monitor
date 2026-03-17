"use client";

import { useRef, useState } from "react";
import type { RefObject } from "react";
import Map, { Marker, Popup, type MapRef } from "react-map-gl/maplibre";
import { Compass, LocateFixed, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HoverPopupCard } from "@/components/station-map/HoverPopupCard";
import type { UserLocation } from "@/components/station-map/types";
import { AQI_COLORS } from "@/lib/aqi-colors";
import type { OpenAQLocation } from "@/lib/types";
import Link from "next/link";
import Image from "next/image";
import { useDictionary } from "@/components/providers/DictionaryProvider";
import { useTouchDevice } from "@/hooks/use-touch-device";

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
        onLoad={
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
              onFocus={() => !isTouchDevice && setHoveredLocation(location)}
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
        <div className="fixed left-4 bottom-4 flex gap-1">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => map()?.zoomIn()}
            aria-label={dict.map.zoomIn}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => map()?.zoomOut()}
            aria-label={dict.map.zoomOut}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="ml-2"
            onClick={() => map()?.resetNorth({ duration: 300 })}
            aria-label={dict.map.resetNorth}
          >
            <Compass
              className="h-4 w-4 transition-transform"
              style={{ transform: `rotate(${-bearing - 45}deg)` }}
            />
          </Button>
          {onCenterOnUserLocation ? (
            <Button
              variant="secondary"
              size="icon"
              onClick={onCenterOnUserLocation}
              disabled={isLocating}
              aria-label={dict.map.myLocation}
            >
              <LocateFixed className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      ) : null}
      <Link
        href="https://openaq.org"
        className="absolute top-4 right-4 bg-background/95 backdrop-blur rounded-md p-2 z-10"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Image
          src="/openaq-logo.svg"
          alt="OpenAQ"
          width={36}
          height={20}
          priority
        />
      </Link>
    </div>
  );
}
