import { notFound } from "next/navigation";
import StationDetails from "@/components/station/StationDetails";
import StationBreadcrumb from "@/components/station/StationBreadcrumb";
import type { Rollup } from "@/lib/types";

type Params = {
  id: string;
  period: string;
};

function resolveRollup(period: string): Rollup | null {
  const value = period.toLowerCase();
  if (value === "hourly" || value === "hours" || value === "hour") return "hours";
  if (value === "daily" || value === "days" || value === "day") return "days";
  return null;
}

export default async function StationPeriodPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id, period } = await params;

  if (!id.trim() || !resolveRollup(period)) {
    notFound();
  }

  return (
    <>
      <StationBreadcrumb locationId={Number(id)} />

      <StationDetails key={id} />
    </>
  );
}
