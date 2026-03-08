import { NextResponse } from "next/server";
import { openaqGet } from "@/lib/openaq";
import { aqiToColor, AQI_COLORS } from "@/lib/aqi-colors";
import { calcSubIndex, normalizeParam } from "@/lib/aqi";
import { floorToHour, toHourIso } from "@/lib/time";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SensorInput = {
  sensorId: number;
  param: string;
  units: string;
};

type LocationInput = {
  locationId: number;
  sensors: SensorInput[];
};

type SensorHoursResult = { value: number; period?: { datetimeFrom?: { utc?: string } } | null };
type SensorHoursResponse = { results: SensorHoursResult[] };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------


async function fetchLatest(sensorId: number): Promise<{ value: number; timestamp: string } | null> {
  const hourStart = floorToHour(new Date());
  const to = new Date(hourStart.getTime() + 3_600_000); // end of current hour
  const from = new Date(hourStart.getTime() - 24 * 60 * 60 * 1000);
  try {
    const data = await openaqGet<SensorHoursResponse>(
      `/v3/sensors/${sensorId}/hours`,
      { datetime_from: toHourIso(from), datetime_to: toHourIso(to), limit: "100" },
      { revalidate: 3600 }
    );
    if (!data.results.length) return null;
    // OpenAQ returns ascending by default — pick the entry with the latest timestamp
    const latest = data.results.reduce<SensorHoursResult | null>((best, r) => {
      if (r.value == null) return best;
      if (!best) return r;
      const rTime = r.period?.datetimeFrom?.utc ?? "";
      const bestTime = best.period?.datetimeFrom?.utc ?? "";
      return rTime > bestTime ? r : best;
    }, null);
    if (!latest || latest.value == null) return null;
    return { value: latest.value, timestamp: latest.period?.datetimeFrom?.utc ?? "" };
  } catch {
    return null;
  }
}

/** Run tasks with at most `limit` concurrent executions. */
async function withConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      try {
        results[i] = { status: "fulfilled", value: await tasks[i]() };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

type LatestParamValue = { value: number; units: string; timestamp?: string };

export async function POST(request: Request) {
  try {
    const { locations } = (await request.json()) as { locations: LocationInput[] };

    if (!Array.isArray(locations) || locations.length === 0) {
      return NextResponse.json({ colors: {}, latestValues: {} });
    }

    // Flatten all sensor fetches into a single task list so concurrency
    // is controlled globally, preventing OpenAQ rate limiting.
    type SensorTask = { locationId: number; param: string; units: string; sensorId: number };
    const allSensorTasks: SensorTask[] = locations.flatMap(({ locationId, sensors }) =>
      sensors.map(({ sensorId, param, units }) => ({ locationId, param, units, sensorId }))
    );

    const sensorResults = await withConcurrency(
      allSensorTasks.map(({ sensorId, param: rawParam, units, locationId }) => async () => {
        const param = normalizeParam(rawParam);
        const result = await fetchLatest(sensorId);
        if (result === null) return null;
        const { value, timestamp } = result;
        return { locationId, param, units, value, timestamp, subIndex: calcSubIndex(value, param, units) };
      }),
      10 // max 10 concurrent requests to OpenAQ
    );

    // Aggregate per-location
    const locationData = new Map<number, { maxAqi: number | null; params: Record<string, LatestParamValue>; subIndices: Record<string, number> }>();
    for (const { locationId } of allSensorTasks) {
      if (!locationData.has(locationId)) {
        locationData.set(locationId, { maxAqi: null, params: {}, subIndices: {} });
      }
    }

    for (const r of sensorResults) {
      if (r.status !== "fulfilled" || r.value === null) continue;
      const { locationId, param, units, value, timestamp, subIndex } = r.value;
      const loc = locationData.get(locationId)!;
      loc.params[param] = { value, units, timestamp };
      if (subIndex !== null) {
        loc.subIndices[param] = subIndex;
        if (loc.maxAqi === null || subIndex > loc.maxAqi) {
          loc.maxAqi = subIndex;
        }
      }
    }

    const colors: Record<number, string> = {};
    const aqiValues: Record<number, number> = {};
    const latestValues: Record<number, Record<string, LatestParamValue>> = {};
    const subIndices: Record<number, Record<string, number>> = {};

    for (const [locationId, { maxAqi, params, subIndices: si }] of locationData) {
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
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
