import { NextResponse } from "next/server";
import { fetchAirData } from "@/lib/air-data";
import { stations } from "@/lib/stations";
import type { Component, Mean, Station, StationId } from "@/lib/types";

type Params = {
  station: string;
  component: string;
  mean: string;
  limit: string;
};

const validComponents = new Set<Component>(["NO2", "PM10kont", "PM25kont"]);
const validMeans = new Set<Mean>(["MW1", "TMW", "HMW"]);

export async function GET(request: Request, context: { params: Promise<Params> }) {
  try {
    const { station, component, mean, limit } = await context.params;
    const { searchParams } = new URL(request.url);
    const datvon = searchParams.get("datvon") ?? undefined;
    const datbis = searchParams.get("datbis") ?? undefined;
    const stationValue = stations.get(station as StationId);

    if (!stationValue) {
      return NextResponse.json({ error: "Invalid station" }, { status: 400 });
    }

    if (!validComponents.has(component as Component)) {
      return NextResponse.json({ error: "Invalid component" }, { status: 400 });
    }

    if (!validMeans.has(mean as Mean)) {
      return NextResponse.json({ error: "Invalid mean" }, { status: 400 });
    }

    const parsedLimit = Number.parseInt(limit, 10);
    if (Number.isNaN(parsedLimit)) {
      return NextResponse.json({ error: "Invalid limit" }, { status: 400 });
    }

    const stationData: Station = {
      id: station as StationId,
      value: stationValue
    };

    const data = await fetchAirData(
      stationData,
      component as Component,
      mean as Mean,
      parsedLimit,
      { datvon, datbis }
    );

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
