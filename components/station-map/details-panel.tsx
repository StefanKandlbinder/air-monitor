"use client";

import { useState } from "react";
import { Cloud, Gauge, MapPin, X } from "lucide-react";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useTheme } from "next-themes";
import {
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  MeanType,
  StationSnapshotResponse,
} from "@/components/station-map/types";
import type { Measurement, OfficialStation } from "@/lib/types";

dayjs.extend(utc);
dayjs.extend(timezone);

function formatMeasurement(value: string): string {
  return `${value} µg/m³`;
}

function formatChartValue(value: number): string {
  return value.toLocaleString("de-AT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

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
  actualDataRange: { from: string; to: string } | null;
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
  actualDataRange,
  weeklyMeasurements,
  weeklyLoading,
}: DetailsPanelProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, boolean>>({});
  const formatLocalDateOnly = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getDatePart = (value: string): string => value.slice(0, 10);
  const getTimePart = (value: string, fallback: string): string =>
    value.length >= 16 ? value.slice(11, 16) : fallback;

  const selectedFromDate = dateFrom
    ? new Date(`${getDatePart(dateFrom)}T00:00`)
    : undefined;
  const selectedToDate = dateTo
    ? new Date(`${getDatePart(dateTo)}T00:00`)
    : undefined;

  const handleFromDateSelect = (date: Date | undefined): void => {
    if (!date) {
      onDateFromChange("");
      return;
    }

    const fromDate = formatLocalDateOnly(date);
    const currentFromTime = getTimePart(dateFrom, "00:00");
    onDateFromChange(`${fromDate}T${currentFromTime}`);
  };

  const handleToDateSelect = (date: Date | undefined): void => {
    if (!date) {
      onDateToChange("");
      return;
    }

    const toDate = formatLocalDateOnly(date);
    const currentToTime = getTimePart(dateTo, "23:59");
    onDateToChange(`${toDate}T${currentToTime}`);
  };

  const handleFromTimeChange = (time: string): void => {
    if (!dateFrom) {
      return;
    }
    onDateFromChange(`${getDatePart(dateFrom)}T${time}`);
  };

  const handleToTimeChange = (time: string): void => {
    if (!dateTo) {
      return;
    }
    onDateToChange(`${getDatePart(dateTo)}T${time}`);
  };

  const latestSnapshotDate = snapshot?.readings?.length
    ? snapshot.readings.reduce((latest, reading) => {
        const readingDate = dayjs(reading.date);
        return readingDate.isAfter(latest) ? readingDate : latest;
      }, dayjs(snapshot.readings[0].date))
    : null;
  const snapshotDate = latestSnapshotDate
    ? latestSnapshotDate.tz("Europe/Vienna").format("DD.MM.YYYY HH:mm")
    : null;
  const weeklyTrendData = Array.from(
    weeklyMeasurements
      .reduce((acc, item) => {
        const timestamp =
          item.zeitpunkt < 1_000_000_000_000
            ? item.zeitpunkt * 1000
            : item.zeitpunkt;
        const current = acc.get(timestamp) ?? { timestamp };
        const value = parseFloat(item.messwert.replace(",", ".")) * 1000;

        if (item.komponente === "NO2") {
          current.no2 = value;
        } else if (item.komponente === "PM10kont") {
          current.pm10 = value;
        } else if (item.komponente === "PM25kont") {
          current.pm25 = value;
        }

        acc.set(timestamp, current);
        return acc;
      }, new Map<number, { timestamp: number; no2?: number; pm10?: number; pm25?: number }>())
      .values(),
  ).sort((a, b) => a.timestamp - b.timestamp);
  const selectedFromTimestamp = dateFrom
    ? dayjs(dateFrom).valueOf()
    : Number.NaN;
  const selectedToTimestamp = dateTo
    ? dayjs(dateTo).valueOf()
    : Number.NaN;
  const xAxisDomain: [number, number] | ["dataMin", "dataMax"] =
    Number.isFinite(selectedFromTimestamp) &&
    Number.isFinite(selectedToTimestamp) &&
    selectedFromTimestamp < selectedToTimestamp
      ? [selectedFromTimestamp, selectedToTimestamp]
      : ["dataMin", "dataMax"];

  const renderChartTooltip = (props: unknown) => {
    const { active, payload, label } = (props ?? {}) as {
      active?: boolean;
      payload?: ReadonlyArray<{
        name?: string;
        value?: number | string;
        color?: string;
      }>;
      label?: number | string;
    };

    if (!active || !payload?.length) {
      return null;
    }

    return (
      <div
        className={`min-w-44 rounded-md border p-2 text-xs shadow-sm ${
          isDark
            ? "border-zinc-700 bg-zinc-900 text-zinc-100"
            : "border-zinc-200 bg-white text-zinc-900"
        }`}
      >
        <div className="space-y-1">
          {payload.map(
            (entry: {
              name?: string;
              value?: number | string;
              color?: string;
            }) => (
              <div
                key={entry.name}
                className="flex items-center justify-between gap-3"
              >
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: entry.color ?? "currentColor" }}
                  />
                  {entry.name}
                </span>
                <span className="font-medium">
                  {typeof entry.value === "number"
                    ? `${formatChartValue(entry.value)} µg/m³`
                    : `${entry.value} µg/m³`}
                </span>
              </div>
            ),
          )}
        </div>
        <p className="mt-2 text-[11px] opacity-80">
          {dayjs(Number(label)).tz("Europe/Vienna").format("DD.MM.YYYY HH:mm")}
        </p>
      </div>
    );
  };

  const toggleSeriesVisibility = (dataKey?: unknown): void => {
    if (typeof dataKey !== "string") {
      return;
    }

    setHiddenSeries((current) => ({
      ...current,
      [dataKey]: !current[dataKey],
    }));
  };

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
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="w-fit shrink-0 justify-start"
                >
                  {dateFrom
                    ? `Start: ${dateFrom.replace("T", " ")}`
                    : "Select start date/time"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedFromDate}
                  onSelect={handleFromDateSelect}
                />
                <div className="space-y-1 border-t p-3">
                  <label className="text-xs text-muted-foreground">
                    Start time
                  </label>
                  <input
                    type="time"
                    value={getTimePart(dateFrom, "00:00")}
                    onChange={(event) =>
                      handleFromTimeChange(event.target.value)
                    }
                    disabled={!dateFrom}
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
                    aria-label="Start time"
                  />
                </div>
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="w-fit shrink-0 justify-start"
                >
                  {dateTo
                    ? `End: ${dateTo.replace("T", " ")}`
                    : "Select end date/time"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedToDate}
                  onSelect={handleToDateSelect}
                />
                <div className="space-y-1 border-t p-3">
                  <label className="text-xs text-muted-foreground">
                    End time
                  </label>
                  <input
                    type="time"
                    value={getTimePart(dateTo, "23:59")}
                    onChange={(event) => handleToTimeChange(event.target.value)}
                    disabled={!dateTo}
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
                    aria-label="End time"
                  />
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant="outline"
              size="icon"
              type="button"
              onClick={onClearDateRange}
              aria-label="Clear date range"
              title="Clear date range"
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2 rounded-md border border-border/60 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Trend (selected range)
          </p>
          {weeklyLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : weeklyTrendData.length ? (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyTrendData}>
                  <XAxis
                    dataKey="timestamp"
                    type="number"
                    scale="time"
                    interval="preserveStartEnd"
                    minTickGap={24}
                    tick={{
                      fontSize: 12,
                      fontFamily: "inherit",
                      fill: "currentColor",
                    }}
                    tickFormatter={(value) =>
                      dayjs(value).tz("Europe/Vienna").format("DD.MM HH:mm")
                    }
                    domain={xAxisDomain}
                  />
                  <YAxis
                    tick={{
                      fontSize: 12,
                      fontFamily: "inherit",
                      fill: "currentColor",
                    }}
                    tickFormatter={(value) =>
                      typeof value === "number"
                        ? formatChartValue(value)
                        : String(value)
                    }
                  />
                  <Tooltip content={renderChartTooltip} />
                  <Legend
                    onClick={(entry) => {
                      toggleSeriesVisibility(entry?.dataKey);
                    }}
                    wrapperStyle={{
                      fontFamily: "inherit",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  />
                  {!hiddenSeries.no2 ? (
                    <ReferenceLine
                      y={30}
                      stroke="#06b6d4"
                      strokeDasharray="5 5"
                    />
                  ) : null}
                  {!hiddenSeries.pm10 ? (
                    <ReferenceLine
                      y={50}
                      stroke="#f97316"
                      strokeDasharray="5 5"
                    />
                  ) : null}
                  {!hiddenSeries.pm25 ? (
                    <ReferenceLine
                      y={25}
                      stroke="#a855f7"
                      strokeDasharray="5 5"
                    />
                  ) : null}
                  <Line
                    type="monotone"
                    dataKey="no2"
                    stroke="#06b6d4"
                    dot={false}
                    name="NO2 (30)"
                    hide={!!hiddenSeries.no2}
                  />
                  <Line
                    type="monotone"
                    dataKey="pm10"
                    stroke="#f97316"
                    dot={false}
                    name="PM10 (50)"
                    hide={!!hiddenSeries.pm10}
                  />
                  <Line
                    type="monotone"
                    dataKey="pm25"
                    stroke="#a855f7"
                    dot={false}
                    name="PM2.5 (25)"
                    hide={!!hiddenSeries.pm25}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No weekly MW1 data available.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
