import { useMemo } from "react";
import { Bar, BarChart, XAxis, YAxis, Rectangle, CartesianGrid } from "recharts";
import { getTodayDate } from "@/db/utils";
import type { WeeklyStats } from "@/types";
import { ChartContainer } from "@/components/ui/chart";

interface WeeklyBarChartProps {
  data: WeeklyStats[];
  selectedDate: string;
  onDateSelect: (date: string) => void;
}

interface ChartDataPoint {
  day: string;
  date: string;
  time: number;
  isSelected: boolean;
  isFuture: boolean;
}

interface CustomBarProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: ChartDataPoint;
  onDateSelect: (date: string) => void;
}

const CustomBar = (props: CustomBarProps) => {
  const { x, y, width, height, payload, onDateSelect } = props;

  if (!payload) return null;

  const fill = payload.isSelected
    ? "#10b981" // accent color
    : payload.isFuture
      ? "#27272a" // zinc-800
      : "#3f3f46"; // zinc-700

  const opacity = payload.isFuture ? 0.5 : 1;
  const cursor = payload.isFuture ? "not-allowed" : "pointer";

  return (
    <Rectangle
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      opacity={opacity}
      radius={[4, 4, 0, 0]}
      style={{ cursor }}
      onClick={() => {
        if (!payload.isFuture) {
          onDateSelect(payload.date);
        }
      }}
    />
  );
};

export function WeeklyBarChart({ data, selectedDate, onDateSelect }: WeeklyBarChartProps) {
  const chartData = useMemo(() => {
    return data.map((stat) => ({
      day: stat.day,
      date: stat.date,
      time: stat.totalTime / 3600, // Convert to hours for display
      isSelected: stat.date === selectedDate,
      isFuture: stat.date > getTodayDate(),
    }));
  }, [data, selectedDate]);

  // Compute integer Y-axis ticks based on max recorded time
  const { yTicks, yMax } = useMemo(() => {
    const maxTime = Math.max(...chartData.map((d) => d.time), 0);
    const maxCeil = Math.max(Math.ceil(maxTime), 1); // at least 1h
    const ticks = Array.from({ length: maxCeil + 1 }, (_, i) => i);
    return { yTicks: ticks, yMax: maxCeil };
  }, [chartData]);

  const chartConfig = {
    time: {
      label: "Time",
      color: "hsl(142, 76%, 36%)", // emerald-600 (accent color)
    },
  };

  return (
    <div className="w-full h-[180px]">
      <ChartContainer config={chartConfig} className="h-full w-full">
        <BarChart data={chartData} margin={{ top: 20, right: 5, left: -5, bottom: 20 }}>
          <CartesianGrid vertical={false} stroke="#374151" />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tick={({ x, y, payload }) => {
              const item = chartData.find((d) => d.day === payload.value);
              const isFuture = item?.isFuture ?? false;
              const cursor = isFuture ? "not-allowed" : "pointer";

              return (
                <text
                  x={x}
                  y={y + 10}
                  textAnchor="middle"
                  className={`text-xs ${
                    item?.isSelected ? "fill-accent font-semibold" : "fill-gray-400"
                  }`}
                  style={{ cursor }}
                  onClick={() => {
                    if (item && !isFuture) {
                      onDateSelect(item.date);
                    }
                  }}
                >
                  {payload.value}
                </text>
              );
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}h`}
            tick={{ className: "fill-gray-500 text-xs" }}
            ticks={yTicks}
            domain={[0, yMax]}
            width={30}
          />

          <Bar
            dataKey="time"
            shape={(props: Omit<CustomBarProps, "onDateSelect">) => (
              <CustomBar {...props} onDateSelect={onDateSelect} />
            )}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
