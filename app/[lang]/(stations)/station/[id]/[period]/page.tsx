import { notFound } from "next/navigation";
import type { Metadata } from "next";
import StationDetails from "@/components/station/StationDetails";
import StationBreadcrumb from "@/components/station/StationBreadcrumb";
import { openaqGet } from "@/lib/openaq";
import type { Rollup, OpenAQLocation } from "@/lib/types";

type Params = {
  lang: string;
  id: string;
  period: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const data = await openaqGet<{ results: OpenAQLocation[] }>(
      `/v3/locations/${id}`,
      undefined,
      { revalidate: 3600 }
    );
    const location = data.results[0];
    if (location) {
      const place = [location.name, location.locality, location.country.name]
        .filter(Boolean)
        .join(", ");
      const params = [...new Set(
        location.sensors.map((s) => s.parameter.displayName ?? s.parameter.name.toUpperCase())
      )].join(" · ");
      const title = params ? `${place} – ${params}` : place;
      return { title };
    }
  } catch {
    // fall through to default title
  }
  return {};
}

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
