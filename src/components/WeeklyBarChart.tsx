import { useMemo } from "react";
import { getTodayDate } from "@/db/utils";
import type { WeeklyStats } from "@/types";

interface WeeklyBarChartProps {
  data: WeeklyStats[];
  selectedDate: string;
  onDateSelect: (date: string) => void;
}

export function WeeklyBarChart({ data, selectedDate, onDateSelect }: WeeklyBarChartProps) {
  const maxTime = useMemo(() => {
    const max = Math.max(...data.map((d) => d.totalTime), 1);
    // Round up to next even hour for nice scale
    const maxHours = Math.ceil(max / 3600);
    return Math.ceil(maxHours / 2) * 2 * 3600; // Round to nearest 2 hours
  }, [data]);

  const maxHours = maxTime / 3600;

  return (
    <div className="w-full">
      {/* Chart */}
      <div className="flex items-end justify-between gap-2 h-40 px-4">
        {data.map((stat) => {
          const heightPercentage = maxTime > 0 ? (stat.totalTime / maxTime) * 100 : 0;
          const isSelected = stat.date === selectedDate;

          const isFutureDate = stat.date > getTodayDate();

          return (
            <button
              key={stat.date}
              onClick={() => !isFutureDate && onDateSelect(stat.date)}
              disabled={isFutureDate}
              className="flex-1 flex flex-col items-center gap-2 group disabled:cursor-not-allowed disabled:opacity-50"
            >
              {/* Bar */}
              <div className="w-full flex items-end justify-center" style={{ height: "140px" }}>
                <div
                  className={`w-full rounded-t transition-all ${
                    isSelected
                      ? "bg-accent"
                      : isFutureDate
                        ? "bg-zinc-900"
                        : "bg-zinc-800 group-hover:bg-zinc-700"
                  }`}
                  style={{
                    height: `${heightPercentage}%`,
                    minHeight: heightPercentage > 0 ? "4px" : "0px",
                  }}
                />
              </div>

              {/* Label */}
              <span
                className={`text-xs ${isSelected ? "text-accent font-semibold" : "text-gray-400"}`}
              >
                {stat.day}
              </span>
            </button>
          );
        })}
      </div>

      {/* Y-axis labels */}
      <div className="flex justify-end gap-2 text-xs text-gray-500 mt-2 px-4">
        <span>Max: {maxHours}h</span>
      </div>
    </div>
  );
}
