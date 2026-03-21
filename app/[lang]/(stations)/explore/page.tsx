import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import StationMap from "@/components/station/StationMap";
import { fetchLocations, fetchAqi, toAqiLocationInputs } from "@/lib/server/mapData";

const LINZ_LAT = 48.3069;
const LINZ_LON = 14.2858;

export default async function ExplorePage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["map-data", null, null],
    queryFn: async () => {
      const locations = await fetchLocations(LINZ_LAT, LINZ_LON);
      const aqi = await fetchAqi(toAqiLocationInputs(locations));
      return { locations, aqi };
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StationMap />
    </HydrationBoundary>
  );
}
