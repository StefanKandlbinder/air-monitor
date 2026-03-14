"use client";

import { Cloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ParameterSparkline } from "@/components/station-map/ParameterSparkline";
import type { AirQualityReading, OpenAQMeasurement } from "@/lib/types";

export function ParameterReadingCard({
  reading,
  measurements,
}: {
  reading: AirQualityReading;
  measurements: OpenAQMeasurement[];
}) {
  return (
    <Card>
      <CardContent className="p-4 flex flex-col gap-2">
        {/* Name + value + badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Cloud className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <p className="text-sm font-medium truncate">
              {reading.displayName}:{" "}
            </p>
            <p className="text-sm font-mono">
              {reading.value.toFixed(2)}
              <span className="text-muted-foreground ml-1">{reading.unit}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className="font-mono text-[10px]" variant="outline">
              {reading.limit}
            </Badge>
          </div>
        </div>

        {/* Sparkline */}
        <ParameterSparkline
          measurements={measurements}
          parameter={reading.parameter}
          limit={reading.limit}
        />
      </CardContent>
    </Card>
  );
}
