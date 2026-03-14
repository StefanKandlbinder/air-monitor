"use client";

import { useState } from "react";
import { PARAM_COLORS } from "@/lib/aqi-colors";
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
import { Skeleton } from "@/components/ui/skeleton";
import type { OpenAQMeasurement } from "@/lib/types";

dayjs.extend(utc);
dayjs.extend(timezone);

function formatChartValue(value: number): string {
  return value.toLocaleString("de-AT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type TrendChartProps = {
  measurements: OpenAQMeasurement[];
  measurementsLoading: boolean;
  dateFrom: string;
  dateTo: string;
};

export function TrendChart({
  measurements,
  measurementsLoading,
  dateFrom,
  dateTo,
}: TrendChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, boolean>>({});

  const trendData = Array.from(
    measurements
      .reduce(
        (acc, item) => {
          const current = acc.get(item.timestamp) ?? { timestamp: item.timestamp };

          if (item.parameter === "no2") {
            current.no2 = item.value;
          } else if (item.parameter === "pm10") {
            current.pm10 = item.value;
          } else if (item.parameter === "pm25") {
            current.pm25 = item.value;
          }

          acc.set(item.timestamp, current);
          return acc;
        },
        new Map<
          number,
          { timestamp: number; no2?: number; pm10?: number; pm25?: number }
        >()
      )
      .values()
  ).sort((a, b) => a.timestamp - b.timestamp);

  const hasData = {
    no2: trendData.some((d) => d.no2 != null),
    pm10: trendData.some((d) => d.pm10 != null),
    pm25: trendData.some((d) => d.pm25 != null),
  };

  const selectedFromTimestamp = dateFrom ? dayjs(dateFrom).valueOf() : Number.NaN;
  const selectedToTimestamp = dateTo ? dayjs(dateTo).valueOf() : Number.NaN;
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
          {payload.map((entry) => (
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
          ))}
        </div>
        <p className="mt-2 text-[11px] opacity-80">
          {dayjs(Number(label)).tz("Europe/Vienna").format("DD.MM.YYYY HH:mm")}
        </p>
      </div>
    );
  };

  const toggleSeriesVisibility = (dataKey?: unknown): void => {
    if (typeof dataKey !== "string") return;
    setHiddenSeries((current) => ({ ...current, [dataKey]: !current[dataKey] }));
  };

  if (measurementsLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!trendData.length) {
    return (
      <p className="text-xs text-muted-foreground">
        No data available for selected range.
      </p>
    );
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={trendData}>
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            interval="preserveStartEnd"
            minTickGap={24}
            tick={{ fontSize: 12, fontFamily: "inherit", fill: "currentColor" }}
            tickFormatter={(value) =>
              dayjs(value).tz("Europe/Vienna").format("DD.MM HH:mm")
            }
            domain={xAxisDomain}
          />
          <YAxis
            tick={{ fontSize: 12, fontFamily: "inherit", fill: "currentColor" }}
            tickFormatter={(value) =>
              typeof value === "number" ? formatChartValue(value) : String(value)
            }
          />
          <Tooltip content={renderChartTooltip} />
          <Legend
            onClick={(entry) => toggleSeriesVisibility(entry?.dataKey)}
            wrapperStyle={{
              fontFamily: "inherit",
              fontSize: "12px",
              cursor: "pointer",
            }}
          />
          {hasData.no2 && !hiddenSeries.no2 ? (
            <ReferenceLine y={30} stroke="#06b6d4" strokeDasharray="5 5" />
          ) : null}
          {hasData.pm10 && !hiddenSeries.pm10 ? (
            <ReferenceLine y={50} stroke="#f97316" strokeDasharray="5 5" />
          ) : null}
          {hasData.pm25 && !hiddenSeries.pm25 ? (
            <ReferenceLine y={25} stroke="#a855f7" strokeDasharray="5 5" />
          ) : null}
          {hasData.no2 ? (
            <Line
              type="monotone"
              dataKey="no2"
              stroke={PARAM_COLORS.no2}
              dot={false}
              name="NO2 (30)"
              hide={!!hiddenSeries.no2}
            />
          ) : null}
          {hasData.pm10 ? (
            <Line
              type="monotone"
              dataKey="pm10"
              stroke={PARAM_COLORS.pm10}
              dot={false}
              name="PM10 (50)"
              hide={!!hiddenSeries.pm10}
            />
          ) : null}
          {hasData.pm25 ? (
            <Line
              type="monotone"
              dataKey="pm25"
              stroke={PARAM_COLORS.pm25}
              dot={false}
              name="PM2.5 (25)"
              hide={!!hiddenSeries.pm25}
            />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
