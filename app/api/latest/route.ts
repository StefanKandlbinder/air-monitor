import { NextResponse } from "next/server";
import { openaqGet } from "@/lib/openaq";
import { openaqErrorResponse } from "@/lib/openaqErrors";
import type { OpenAQLatestResult } from "@/lib/types";

type OpenAQLatestResponse = {
  meta: { found: number; page: number; limit: number };
  results: OpenAQLatestResult[];
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId");

  if (!locationId) {
    return NextResponse.json({ error: "Missing locationId" }, { status: 400 });
  }

  try {
    const data = await openaqGet<OpenAQLatestResponse>(
      `/v3/locations/${locationId}/latest`,
      undefined,
      { revalidate: 3600 }
    );

    return NextResponse.json(
      { locationId: Number(locationId), latest: data.results },
      {
        headers: {
          "Cache-Control":
            "public, max-age=3600, s-maxage=3600, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    return openaqErrorResponse(error);
  }
}
