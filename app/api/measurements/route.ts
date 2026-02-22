import { NextResponse } from "next/server";
import { fetchUpperAustriaJson } from "@/lib/upper-austria-api";
import type { Mean, Measurement } from "@/lib/types";

type MeasurementsResponse = {
  messwerte: Measurement[];
};

const validMeans = new Set<Mean>(["MW1", "TMW", "HMW"]);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mean = (searchParams.get("mean") ?? "MW1") as Mean;
    const datvon = searchParams.get("datvon") ?? undefined;
    const datbis = searchParams.get("datbis") ?? undefined;

    if (!validMeans.has(mean)) {
      return NextResponse.json({ error: "Invalid mean" }, { status: 400 });
    }

    if (!datvon || !datbis) {
      return NextResponse.json(
        { error: "Missing datvon or datbis" },
        { status: 400 },
      );
    }

    const payload = await fetchUpperAustriaJson<MeasurementsResponse>(
      "/messwerte/json",
      {
        datvon,
        datbis,
      },
    );

    const messwerte = payload.messwerte.filter((item) => item.mittelwert === mean);
    return NextResponse.json({ mean, datvon, datbis, messwerte });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
