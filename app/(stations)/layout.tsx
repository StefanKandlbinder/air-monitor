import StationsDashboard from "@/components/StationsDashboard";

export default function StationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StationsDashboard>{children}</StationsDashboard>;
}
