import { NextResponse } from "next/server";
import { openaqGet } from "@/lib/openaq";
import type { OpenAQLocation } from "@/lib/types";

type OpenAQLocationsResponse = {
  meta: { found: number; page: number; limit: number };
  results: OpenAQLocation[];
};

const LINZ_LAT = 48.3069;
const LINZ_LON = 14.2858;
const RADIUS_METERS = 25000;

export const revalidate = 604800;

export async function GET() {
  try {
    const data = await openaqGet<OpenAQLocationsResponse>("/v3/locations", {
      coordinates: `${LINZ_LAT},${LINZ_LON}`,
      radius: String(RADIUS_METERS),
      limit: "100",
    });

    return NextResponse.json(
      { locations: data.results },
      {
        headers: {
          "Cache-Control":
            "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
