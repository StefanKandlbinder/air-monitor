import { NextResponse } from "next/server";
import { fetchStationSnapshot } from "@/lib/station-service";
import type { Mean } from "@/lib/types";

type Params = { stationCode: string };

export async function GET(request: Request, context: { params: Promise<Params> }) {
  try {
    const { stationCode } = await context.params;
    const { searchParams } = new URL(request.url);
    const mean = (searchParams.get("mean") ?? "MW1") as Mean;
    const datvon = searchParams.get("datvon") ?? undefined;
    const datbis = searchParams.get("datbis") ?? undefined;

    if (mean !== "MW1" && mean !== "TMW" && mean !== "HMW") {
      return NextResponse.json({ error: "Invalid mean" }, { status: 400 });
    }

    const readings = await fetchStationSnapshot(stationCode, mean, {
      datvon,
      datbis,
    });
    return NextResponse.json({ stationCode, mean, readings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Station not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
