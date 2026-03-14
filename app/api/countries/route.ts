import { NextResponse } from "next/server";
import { openaqGet } from "@/lib/openaq";
import { openaqErrorResponse } from "@/lib/openaq-errors";
import type { OpenAQCountry } from "@/lib/types";

type OpenAQCountriesResponse = {
  meta: { found: number; page: number; limit: number };
  results: OpenAQCountry[];
};

export const revalidate = 86400;

export async function GET() {
  try {
    const data = await openaqGet<OpenAQCountriesResponse>(
      "/v3/countries",
      { limit: "200" },
      { revalidate: 86400 }
    );

    return NextResponse.json(
      { countries: data.results },
      {
        headers: {
          "Cache-Control":
            "public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600",
        },
      }
    );
  } catch (error) {
    return openaqErrorResponse(error);
  }
}
