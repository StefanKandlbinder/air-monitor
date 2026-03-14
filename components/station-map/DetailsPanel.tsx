"use client";

import { useMemo } from "react";
import { useSparklineMeasurementsQuery } from "@/components/station-map/queries/use-sparkline-measurements-query";
import { Clock, Info, MapPin } from "lucide-react";
import dayjs from "dayjs";
import { aqiToColor, aqiToLabel } from "@/lib/aqi-colors";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ParameterReadingCard } from "@/components/station-map/ParameterReadingCard";
import { DateRangePicker } from "@/components/station-map/DateRangePicker";
import { StationMapPreview } from "@/components/station-map/StationMapPreview";
import { TrendChart } from "@/components/station-map/TrendChart";
import type { StationSnapshotResponse } from "@/components/station-map/types";
import { PARAM_LABELS } from "@/lib/aqi";
import { useDictionary } from "@/components/providers/DictionaryProvider";
import type {
  OpenAQLocation,
  OpenAQMeasurement,
  Rollup,
} from "@/lib/types";

type DetailsPanelProps = {
  isLoading: boolean;
  activeSelectedLocation: OpenAQLocation | null;
  locations: OpenAQLocation[];
  locationColors?: Record<number, string>;
  snapshot: StationSnapshotResponse | null;
  aqiColor?: string;
  aqiValue?: number | null;
  aqiSubIndices?: Record<string, number>;
  rollup: Rollup;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onClearDateRange: () => void;
  onRollupChange: (rollup: Rollup) => void;
  measurements: OpenAQMeasurement[];
  measurementsLoading: boolean;
};


export function DetailsPanel({
  isLoading,
  activeSelectedLocation,
  locations,
  locationColors,
  snapshot,
  aqiColor,
  aqiValue,
  aqiSubIndices,
  rollup,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onClearDateRange,
  onRollupChange,
  measurements,
  measurementsLoading,
}: DetailsPanelProps) {
  const dict = useDictionary();
  const sparklineQuery = useSparklineMeasurementsQuery(
    activeSelectedLocation?.id ?? null,
  );
  const sparklineMeasurements = sparklineQuery.data?.measurements ?? [];

  const latestSnapshotDate = useMemo(() => {
    if (!snapshot?.readings?.length) return null;
    return snapshot.readings.reduce(
      (latest, reading) =>
        reading.timestamp > latest ? reading.timestamp : latest,
      snapshot.readings[0].timestamp,
    );
  }, [snapshot]);
  const snapshotDate = latestSnapshotDate
    ? dayjs(latestSnapshotDate).format("DD.MM.YYYY HH:mm")
    : null;

  return (
    <div className="space-y-4">
      {/* Station info card */}
      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="space-y-2">
                {activeSelectedLocation ? (
                  <>
                    <h2 className="text-xl font-semibold tracking-tight">
                      {activeSelectedLocation.name}
                    </h2>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {activeSelectedLocation.locality ??
                        activeSelectedLocation.country.name}
                    </p>
                  </>
                ) : (
                  <>
                    <Skeleton className="h-7 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          ) : activeSelectedLocation && snapshot ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[30%_1fr]">
              {/* Left: station info + map */}
              <div className="flex flex-col gap-4 min-w-0">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold tracking-tight">
                    {activeSelectedLocation.name}
                  </h2>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {activeSelectedLocation.locality ??
                      activeSelectedLocation.country.name}
                  </p>
                  {snapshotDate ? (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      {snapshotDate}
                    </p>
                  ) : null}
                  {aqiColor && aqiValue != null ? (
                    <div className="flex items-center gap-2 pt-0.5">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: aqiColor }}
                      />
                      <span className="text-xs font-medium">
                        AQI {aqiValue} · {aqiToLabel(aqiValue, dict.aqi)}
                      </span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 text-muted-foreground"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3" align="start">
                          <p className="text-xs font-semibold mb-2">
                            {dict.details.aqiBreakdown}
                          </p>
                          {aqiSubIndices &&
                          Object.keys(aqiSubIndices).length > 0 ? (
                            <div className="space-y-1.5">
                              {Object.entries(aqiSubIndices)
                                .sort(([, a], [, b]) => b - a)
                                .map(([param, subIndex]) => {
                                  const isDominant = subIndex === aqiValue;
                                  return (
                                    <div
                                      key={param}
                                      className="flex items-center justify-between gap-2"
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <div
                                          className="h-2 w-2 rounded-full shrink-0"
                                          style={{
                                            backgroundColor:
                                              aqiToColor(subIndex),
                                          }}
                                        />
                                        <span
                                          className={`text-xs ${isDominant ? "font-semibold" : "text-muted-foreground"}`}
                                        >
                                          {PARAM_LABELS[param] ??
                                            param.toUpperCase()}
                                        </span>
                                      </div>
                                      <span
                                        className={`text-xs font-mono ${isDominant ? "font-semibold" : "text-muted-foreground"}`}
                                      >
                                        {subIndex}
                                      </span>
                                    </div>
                                  );
                                })}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {dict.details.noBreakdown}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-2.5 border-t pt-2">
                            {dict.details.aqiFormula}
                          </p>
                        </PopoverContent>
                      </Popover>
                    </div>
                  ) : null}
                </div>

                <div className="h-full min-h-[200px]">
                  <StationMapPreview
                    locations={locations}
                    activeLocation={activeSelectedLocation}
                    locationColors={locationColors}
                  />
                </div>
              </div>

              {/* Right: measurement cards */}
              <div className="flex flex-col gap-3">
                {snapshot.readings.map((reading) => (
                  <ParameterReadingCard
                    key={reading.parameter}
                    reading={reading}
                    measurements={sparklineMeasurements}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {dict.details.noStationSelected}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Trend chart card */}
      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardContent className="p-6 space-y-4">
          <div className="flex gap-2 justify-between flex-wrap items-center">
            <DateRangePicker
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={onDateFromChange}
              onDateToChange={onDateToChange}
              onClearDateRange={onClearDateRange}
            />
            <ButtonGroup aria-label={dict.details.aggregationPeriod} className="shrink-0">
              <Button
                variant={rollup === "hours" ? "default" : "outline"}
                size="sm"
                onClick={() => onRollupChange("hours")}
                type="button"
              >
                {dict.details.hourly}
              </Button>
              <Button
                variant={rollup === "days" ? "default" : "outline"}
                size="sm"
                onClick={() => onRollupChange("days")}
                type="button"
              >
                {dict.details.daily}
              </Button>
            </ButtonGroup>
          </div>
          <TrendChart
            measurements={measurements}
            measurementsLoading={measurementsLoading}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
        </CardContent>
      </Card>
    </div>
  );
}
