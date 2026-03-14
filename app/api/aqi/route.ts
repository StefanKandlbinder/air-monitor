import { NextResponse } from "next/server";
import { openaqGet } from "@/lib/openaq";
import { aqiToColor, AQI_COLORS } from "@/lib/aqi-colors";
import { calcSubIndex } from "@/lib/aqi";
import { withConcurrency } from "@/lib/concurrency";
import { openaqErrorResponse } from "@/lib/openaq-errors";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Actual shape returned by /v3/locations/{id}/latest
type OpenAQLatestEntry = {
  datetime: { utc: string; local: string };
  value: number;
  coordinates: { latitude: number; longitude: number } | null;
  sensorsId: number;
  locationsId: number;
};

type OpenAQLatestResponse = { results: OpenAQLatestEntry[] };

type SensorMeta = { param: string; units: string };

type LocationInput = {
  locationId: number;
  /** sensorsId → { param (normalized), units } for AQI-relevant sensors */
  sensorParams: Record<number, SensorMeta>;
};

type LatestParamValue = { value: number; units: string; timestamp?: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

async function fetchLocationLatest(locationId: number): Promise<OpenAQLatestEntry[]> {
  try {
    const data = await openaqGet<OpenAQLatestResponse>(
      `/v3/locations/${locationId}/latest`,
      undefined,
      { revalidate: 3600 }
    );
    return data.results;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const { locations } = (await request.json()) as { locations: LocationInput[] };

    if (!Array.isArray(locations) || locations.length === 0) {
      return NextResponse.json({ colors: {}, latestValues: {} });
    }

    const locationResults = await withConcurrency(
      locations.map(({ locationId }) => () => fetchLocationLatest(locationId)),
      10
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
        const timestamp = entry.datetime?.utc ? new Date(entry.datetime.utc).getTime() : 0;
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

    return NextResponse.json(
      { colors, aqiValues, latestValues, subIndices },
      { headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=300" } }
    );
  } catch (error) {
    return openaqErrorResponse(error);
  }
}
