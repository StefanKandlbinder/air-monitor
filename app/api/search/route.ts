import { NextResponse } from "next/server";
import { openaqGet } from "@/lib/openaq";
import { openaqErrorResponse } from "@/lib/openaq-errors";
import type { OpenAQLocation } from "@/lib/types";

type OpenAQLocationsResponse = {
  meta: { found: number; page: number; limit: number };
  results: OpenAQLocation[];
};

export const revalidate = 604800;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json({ locations: [] });
  }

  try {
    const data = await openaqGet<OpenAQLocationsResponse>("/v3/locations", {
      coordinates: `${lat},${lon}`,
      radius: "25000",
      limit: "100",
    }, { revalidate: 604800 });
    return NextResponse.json({ locations: data.results }, {
      headers: {
        "Cache-Control": "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    return openaqErrorResponse(error);
  }
}
