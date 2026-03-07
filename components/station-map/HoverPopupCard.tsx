"use client";

import { useMemo } from "react";
import dayjs from "dayjs";
import { Clock, Layers, MapPin } from "lucide-react";
import { aqiToLabel } from "@/lib/aqi-colors";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { OpenAQLocation } from "@/lib/types";

const DISPLAY_PARAMS = ["no2", "pm10", "pm25"] as const;
const PARAM_LABEL: Record<string, string> = { no2: "NO₂", pm10: "PM10", pm25: "PM2.5" };

type HoverPopupCardProps = {
  location: OpenAQLocation;
  aqiValue?: number;
  aqiColor?: string;
  latestValues?: Record<string, { value: number; units: string; timestamp?: string }>;
};

export function HoverPopupCard({ location, aqiValue, aqiColor, latestValues }: HoverPopupCardProps) {
  // Use the most recent measurement timestamp from latestValues; fall back to datetimeLast
  const updatedAt = useMemo(() => {
    if (latestValues) {
      const timestamps = Object.values(latestValues)
        .map((v) => v.timestamp)
        .filter((t): t is string => !!t)
        .map((t) => new Date(t).getTime())
        .filter((t) => !isNaN(t));
      if (timestamps.length > 0) return new Date(Math.max(...timestamps));
    }
    return location.datetimeLast?.utc ? new Date(location.datetimeLast.utc) : null;
  }, [latestValues, location.datetimeLast]);

  const readings = DISPLAY_PARAMS.map((param) => {
    // Prefer API-fetched latest values; fall back to sensor.latestValue if present
    const apiData = latestValues?.[param];
    if (apiData) return { param, label: PARAM_LABEL[param], value: apiData.value, units: apiData.units };
    const sensor = location.sensors.find(
      (s) => s.parameter.name.toLowerCase() === param && s.latestValue != null
    );
    return sensor
      ? { param, label: PARAM_LABEL[param], value: sensor.latestValue as number, units: sensor.parameter.units }
      : null;
  }).filter(Boolean) as { param: string; label: string; value: number; units: string }[];

  const uniqueParams = Array.from(
    new Set(location.sensors.map((s) => s.parameter.name.toLowerCase()))
  );

  return (
    <Card className="w-56">
      <CardHeader className="space-y-0.5 px-3 pb-2 pt-3">
        <CardTitle className="text-sm leading-tight">{location.name}</CardTitle>
        <CardDescription className="flex items-center gap-1.5 text-[11px]">
          <MapPin className="h-3 w-3" />
          {location.locality ?? location.country.name}
        </CardDescription>
        {updatedAt ? (
          <CardDescription className="flex items-center gap-1.5 text-[11px]">
            <Clock className="h-3 w-3" />
            {dayjs(updatedAt).format("DD.MM.YYYY HH:mm")}
          </CardDescription>
        ) : null}
        {aqiColor && aqiValue != null ? (
          <CardDescription className="flex items-center gap-1.5 text-[11px] font-medium">
            <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: aqiColor }} />
            AQI {aqiValue} · {aqiToLabel(aqiValue)}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2 border-t border-border px-3 pb-3 pt-2">
        {readings.length > 0 ? (
          <div className="space-y-1">
            {readings.map(({ param, label, value, units }) => (
              <div key={param} className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium tabular-nums">
                  {value.toFixed(1)}{" "}
                  <span className="text-muted-foreground">{units}</span>
                </span>
              </div>
            ))}
          </div>
        ) : null}
        <div className="space-y-1">
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Layers className="h-3 w-3" />
            Available parameters
          </p>
          <div className="flex flex-wrap gap-1">
            {uniqueParams.slice(0, 6).map((param) => (
              <Badge key={param} variant="secondary" className="px-1.5 py-0 text-[10px]">
                {param}
              </Badge>
            ))}
            {uniqueParams.length > 6 ? (
              <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                +{uniqueParams.length - 6}
              </Badge>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
