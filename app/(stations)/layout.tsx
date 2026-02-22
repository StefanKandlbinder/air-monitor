import StationsDashboard from "@/components/stations-dashboard";

export default function StationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StationsDashboard>{children}</StationsDashboard>;
}
