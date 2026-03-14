export type OpenAQDatetime = {
  utc: string;
  local: string;
};

export type OpenAQParameter = {
  id: number;
  name: string;
  displayName: string | null;
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
  timezone: string;
  country: { id: number; code: string; name: string };
  owner: { id: number; name: string };
  provider: { id: number; name: string };
  isMobile: boolean;
  isMonitor: boolean;
  instruments: { id: number; name: string }[];
  sensors: OpenAQSensor[];
  coordinates: { latitude: number; longitude: number };
  bounds: [number, number, number, number];
  distance: number;
  licenses: {
    id: number;
    name: string;
    attribution: { name: string; url: string | null };
    dateFrom: string;
    dateTo: string | null;
  }[];
  datetimeFirst: OpenAQDatetime | null;
  datetimeLast: OpenAQDatetime | null;
};

export type OpenAQCountry = {
  id: number;
  code: string;
  name: string;
  datetimeFirst: string | null;
  datetimeLast: string | null;
  parameters: OpenAQParameter[];
};

export type OpenAQLatestResult = {
  datetime: OpenAQDatetime;
  value: number;
  coordinates: { latitude: number; longitude: number } | null;
  sensorsId: number;
  locationsId: number;
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

export type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
};

export type MeasurementsResponse = {
  locationId: number;
  rollup: Rollup;
  dateFrom: string;
  dateTo: string;
  measurements: OpenAQMeasurement[];
};
