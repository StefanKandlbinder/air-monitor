import Link from "next/link";
import StationMap from "@/components/StationMap";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <>
      <StationMap />
      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">API endpoints</CardTitle>
            <Badge variant="secondary">OpenAQ</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Stations and measurements are sourced from the{" "}
            <Link
              href="https://api.openaq.org"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              OpenAQ v3 API
            </Link>
            .
          </p>
          <ul className="list-inside list-disc space-y-1 text-primary">
            <li>
              <Link href="/api/stations">/api/stations</Link>
              {" — locations near Linz"}
            </li>
            <li>
              <code>
                /api/measurements?locationId=&amp;dateFrom=&amp;dateTo=&amp;rollup=hours
              </code>
              {" — sensor measurements"}
            </li>
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
