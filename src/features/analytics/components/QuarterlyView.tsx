import { useEffect, useMemo, useState } from "react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { db } from "@/db/database";
import type { DailyActivity } from "@/types";
import { QUARTER_DEFINITIONS, radarChartConfig, SHORT_MONTHS } from "../constants";

export function QuarterlyView() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarterIndex = Math.floor(now.getMonth() / 3);

  const [selectedQuarter, setSelectedQuarter] = useState<string>(
    QUARTER_DEFINITIONS[currentQuarterIndex].key,
  );
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [activities, setActivities] = useState<DailyActivity[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([String(currentYear)]);

  useEffect(() => {
    const fetchYears = async () => {
      const earliest = await db.getEarliestActivityDate();
      if (!earliest) return;
      const startYear = Number.parseInt(earliest.split("-")[0], 10);
      const years: string[] = [];
      for (let y = currentYear; y >= startYear; y--) {
        years.push(String(y));
      }
      setAvailableYears(years);
    };
    fetchYears();
  }, [currentYear]);

  useEffect(() => {
    const fetchData = async () => {
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;
      try {
        const data = await db.getDailyActivitiesInRange(startDate, endDate);
        setActivities(data);
      } catch (error) {
        console.error("Error fetching quarterly data:", error);
      }
    };
    fetchData();
  }, [selectedYear]);

  const selectedQ = QUARTER_DEFINITIONS.find((q) => q.key === selectedQuarter)!;

  const chartData = useMemo(() => {
    return selectedQ.months.map((m) => {
      const monthActivities = activities.filter((a) => {
        const actMonth = new Date(a.date).getMonth();
        return actMonth === m;
      });
      const totalSeconds = monthActivities.reduce((sum, a) => sum + a.totalTime, 0);
      return {
        month: SHORT_MONTHS[m],
        screenTime: +(totalSeconds / 3600).toFixed(1),
      };
    });
  }, [activities, selectedQ]);

  return (
    <div className="space-y-4">
      {/* Quarter & Year Selectors */}
      <div className="flex gap-2">
        <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
          <SelectTrigger className="flex-1 bg-zinc-900 border-zinc-800 text-white focus:ring-accent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            {QUARTER_DEFINITIONS.map((q) => (
              <SelectItem
                key={q.key}
                value={q.key}
                className="text-white focus:bg-zinc-800 focus:text-white cursor-pointer"
              >
                {q.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[100px] bg-zinc-900 border-zinc-800 text-white focus:ring-accent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            {availableYears.map((y) => (
              <SelectItem
                key={y}
                value={y}
                className="text-white focus:bg-zinc-800 focus:text-white cursor-pointer"
              >
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Radar Chart for Selected Quarter */}
      <div className="w-full">
        <div className="p-4">
          <div className="w-full h-[250px]">
            <ChartContainer config={radarChartConfig} className="h-full w-full">
              <RadarChart data={chartData}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <Radar
                  dataKey="screenTime"
                  fill="#10b981"
                  fillOpacity={0.3}
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{
                    r: 4,
                    fill: "#10b981",
                    fillOpacity: 1,
                  }}
                />
              </RadarChart>
            </ChartContainer>
          </div>
          <p className="text-center text-base font-medium text-white mt-4">
            {selectedQ.label} · {selectedYear}
          </p>
        </div>
      </div>
    </div>
  );
}
