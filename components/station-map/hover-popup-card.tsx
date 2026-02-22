"use client";

import { Layers, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { StationSnapshotResponse } from "@/components/station-map/types";
import type { OfficialStation } from "@/lib/types";

type HoverPopupCardProps = {
  station: OfficialStation;
  snapshot: StationSnapshotResponse | null;
  isLoading: boolean;
};

function formatMeasurement(value: string): string {
  return `${value} µg/m³`;
}

export function HoverPopupCard({ station, snapshot, isLoading }: HoverPopupCardProps) {
  return (
    <Card className="w-64">
      <CardHeader className="space-y-1 px-3 pb-2 pt-3">
        <CardTitle className="text-sm leading-tight">{station.kurzname}</CardTitle>
        <CardDescription className="flex items-center gap-1.5 text-[11px]">
          <MapPin className="h-3 w-3" />
          {station.code}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5 border-t border-border px-3 pb-3 pt-2">
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Layers className="h-3 w-3" />
          Available components
        </p>
        <div className="flex flex-wrap gap-1">
          {station.komponentenCodes.slice(0, 5).map((component) => (
            <Badge key={component} variant="secondary" className="px-1.5 py-0 text-[10px]">
              {component}
            </Badge>
          ))}
          {station.komponentenCodes.length > 5 ? (
            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
              +{station.komponentenCodes.length - 5}
            </Badge>
          ) : null}
        </div>
        <div className="mt-2 space-y-1 border-t border-border pt-2">
          <p className="text-[11px] text-muted-foreground">Latest measurements</p>
          {isLoading ? (
            <div className="space-y-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ) : snapshot?.readings?.length ? (
            snapshot.readings.map((reading) => (
              <div key={`${reading.component}-${reading.mean}`} className="flex items-center justify-between text-[11px]">
                <span className="font-medium">{reading.component}</span>
                <span>{formatMeasurement(reading.value)}</span>
              </div>
            ))
          ) : (
            <p className="text-[11px] text-muted-foreground">No data in this time window.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
