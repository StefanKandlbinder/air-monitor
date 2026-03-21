import { NextResponse } from "next/server";
import { fetchLocations } from "@/lib/server/mapData";
import { openaqErrorResponse } from "@/lib/openaqErrors";

const LINZ_LAT = 48.3069;
const LINZ_LON = 14.2858;

export const revalidate = 604800;

export async function GET() {
  try {
    const locations = await fetchLocations(LINZ_LAT, LINZ_LON);
    return NextResponse.json(
      { locations },
      { headers: { "Cache-Control": "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400" } }
    );
  } catch (error) {
    return openaqErrorResponse(error);
  }
}
