import Link from "next/link";
import StationMap from "@/components/station-map";
import ThemeToggle from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StationsDashboard({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>
      <StationMap />

      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">API endpoints</CardTitle>
            <Badge variant="secondary">shadcn/ui</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Stations are loaded from{" "}
            <code>https://www2.land-oberoesterreich.gv.at/imm/jaxrs/stationen/json</code>.
          </p>
          <ul className="list-inside list-disc space-y-1 text-primary">
            <li>
              <Link href="/api/stations">/api/stations</Link>
            </li>
            <li>
              <Link href="/api/stations/S415?mean=MW1">
                /api/stations/:stationCode?mean=MW1
              </Link>
            </li>
            <li>
              <Link href="/api/air/S415/NO2/MW1/10">
                /api/air/:station/:component/:mean/:limit
              </Link>
            </li>
          </ul>
        </CardContent>
      </Card>
      {children}
    </main>
  );
}
