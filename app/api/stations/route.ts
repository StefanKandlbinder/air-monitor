import { NextResponse } from "next/server";
import { fetchOfficialStations } from "@/lib/station-service";

const ONE_MONTH_SECONDS = 60 * 60 * 24 * 30;

export const revalidate = 2_592_000;

export async function GET() {
  try {
    const stations = await fetchOfficialStations();
    return NextResponse.json(
      { stations },
      {
        headers: {
          "Cache-Control": `public, max-age=${ONE_MONTH_SECONDS}, s-maxage=${ONE_MONTH_SECONDS}, stale-while-revalidate=86400`
        }
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
