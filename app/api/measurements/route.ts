import { NextResponse } from "next/server";
import { openaqGet } from "@/lib/openaq";
import { openaqErrorResponse, statusToErrorCode } from "@/lib/openaq-errors";
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
    const rollup = (searchParams.get("rollup") ?? "hours") as Rollup;

    if (!locationId || !dateFrom) {
      return NextResponse.json(
        { error: "Missing locationId or dateFrom" },
        { status: 400 }
      );
    }

    if (isNaN(new Date(dateFrom).getTime())) {
      return NextResponse.json({ error: "Invalid dateFrom" }, { status: 400 });
    }

    const dateTo = searchParams.get("dateTo") ?? new Date().toISOString();

    if (isNaN(new Date(dateTo).getTime())) {
      return NextResponse.json({ error: "Invalid dateTo" }, { status: 400 });
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

    // Hourly uses datetime_from; daily uses date_from.
    // No upper-bound is passed so OpenAQ always returns data up to the current time.
    const query: Record<string, string> =
      rollup === "hours"
        ? { datetime_from: dateFrom, limit: "1000" }
        : { date_from: dateFrom.slice(0, 10), limit: "1000" };

    const endpoint = rollup === "hours" ? "hours" : "days";

    const sensorResults = await Promise.allSettled(
      airQualitySensors.map(async (sensor) => {
        const data = await openaqGet<SensorDataResponse>(
          `/v3/sensors/${sensor.id}/${endpoint}`,
          query,
          { revalidate: 300 }
        );

        const parameter = normalizeParam(sensor.parameter.name.toLowerCase());

        return data.results
          .filter((r) => r.value !== null && r.value >= 0 && r.period?.datetimeFrom?.utc)
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

    const rateLimitedResult = sensorResults.find(
      (r) => r.status === "rejected" && String(r.reason).includes("429")
    );
    if (rateLimitedResult) {
      const errorCode = statusToErrorCode(429);
      return NextResponse.json({ errorCode }, { status: 429 });
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
    return openaqErrorResponse(error);
  }
}
