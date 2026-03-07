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

export function aqiToLabel(aqi: number): string {
  if (aqi <= 50)  return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}
