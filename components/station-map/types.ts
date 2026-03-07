import type { AirQualityReading, Rollup } from "@/lib/types";

export type StationSnapshotResponse = {
  locationId: number;
  rollup: Rollup;
  readings: AirQualityReading[];
};

export type GroupedParameters = {
  airQuality: string[];
  meteorological: string[];
  other: string[];
};

export type UserLocation = {
  latitude: number;
  longitude: number;
};
