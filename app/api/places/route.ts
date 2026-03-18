import { NextResponse } from "next/server";
import type { NominatimResult } from "@/lib/types";

export type { NominatimResult };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const lang = searchParams.get("lang") ?? "de";

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", searchParams.get("limit") ?? "6");

    const t0 = performance.now();
    const res = await fetch(url.toString(), {
      headers: {
        "Accept-Language": lang,
        "User-Agent": "linzair/1.0",
      },
      next: { revalidate: 300 },
    });
    const elapsed = performance.now() - t0;
    const source = elapsed < 50 ? "cache" : "network";
    console.log(`[nominatim] ${res.status} /search?q=${q} (${elapsed.toFixed(1)}ms, ${source})`);

    if (!res.ok) throw new Error(`Nominatim error ${res.status}`);

    const results = (await res.json()) as NominatimResult[];
    return NextResponse.json({ results }, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
