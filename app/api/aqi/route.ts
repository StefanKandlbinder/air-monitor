import { NextResponse } from "next/server";
import { openaqGet } from "@/lib/openaq";
import { aqiToColor, AQI_COLORS } from "@/lib/aqi-colors";

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
// EPA AQI breakpoints
// Each row: [C_low, C_high, I_low, I_high]
// ---------------------------------------------------------------------------

// PM2.5 µg/m³  – truncate to 1 decimal place
const BP_PM25 = [
  [0.0,   12.0,   0,  50],
  [12.1,  35.4,  51, 100],
  [35.5,  55.4, 101, 150],
  [55.5, 150.4, 151, 200],
  [150.5, 250.4, 201, 300],
  [250.5, 350.4, 301, 400],
  [350.5, 500.4, 401, 500],
];

// PM10 µg/m³  – truncate to integer
const BP_PM10 = [
  [0,   54,   0,  50],
  [55,  154,  51, 100],
  [155, 254, 101, 150],
  [255, 354, 151, 200],
  [355, 424, 201, 300],
  [425, 504, 301, 400],
  [505, 604, 401, 500],
];

// O3 ppm (8-hour avg)  – truncate to 3 decimal places
// Note: AQI > 300 uses 1-hour breakpoints (not implemented here; rare outside emergencies)
const BP_O3_8H = [
  [0.000, 0.054,  0,  50],
  [0.055, 0.070, 51, 100],
  [0.071, 0.085, 101, 150],
  [0.086, 0.105, 151, 200],
  [0.106, 0.200, 201, 300],
];

// CO ppm  – truncate to 1 decimal place
const BP_CO = [
  [0.0,  4.4,   0,  50],
  [4.5,  9.4,  51, 100],
  [9.5,  12.4, 101, 150],
  [12.5, 15.4, 151, 200],
  [15.5, 30.4, 201, 300],
  [30.5, 40.4, 301, 400],
  [40.5, 50.4, 401, 500],
];

// SO2 ppb  – truncate to integer
const BP_SO2 = [
  [0,   35,   0,  50],
  [36,  75,  51, 100],
  [76,  185, 101, 150],
  [186, 304, 151, 200],
  [305, 604, 201, 300],
  [605, 804, 301, 400],
  [805, 1004, 401, 500],
];

// NO2 ppb  – truncate to integer
const BP_NO2 = [
  [0,   53,   0,  50],
  [54,  100,  51, 100],
  [101, 360, 101, 150],
  [361, 649, 151, 200],
  [650, 1249, 201, 300],
  [1250, 1649, 301, 400],
  [1650, 2049, 401, 500],
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Truncate (floor) to N decimal places */
function truncate(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.floor(value * factor) / factor;
}

/** Linear interpolation per EPA formula */
function interpolate(c: number, breakpoints: number[][]): number | null {
  for (const [cLow, cHigh, iLow, iHigh] of breakpoints) {
    if (c >= cLow && c <= cHigh) {
      return Math.round(((iHigh - iLow) / (cHigh - cLow)) * (c - cLow) + iLow);
    }
  }
  return null;
}

/**
 * Convert an OpenAQ measurement to the EPA-expected unit for the given
 * pollutant, then truncate as required.
 * OpenAQ units vary by source (µg/m³, ppb, ppm, mg/m³).
 */
function toEpaConcentration(value: number, param: string, units: string): number | null {
  const u = units.toLowerCase();

  switch (param) {
    case "pm25":
      // Always µg/m³; truncate to 1 decimal
      return truncate(value, 1);

    case "pm10":
      // Always µg/m³; truncate to integer
      return truncate(value, 0);

    case "o3": {
      // Need ppm; OpenAQ may give µg/m³ or ppm
      let ppm: number;
      if (u.includes("ppm")) {
        ppm = value;
      } else {
        // µg/m³ → ppm  (O3 MW = 48 g/mol, 25 °C)
        ppm = value / 1960;
      }
      return truncate(ppm, 3);
    }

    case "co": {
      // Need ppm; OpenAQ may give µg/m³, mg/m³, or ppm
      let ppm: number;
      if (u.includes("ppm")) {
        ppm = value;
      } else if (u.includes("mg")) {
        // mg/m³ → ppm  (CO MW = 28 g/mol, 25 °C)
        ppm = value / 1.145;
      } else {
        // µg/m³ → ppm
        ppm = value / 1145;
      }
      return truncate(ppm, 1);
    }

    case "so2": {
      // Need ppb; OpenAQ may give µg/m³ or ppb
      let ppb: number;
      if (u.includes("ppb")) {
        ppb = value;
      } else {
        // µg/m³ → ppb  (SO2 MW = 64 g/mol, 25 °C; 1 ppb = 2.62 µg/m³)
        ppb = value / 2.62;
      }
      return truncate(ppb, 0);
    }

    case "no2": {
      // Need ppb; OpenAQ may give µg/m³ or ppb
      let ppb: number;
      if (u.includes("ppb")) {
        ppb = value;
      } else {
        // µg/m³ → ppb  (NO2 MW = 46 g/mol, 25 °C; 1 ppb = 1.88 µg/m³)
        ppb = value / 1.88;
      }
      return truncate(ppb, 0);
    }

    default:
      return null;
  }
}

function calcSubIndex(value: number, param: string, units: string): number | null {
  const c = toEpaConcentration(value, param, units);
  if (c === null) return null;

  switch (param) {
    case "pm25": return interpolate(c, BP_PM25);
    case "pm10": return interpolate(c, BP_PM10);
    case "o3":   return interpolate(c, BP_O3_8H);
    case "co":   return interpolate(c, BP_CO);
    case "so2":  return interpolate(c, BP_SO2);
    case "no2":  return interpolate(c, BP_NO2);
    default:     return null;
  }
}


function floorToHour(date: Date): Date {
  return new Date(Math.floor(date.getTime() / 3_600_000) * 3_600_000);
}

/** Format a Date as a clean full-hour ISO string: YYYY-MM-DDTHH:00:00Z */
function toHourIso(date: Date): string {
  return date.toISOString().slice(0, 13) + ":00:00Z";
}

async function fetchLatest(sensorId: number): Promise<{ value: number; timestamp: string } | null> {
  const hourStart = floorToHour(new Date());
  const to = new Date(hourStart.getTime() + 3_600_000); // end of current hour
  const from = new Date(hourStart.getTime() - 3 * 60 * 60 * 1000);
  try {
    const data = await openaqGet<SensorHoursResponse>(
      `/v3/sensors/${sensorId}/hours`,
      { datetime_from: toHourIso(from), datetime_to: toHourIso(to), limit: "10" },
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
        const param = rawParam.toLowerCase() === "pm2.5" ? "pm25" : rawParam.toLowerCase();
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
