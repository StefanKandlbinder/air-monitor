import { notFound } from "next/navigation";
import type { Mean } from "@/lib/types";

type Params = {
  id: string;
  period: string;
};

function resolvePeriod(period: string): Mean | null {
  const value = period.toLowerCase();

  if (value === "mw1" || value === "hourly" || value === "hour") {
    return "MW1";
  }

  if (value === "tmw" || value === "daily" || value === "day") {
    return "TMW";
  }

  if (value === "hmw" || value === "halfhour" || value === "half-hour") {
    return "HMW";
  }

  return null;
}

export default async function StationPeriodPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id, period } = await params;

  if (!id.trim() || !resolvePeriod(period)) {
    notFound();
  }

  return null;
}
