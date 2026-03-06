"use client";

import { Cloud, Gauge, MapPin } from "lucide-react";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "@/components/station-map/DateRangePicker";
import { TrendChart } from "@/components/station-map/TrendChart";
import type {
  MeanType,
  StationSnapshotResponse,
} from "@/components/station-map/types";
import type { Measurement, OfficialStation } from "@/lib/types";
import { formatMeasurement } from "@/lib/utils";

dayjs.extend(utc);
dayjs.extend(timezone);

type DetailsPanelProps = {
  isLoading: boolean;
  activeSelectedStation: OfficialStation | null;
  snapshot: StationSnapshotResponse | null;
  mean: MeanType;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onClearDateRange: () => void;
  onMeanChange: (mean: MeanType) => void;
  weeklyMeasurements: Measurement[];
  weeklyLoading: boolean;
};

export function DetailsPanel({
  isLoading,
  activeSelectedStation,
  snapshot,
  mean,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onClearDateRange,
  onMeanChange,
  weeklyMeasurements,
  weeklyLoading,
}: DetailsPanelProps) {
  const latestSnapshotDate = snapshot?.readings?.length
    ? snapshot.readings.reduce((latest, reading) => {
        const readingDate = dayjs(reading.date);
        return readingDate.isAfter(latest) ? readingDate : latest;
      }, dayjs(snapshot.readings[0].date))
    : null;
  const snapshotDate = latestSnapshotDate
    ? latestSnapshotDate.tz("Europe/Vienna").format("DD.MM.YYYY HH:mm")
    : null;

  return (
    <Card className="h-fit border-border/50 bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gauge className="h-4 w-4" />
          Station data
        </CardTitle>
        <CardDescription>
          Click a marker on the map to load latest values.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : null}
        {!activeSelectedStation && !isLoading ? (
          <p className="text-sm text-muted-foreground">
            Click a marker to view current readings.
          </p>
        ) : null}

        {activeSelectedStation && snapshot && !isLoading ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <h3 className="text-base font-semibold">
                {activeSelectedStation.langname}
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{activeSelectedStation.code}</Badge>
                <Badge variant="secondary">{snapshot.mean}</Badge>
              </div>
              {snapshotDate ? (
                <p className="text-xs text-muted-foreground">
                  Updated (Europe/Vienna): {snapshotDate}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {snapshot.readings.map((reading) => (
                <Card
                  key={`${reading.component}-${reading.mean}`}
                  className="bg-background/50"
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cloud className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          {reading.component}
                        </p>
                      </div>
                      <Badge className="font-mono" variant="outline">
                        {reading.limit}
                      </Badge>
                    </div>
                    <p className="mt-2 text-md font-semibold tracking-tight font-mono">
                      {formatMeasurement(reading.value)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Coordinates: {activeSelectedStation.geoBreite.toFixed(4)},{" "}
              {activeSelectedStation.geoLaenge.toFixed(4)}
            </div>
          </div>
        ) : null}

        <div className="space-y-2 rounded-md border border-border/60 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Station data controls
          </p>
          <ButtonGroup aria-label="Aggregation period" className="w-full">
            <Button
              variant={mean === "MW1" ? "default" : "outline"}
              size="sm"
              onClick={() => onMeanChange("MW1")}
              type="button"
              className="flex-1"
            >
              Hourly (MW1)
            </Button>
            <Button
              variant={mean === "TMW" ? "default" : "outline"}
              size="sm"
              onClick={() => onMeanChange("TMW")}
              type="button"
              className="flex-1"
            >
              Daily (TMW)
            </Button>
            <Button
              variant={mean === "HMW" ? "default" : "outline"}
              size="sm"
              onClick={() => onMeanChange("HMW")}
              type="button"
              className="flex-1"
            >
              Half-hour (HMW)
            </Button>
          </ButtonGroup>
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={onDateFromChange}
            onDateToChange={onDateToChange}
            onClearDateRange={onClearDateRange}
          />
        </div>

        <div className="space-y-2 rounded-md border border-border/60 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Trend (selected range)
          </p>
          <TrendChart
            weeklyMeasurements={weeklyMeasurements}
            weeklyLoading={weeklyLoading}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
        </div>
      </CardContent>
    </Card>
  );
}
