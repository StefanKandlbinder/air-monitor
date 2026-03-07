import { NextResponse } from "next/server";
import { openaqGet } from "@/lib/openaq";
import type { OpenAQLocation } from "@/lib/types";

type OpenAQLocationResponse = {
  results: OpenAQLocation[];
};

export const revalidate = 604800;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const data = await openaqGet<OpenAQLocationResponse>(`/v3/locations/${id}`, undefined, { revalidate: 604800 });
    const location = data.results[0] ?? null;
    return NextResponse.json({ location }, {
      headers: {
        "Cache-Control": "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
