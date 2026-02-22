import { fetchAirData } from "@/lib/air-data";
import { fetchUpperAustriaJson } from "@/lib/upper-austria-api";
import type {
  AirDataResult,
  Component,
  Mean,
  Measurement,
  OfficialStation,
  Station,
} from "@/lib/types";

type StationsResponse = {
  stationen: OfficialStation[];
};

type DateRange = {
  datvon?: string;
  datbis?: string;
};

type MeasurementsResponse = {
  messwerte: Measurement[];
};

const displayComponents: Component[] = ["NO2", "PM10kont", "PM25kont"];

export async function fetchOfficialStations(): Promise<OfficialStation[]> {
  const data = await fetchUpperAustriaJson<StationsResponse>("/stationen/json");
  return data.stationen;
}

export async function fetchStationSnapshot(
  stationCode: string,
  mean: Mean = "MW1",
  dateRange?: DateRange
): Promise<AirDataResult[]> {
  const stations = await fetchOfficialStations();
  const stationMeta = stations.find((station) => station.code === stationCode);

  if (!stationMeta) {
    throw new Error("Station not found");
  }

  const station: Station = {
    id: stationMeta.code,
    value: {
      name: stationMeta.langname,
      hash: `#${stationMeta.kurzname.replace(/\s+/g, "-")}`
    }
  };

  const limitByComponent: Record<Component, number> = {
    NO2: 30,
    PM10kont: 50,
    PM25kont: 25
  };

  if (dateRange?.datvon && dateRange?.datbis) {
    const payload = await fetchUpperAustriaJson<MeasurementsResponse>("/messwerte/json", {
      datvon: dateRange.datvon,
      datbis: dateRange.datbis
    });

    return displayComponents.map((component) => {
      const componentMeasurements = payload.messwerte.filter(
        (measurement) =>
          measurement.station === stationMeta.code &&
          measurement.komponente === component &&
          measurement.mittelwert === mean
      );

      if (componentMeasurements.length === 0) {
        throw new Error(`No measurements available for ${component} in selected range`);
      }

      const latest = componentMeasurements.reduce((currentLatest, candidate) =>
        candidate.zeitpunkt > currentLatest.zeitpunkt ? candidate : currentLatest
      );
      const normalizedTimestamp =
        latest.zeitpunkt < 1_000_000_000_000 ? latest.zeitpunkt * 1000 : latest.zeitpunkt;

      return {
        station: station.value.name,
        stationHash: station.value.hash,
        component: component.replace("kont", ""),
        mean,
        limit: limitByComponent[component],
        date: new Date(normalizedTimestamp),
        value: (parseFloat(latest.messwert.replace(",", ".")) * 1000).toFixed(2)
      };
    });
  }

  return await Promise.all(
    displayComponents.map(async (component) => {
      return await fetchAirData(
        station,
        component,
        mean,
        limitByComponent[component],
        dateRange
      );
    })
  );
}
