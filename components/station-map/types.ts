import type { AirDataResult, OfficialStation } from "@/lib/types";

export type StationSnapshotResponse = {
  stationCode: string;
  mean: "MW1" | "TMW" | "HMW";
  readings: AirDataResult[];
};

export type GroupedComponents = {
  light: string[];
  airQuality: string[];
  wind: string[];
  other: string[];
};

export type MeanType = "MW1" | "TMW" | "HMW";

export type UserLocation = {
  latitude: number;
  longitude: number;
};

export type StationComponentProps = {
  station: OfficialStation;
};
