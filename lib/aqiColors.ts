export const PARAM_COLORS: Record<string, string> = {
  no2: "var(--color-cyan-500)",
  pm10: "var(--color-orange-500)",
  pm25: "var(--color-purple-500)",
};

export const AQI_COLORS = {
  good: "#00e400",
  moderate: "#ffff00",
  unhealthySensitive: "#ff7e00",
  unhealthy: "#ff0000",
  veryUnhealthy: "#8f3f97",
  hazardous: "#7e0023",
  noData: "#22d3ee",
} as const;

export function aqiToColor(aqi: number): string {
  if (aqi <= 50)  return AQI_COLORS.good;
  if (aqi <= 100) return AQI_COLORS.moderate;
  if (aqi <= 150) return AQI_COLORS.unhealthySensitive;
  if (aqi <= 200) return AQI_COLORS.unhealthy;
  if (aqi <= 300) return AQI_COLORS.veryUnhealthy;
  return AQI_COLORS.hazardous;
}

export type AQILabels = {
  good: string;
  moderate: string;
  unhealthySensitive: string;
  unhealthy: string;
  veryUnhealthy: string;
  hazardous: string;
};

const DEFAULT_AQI_LABELS: AQILabels = {
  good: "Good",
  moderate: "Moderate",
  unhealthySensitive: "Unhealthy for Sensitive Groups",
  unhealthy: "Unhealthy",
  veryUnhealthy: "Very Unhealthy",
  hazardous: "Hazardous",
};

export function aqiToLabel(aqi: number, labels: AQILabels = DEFAULT_AQI_LABELS): string {
  if (aqi <= 50)  return labels.good;
  if (aqi <= 100) return labels.moderate;
  if (aqi <= 150) return labels.unhealthySensitive;
  if (aqi <= 200) return labels.unhealthy;
  if (aqi <= 300) return labels.veryUnhealthy;
  return labels.hazardous;
}
