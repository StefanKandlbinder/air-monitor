import { NextResponse } from "next/server";
import { fetchLocations, fetchAqi } from "@/lib/server/map-data";
import { toAqiLocationInputs } from "@/lib/aqi";
import { secondsUntilNextHour } from "@/lib/time";
import { openaqErrorResponse } from "@/lib/openaq-errors";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) return NextResponse.json({ locations: [], aqi: { colors: {}, aqiValues: {}, latestValues: {}, subIndices: {} } });

  try {
    const revalidate = secondsUntilNextHour();
    const t0 = performance.now();
    const locations = await fetchLocations(Number(lat), Number(lon));
    const elapsed = performance.now() - t0;
    const source = elapsed < 50 ? "cache" : "network";
    console.log(`[search] locations near (${lat},${lon}): ${locations.length} results (${elapsed.toFixed(1)}ms, ${source})`);
    const aqiLocationInputs = toAqiLocationInputs(locations);
    const aqi = await fetchAqi(aqiLocationInputs);
    return NextResponse.json(
      { locations, aqi },
      { headers: { "Cache-Control": `public, max-age=${revalidate}, s-maxage=${revalidate}, stale-while-revalidate=60` } }
    );
  } catch (error) {
    return openaqErrorResponse(error);
  }
}
