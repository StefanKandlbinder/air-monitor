import type { GroupedParameters } from "@/components/station-map/types";

export const LIGHT_MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
export const DARK_MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const AIR_QUALITY_PARAMS = new Set([
  "no2",
  "pm10",
  "pm25",
  "pm2.5",
  "o3",
  "so2",
  "co",
  "bc",
  "co2",
]);

const METEOROLOGICAL_PARAMS = new Set([
  "temperature",
  "humidity",
  "pressure",
  "wind_speed",
  "wind_direction",
  "dewpoint",
]);

export function groupParameters(
  availableParameters: string[]
): GroupedParameters {
  const groups: GroupedParameters = {
    airQuality: [],
    meteorological: [],
    other: [],
  };

  for (const param of availableParameters) {
    if (AIR_QUALITY_PARAMS.has(param)) {
      groups.airQuality.push(param);
    } else if (METEOROLOGICAL_PARAMS.has(param)) {
      groups.meteorological.push(param);
    } else {
      groups.other.push(param);
    }
  }

  return groups;
}
