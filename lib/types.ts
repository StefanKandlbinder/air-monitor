export type OpenAQParameter = {
  id: number;
  name: string;
  displayName: string;
  units: string;
};

export type OpenAQSensor = {
  id: number;
  name: string;
  parameter: OpenAQParameter;
  latestValue?: number | null;
};

export type OpenAQLocation = {
  id: number;
  name: string;
  locality: string | null;
  country: { id: number; code: string; name: string };
  coordinates: { latitude: number; longitude: number };
  sensors: OpenAQSensor[];
  timezone: string;
  datetimeLast: { utc: string; local: string } | null;
};

export type OpenAQMeasurement = {
  sensorId: number;
  locationId: number;
  parameter: string;
  value: number;
  unit: string;
  timestamp: number; // Unix ms, start of period
};

export type Rollup = "hours" | "days";

export type AirQualityReading = {
  parameter: string;
  displayName: string;
  value: number;
  unit: string;
  limit: number;
  timestamp: number; // Unix ms
};
