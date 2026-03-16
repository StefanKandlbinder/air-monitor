import { unstable_cache } from "next/cache";
import { openaqGet } from "@/lib/openaq";
import { aqiToColor, AQI_COLORS } from "@/lib/aqi-colors";
import { calcSubIndex, toAqiLocationInputs } from "@/lib/aqi";
import type { LocationInput } from "@/lib/aqi";
export { toAqiLocationInputs } from "@/lib/aqi";
export type { LocationInput, SensorMeta } from "@/lib/aqi";
import { withConcurrency } from "@/lib/concurrency";
import { DAY_MS, WEEK_MS, secondsUntilNextHour } from "@/lib/time";
import type { OpenAQLocation } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OpenAQLocationsResponse = {
  meta: { found: number; page: number; limit: number };
  results: OpenAQLocation[];
};

type OpenAQLatestEntry = {
  datetime: { utc: string; local: string };
  value: number;
  coordinates: { latitude: number; longitude: number } | null;
  sensorsId: number;
  locationsId: number;
};

type OpenAQLatestResponse = { results: OpenAQLatestEntry[] };

export type LatestParamValue = { value: number; units: string; timestamp?: string };

export type AqiResult = {
  colors: Record<number, string>;
  aqiValues: Record<number, number>;
  latestValues: Record<number, Record<string, LatestParamValue>>;
  subIndices: Record<number, Record<string, number>>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_AGE_MS = DAY_MS;

function isRecentLocation(location: OpenAQLocation): boolean {
  const last = location.datetimeLast?.utc;
  return !!last && Date.now() - new Date(last).getTime() <= WEEK_MS;
}

// ---------------------------------------------------------------------------
// Fetch functions
// ---------------------------------------------------------------------------

export const fetchLocations = unstable_cache(
  async (lat: number, lon: number, radius = 25000): Promise<OpenAQLocation[]> => {
    const data = await openaqGet<OpenAQLocationsResponse>("/v3/locations", {
      coordinates: `${lat},${lon}`,
      radius: String(radius),
      limit: "100",
    }, { revalidate: 604800 });
    return data.results.filter(isRecentLocation);
  },
  ["locations"],
  { revalidate: 604800 }
);

async function fetchLocationLatest(locationId: number): Promise<OpenAQLatestEntry[]> {
  try {
    const data = await openaqGet<OpenAQLatestResponse>(
      `/v3/locations/${locationId}/latest`,
      undefined,
      { revalidate: secondsUntilNextHour() }
    );
    return data.results;
  } catch {
    return [];
  }
}

async function fetchAqiImpl(locations: LocationInput[]): Promise<AqiResult> {
  const locationResults = await withConcurrency(
    locations.map(({ locationId }) => () => fetchLocationLatest(locationId)),
    5
  );

  const now = Date.now();
  const colors: Record<number, string> = {};
  const aqiValues: Record<number, number> = {};
  const latestValues: Record<number, Record<string, LatestParamValue>> = {};
  const subIndices: Record<number, Record<string, number>> = {};

  for (let i = 0; i < locations.length; i++) {
    const { locationId, sensorParams } = locations[i];
    const result = locationResults[i];

    if (result.status !== "fulfilled") {
      colors[locationId] = AQI_COLORS.noData;
      latestValues[locationId] = {};
      subIndices[locationId] = {};
      continue;
    }

    let maxAqi: number | null = null;
    const params: Record<string, LatestParamValue> = {};
    const si: Record<string, number> = {};

    for (const entry of result.value) {
      const meta = sensorParams[entry.sensorsId];
      if (!meta) continue;
      if (entry.value == null || entry.value < 0) continue;
      const timestamp = entry.datetime?.utc ? Date.parse(entry.datetime.utc) : 0;
      if (now - timestamp > MAX_AGE_MS) continue;

      const subIndex = calcSubIndex(entry.value, meta.param, meta.units);
      params[meta.param] = { value: entry.value, units: meta.units, timestamp: entry.datetime?.utc };
      if (subIndex !== null) {
        si[meta.param] = subIndex;
        if (maxAqi === null || subIndex > maxAqi) maxAqi = subIndex;
      }
    }

    colors[locationId] = maxAqi !== null ? aqiToColor(maxAqi) : AQI_COLORS.noData;
    if (maxAqi !== null) aqiValues[locationId] = maxAqi;
    latestValues[locationId] = params;
    subIndices[locationId] = si;
  }

  return { colors, aqiValues, latestValues, subIndices };
}

export function fetchAqi(locations: LocationInput[]): Promise<AqiResult> {
  if (locations.length === 0) {
    return Promise.resolve({ colors: {}, aqiValues: {}, latestValues: {}, subIndices: {} });
  }
  return fetchAqiImpl(locations);
}

