import { aqiToColor, AQI_COLORS } from "@/lib/aqi-colors";
import type { OpenAQLocation } from "@/lib/types";

export const AQI_PARAMS = new Set(["pm25", "pm2.5", "pm10", "o3", "co", "so2", "no2"]);

export function normalizeParam(name: string): string {
  const lower = name.toLowerCase();
  return lower === "pm2.5" ? "pm25" : lower;
}

export const PARAM_LABELS: Record<string, string> = {
  pm25: "PM2.5", pm10: "PM10", o3: "O3", co: "CO", so2: "SO2", no2: "NO2",
};

/** Parameters shown in the hover popup and detail panel readings. */
export const DISPLAY_PARAMS = ["no2", "pm10", "pm25"] as const;

/** EU/WHO limit values (µg/m³) used for progress bars in detail views. */
export const PARAMETER_LIMITS: Record<string, number> = { no2: 30, pm10: 50, pm25: 25 };

// EPA AQI breakpoints: [C_low, C_high, I_low, I_high]
const BP_PM25  = [[0,12,0,50],[12.1,35.4,51,100],[35.5,55.4,101,150],[55.5,150.4,151,200],[150.5,250.4,201,300],[250.5,350.4,301,400],[350.5,500.4,401,500]];
const BP_PM10  = [[0,54,0,50],[55,154,51,100],[155,254,101,150],[255,354,151,200],[355,424,201,300],[425,504,301,400],[505,604,401,500]];
const BP_O3    = [[0,0.054,0,50],[0.055,0.070,51,100],[0.071,0.085,101,150],[0.086,0.105,151,200],[0.106,0.200,201,300]];
const BP_CO    = [[0,4.4,0,50],[4.5,9.4,51,100],[9.5,12.4,101,150],[12.5,15.4,151,200],[15.5,30.4,201,300],[30.5,40.4,301,400],[40.5,50.4,401,500]];
const BP_SO2   = [[0,35,0,50],[36,75,51,100],[76,185,101,150],[186,304,151,200],[305,604,201,300],[605,804,301,400],[805,1004,401,500]];
const BP_NO2   = [[0,53,0,50],[54,100,51,100],[101,360,101,150],[361,649,151,200],[650,1249,201,300],[1250,1649,301,400],[1650,2049,401,500]];

function truncate(value: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.floor(value * f) / f;
}

function interpolate(c: number, bp: number[][]): number | null {
  for (const [cLo, cHi, iLo, iHi] of bp) {
    if (c >= cLo && c <= cHi) {
      return Math.round(((iHi - iLo) / (cHi - cLo)) * (c - cLo) + iLo);
    }
  }
  return null;
}

function toEpaConcentration(value: number, param: string, units: string): number | null {
  const u = units.toLowerCase();
  switch (param) {
    case "pm25": return truncate(value, 1);
    case "pm10": return truncate(value, 0);
    case "o3":   return truncate(u.includes("ppm") ? value : value / 1960, 3);
    case "co":   return truncate(u.includes("ppm") ? value : u.includes("mg") ? value / 1.145 : value / 1145, 1);
    case "so2":  return truncate(u.includes("ppb") ? value : value / 2.62, 0);
    case "no2":  return truncate(u.includes("ppb") ? value : value / 1.88, 0);
    default:     return null;
  }
}

export function calcSubIndex(value: number, param: string, units: string): number | null {
  const c = toEpaConcentration(value, param, units);
  if (c === null) return null;
  switch (param) {
    case "pm25": return interpolate(c, BP_PM25);
    case "pm10": return interpolate(c, BP_PM10);
    case "o3":   return interpolate(c, BP_O3);
    case "co":   return interpolate(c, BP_CO);
    case "so2":  return interpolate(c, BP_SO2);
    case "no2":  return interpolate(c, BP_NO2);
    default:     return null;
  }
}

export function getAqiSensors(
  sensors: OpenAQLocation["sensors"]
): { sensorId: number; param: string; units: string }[] {
  return sensors
    .filter((s) => AQI_PARAMS.has(s.parameter.name.toLowerCase()))
    .map((s) => ({
      sensorId: s.id,
      param: normalizeParam(s.parameter.name),
      units: s.parameter.units,
    }));
}

export type SensorMeta = { param: string; units: string };

export type LocationInput = {
  locationId: number;
  sensorParams: Record<number, SensorMeta>;
};

export function getAqiSensorParams(
  sensors: OpenAQLocation["sensors"]
): Record<number, SensorMeta> {
  return Object.fromEntries(
    sensors
      .filter((s) => AQI_PARAMS.has(s.parameter.name.toLowerCase()))
      .map((s) => [s.id, { param: normalizeParam(s.parameter.name), units: s.parameter.units }])
  );
}

export function toAqiLocationInputs(locations: OpenAQLocation[]): LocationInput[] {
  return locations
    .map((l) => ({ locationId: l.id, sensorParams: getAqiSensorParams(l.sensors) }))
    .filter((l) => Object.keys(l.sensorParams).length > 0);
}

export type LocationAqi = {
  color: string;
  aqiValue: number | null;
};

/** Compute AQI for all locations using latestValue already present on each sensor. */
export function computeAqiFromLocations(
  locations: OpenAQLocation[]
): Record<number, LocationAqi> {
  const result: Record<number, LocationAqi> = {};

  for (const location of locations) {
    let maxAqi: number | null = null;

    for (const sensor of location.sensors) {
      const param = sensor.parameter.name.toLowerCase();
      if (!AQI_PARAMS.has(param) || sensor.latestValue == null) continue;
      const sub = calcSubIndex(sensor.latestValue, param, sensor.parameter.units);
      if (sub !== null && (maxAqi === null || sub > maxAqi)) maxAqi = sub;
    }

    result[location.id] = {
      color: maxAqi !== null ? aqiToColor(maxAqi) : AQI_COLORS.noData,
      aqiValue: maxAqi,
    };
  }

  return result;
}
