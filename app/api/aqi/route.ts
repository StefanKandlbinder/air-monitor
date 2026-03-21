import { NextResponse } from "next/server";
import { fetchAqi } from "@/lib/server/mapData";
import { secondsUntilNextHour } from "@/lib/time";
import { openaqErrorResponse } from "@/lib/openaqErrors";
import type { LocationInput } from "@/lib/aqi";

export async function POST(request: Request) {
  try {
    const { locations } = (await request.json()) as { locations: LocationInput[] };

    if (!Array.isArray(locations) || locations.length === 0) {
      return NextResponse.json({ colors: {}, aqiValues: {}, latestValues: {}, subIndices: {} });
    }

    const revalidate = secondsUntilNextHour();
    const result = await fetchAqi(locations);

    return NextResponse.json(result, {
      headers: { "Cache-Control": `public, max-age=${revalidate}, s-maxage=${revalidate}, stale-while-revalidate=60` },
    });
  } catch (error) {
    return openaqErrorResponse(error);
  }
}
