"use client";

import { useTheme } from "next-themes";
import { useRouter, useParams } from "next/navigation";
import { DARK_MAP_STYLE, LIGHT_MAP_STYLE } from "@/components/station-map/constants";
import { StationMapCore } from "@/components/station-map/StationMapCore";
import type { OpenAQLocation } from "@/lib/types";

type StationMapPreviewProps = {
  locations: OpenAQLocation[];
  activeLocation: OpenAQLocation | null;
  locationColors?: Record<number, string>;
};

export function StationMapPreview({ locations, activeLocation, locationColors }: StationMapPreviewProps) {
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const params = useParams<{ period?: string }>();
  const mapStyle = resolvedTheme === "dark" ? DARK_MAP_STYLE : LIGHT_MAP_STYLE;

  const initialViewState = activeLocation
    ? {
        longitude: activeLocation.coordinates.longitude,
        latitude: activeLocation.coordinates.latitude,
        zoom: 12,
      }
    : { longitude: 14.297777999683168, latitude: 48.323333000053104, zoom: 10 };

  const period = params.period ?? "hours";

  return (
    <div className="h-full w-full overflow-hidden rounded-lg border border-border/60">
      <StationMapCore
        mapStyle={mapStyle}
        initialViewState={initialViewState}
        locations={locations}
        locationColors={locationColors}
        showNavigation={false}
        onSelectLocation={(location) => router.push(`/station/${location.id}/${period}`)}
      />
    </div>
  );
}
