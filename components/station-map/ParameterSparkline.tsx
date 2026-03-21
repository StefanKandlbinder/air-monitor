"use client";

import { Line, LineChart, ReferenceLine, ResponsiveContainer } from "recharts";
import { PARAM_COLORS } from "@/lib/aqiColors";
import type { OpenAQMeasurement } from "@/lib/types";

export function ParameterSparkline({
  measurements,
  parameter,
  limit,
}: {
  measurements: OpenAQMeasurement[];
  parameter: string;
  limit: number;
}) {
  const data = measurements
    .filter((m) => m.parameter === parameter)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((m) => ({ timestamp: m.timestamp, value: m.value }));

  if (!data.length) return null;

  const color = PARAM_COLORS[parameter] ?? "var(--color-zinc-500)";

  return (
    <div className="h-12 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
          style={{ pointerEvents: "none" }}
        >
          <ReferenceLine
            y={limit}
            stroke={color}
            strokeDasharray="4 4"
            strokeOpacity={0.5}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            dot={false}
            activeDot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
