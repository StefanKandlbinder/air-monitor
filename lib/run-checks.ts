import { fetchAirData } from "@/lib/air-data";
import { stationIds, stations } from "@/lib/stations";
import { maybeTweet } from "@/lib/tweet";
import type { Component, Mean, Station } from "@/lib/types";

type CheckConfig = {
  component: Component;
  limit: number;
};

type CheckResult = {
  stationId: string;
  component: string;
  value: string;
  limit: number;
  tweeted: boolean;
  message: string;
};

const checks: CheckConfig[] = [
  { component: "PM10kont", limit: 50 },
  { component: "PM25kont", limit: 25 },
  { component: "NO2", limit: 30 }
];

export async function runChecks(mean: Mean): Promise<CheckResult[]> {
  const results = await Promise.all(
    stationIds.map(async (stationId) => {
      const value = stations.get(stationId);
      if (!value) {
        return [];
      }

      const station: Station = { id: stationId, value };
      const stationResults = await Promise.all(
        checks.map(async ({ component, limit }) => {
          const data = await fetchAirData(station, component, mean, limit);
          const { tweeted, message } = await maybeTweet(data);
          return {
            stationId,
            component: data.component,
            value: data.value,
            limit: data.limit,
            tweeted,
            message
          };
        })
      );

      return stationResults;
    })
  );

  return results.flat();
}
