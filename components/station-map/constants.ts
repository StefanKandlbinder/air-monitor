import type { GroupedComponents } from "@/components/station-map/types";

export const LIGHT_MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
export const DARK_MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const LIGHT_COMPONENTS = new Set(["BOE", "SUN", "SOL", "LUX"]);
const AIR_QUALITY_COMPONENTS = new Set([
  "NO2",
  "SO2",
  "O3",
  "CO",
  "PM10kont",
  "PM25kont",
  "PM10",
  "PM25",
]);
const WIND_COMPONENTS = new Set(["WIV", "WIR", "WIG", "WISP"]);

export function groupComponents(availableComponents: string[]): GroupedComponents {
  const groups: GroupedComponents = {
    light: [],
    airQuality: [],
    wind: [],
    other: [],
  };

  for (const component of availableComponents) {
    if (LIGHT_COMPONENTS.has(component)) {
      groups.light.push(component);
    } else if (AIR_QUALITY_COMPONENTS.has(component) || component.startsWith("PM")) {
      groups.airQuality.push(component);
    } else if (WIND_COMPONENTS.has(component) || component.startsWith("WI")) {
      groups.wind.push(component);
    } else {
      groups.other.push(component);
    }
  }

  return groups;
}
