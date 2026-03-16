import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import StationMap from "@/components/station/StationMap";
import { fetchLocations, fetchAqi, toAqiLocationInputs } from "@/lib/server/map-data";

const LINZ_LAT = 48.3069;
const LINZ_LON = 14.2858;

export default async function HomePage() {
  const queryClient = new QueryClient();
  const locations = await fetchLocations(LINZ_LAT, LINZ_LON);
  queryClient.setQueryData(["locations"], locations);

  const aqiLocationInputs = toAqiLocationInputs(locations);
  const locationIds = aqiLocationInputs.map((l) => l.locationId).sort((a, b) => a - b);

  if (aqiLocationInputs.length > 0) {
    await queryClient.prefetchQuery({
      queryKey: ["aqi", locationIds],
      queryFn: () => fetchAqi(aqiLocationInputs),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StationMap />
    </HydrationBoundary>
  );
}
