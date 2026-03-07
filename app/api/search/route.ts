import { NextResponse } from "next/server";
import { openaqGet } from "@/lib/openaq";
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
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("429") ? 429 : 500;
    const description = status === 429
      ? "OpenAQ rate limit exceeded. Please wait a moment and try again."
      : message;
    return NextResponse.json({ error: description }, { status });
  }
}
