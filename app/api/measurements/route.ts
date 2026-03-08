import { NextResponse } from "next/server";
import { openaqGet } from "@/lib/openaq";
import { AQI_PARAMS, normalizeParam } from "@/lib/aqi";
import type { OpenAQLocation, OpenAQMeasurement, Rollup } from "@/lib/types";

export const revalidate = 3600;

type SensorDataResult = {
  period: {
    datetimeFrom: { utc: string } | null;
  } | null;
  value: number | null;
  parameter: {
    name: string;
    units: string;
  };
};

type SensorDataResponse = {
  meta: { found: number | null };
  results: SensorDataResult[];
};

type LocationResponse = {
  meta: { found: number };
  results: OpenAQLocation[];
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const rollup = (searchParams.get("rollup") ?? "hours") as Rollup;

    if (!locationId || !dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "Missing locationId, dateFrom, or dateTo" },
        { status: 400 }
      );
    }

    if (rollup !== "hours" && rollup !== "days") {
      return NextResponse.json(
        { error: "Invalid rollup (must be 'hours' or 'days')" },
        { status: 400 }
      );
    }

    const locationData = await openaqGet<LocationResponse>(
      `/v3/locations/${locationId}`,
      undefined,
      { revalidate: 3600 }
    );

    if (!locationData.results.length) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    const location = locationData.results[0];
    const airQualitySensors = location.sensors.filter((sensor) =>
      AQI_PARAMS.has(sensor.parameter.name.toLowerCase())
    );

    // Hourly uses datetime_from/datetime_to; daily uses date_from/date_to
    const query: Record<string, string> =
      rollup === "hours"
        ? { datetime_from: dateFrom, datetime_to: dateTo, limit: "1000" }
        : { date_from: dateFrom.slice(0, 10), date_to: dateTo.slice(0, 10), limit: "1000" };

    const endpoint = rollup === "hours" ? "hours" : "days";

    const sensorResults = await Promise.allSettled(
      airQualitySensors.map(async (sensor) => {
        const data = await openaqGet<SensorDataResponse>(
          `/v3/sensors/${sensor.id}/${endpoint}`,
          query,
          { revalidate: 3600 }
        );

        const parameter = normalizeParam(sensor.parameter.name.toLowerCase());

        return data.results
          .filter((r) => r.value !== null && r.period?.datetimeFrom?.utc)
          .map(
            (result): OpenAQMeasurement => ({
              sensorId: sensor.id,
              locationId: location.id,
              parameter,
              value: result.value as number,
              unit: sensor.parameter.units,
              timestamp: new Date(result.period!.datetimeFrom!.utc).getTime(),
            })
          );
      })
    );

    const isRateLimited = sensorResults.some(
      (r) => r.status === "rejected" && String(r.reason).includes("429")
    );
    if (isRateLimited) {
      return NextResponse.json(
        { error: "OpenAQ rate limit exceeded. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    const measurements = sensorResults
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => (r as PromiseFulfilledResult<OpenAQMeasurement[]>).value);
    return NextResponse.json(
      { locationId: Number(locationId), rollup, dateFrom, dateTo, measurements },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/measurements]", message);
    const status = message.includes("429") ? 429 : 500;
    const description =
      status === 429
        ? "OpenAQ rate limit exceeded. Please wait a moment and try again."
        : message;
    return NextResponse.json({ error: description }, { status });
  }
}
