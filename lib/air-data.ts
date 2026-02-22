import type { AirDataResult, Component, Mean, Measurement, Station } from "@/lib/types";
import { fetchUpperAustriaJson } from "@/lib/upper-austria-api";

type MeasurementsResponse = {
  messwerte: Measurement[];
};

type DateRange = {
  datvon?: string;
  datbis?: string;
};

function toMeasurementDate(timestamp: number): Date {
  // Upstream timestamps can be in seconds or milliseconds.
  const normalized = timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
  return new Date(normalized);
}

export async function fetchAirData(
  station: Station,
  component: Component,
  mean: Mean,
  limit: number,
  dateRange?: DateRange
): Promise<AirDataResult> {
  const query: Record<string, string> = {
    stationcode: station.id,
    komponentencode: component
  };

  if (dateRange?.datvon && dateRange?.datbis) {
    query["datvon"] = dateRange.datvon;
    query["datbis"] = dateRange.datbis;
  }

  const fetched = await fetchUpperAustriaJson<MeasurementsResponse>("/messwerte/json", query);
  const filteredData = fetched.messwerte.filter((messwert) => messwert.mittelwert === mean);

  if (filteredData.length === 0) {
    throw new Error("No measurements available for requested period");
  }

  const latest = filteredData.reduce((currentLatest, candidate) => {
    return candidate.zeitpunkt > currentLatest.zeitpunkt ? candidate : currentLatest;
  });

  return {
    station: station.value.name,
    stationHash: station.value.hash,
    component: component.replace("kont", ""),
    mean,
    limit,
    date: toMeasurementDate(latest.zeitpunkt),
    value: (parseFloat(latest.messwert.replace(",", ".")) * 1000).toFixed(2)
  };
}
