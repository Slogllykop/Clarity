import { IconChevronLeft } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  YAxis,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXTENSION_MAX_HEIGHT } from "@/constants/layout";
import { db } from "@/db/database";
import type { DailyActivity } from "@/types";

// ─── Types & Constants ───────────────────────────────────────────────

type Period = "monthly" | "quarterly" | "bi-annual";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface UsageAnalyticsProps {
  onBack: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatHours(seconds: number): string {
  const hours = seconds / 3600;
  if (hours < 1) {
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  }
  return `${hours.toFixed(1)}h`;
}

// ─── Chart Configs ───────────────────────────────────────────────────

const barChartConfig = {
  screenTime: {
    label: "Screen Time",
    color: "#10b981",
  },
};

const radarChartConfig = {
  screenTime: {
    label: "Screen Time",
    color: "#10b981",
  },
};

// ─── Main Component ──────────────────────────────────────────────────

export function UsageAnalytics({ onBack }: UsageAnalyticsProps) {
  const [period, setPeriod] = useState<Period>("monthly");

  return (
    <div className="bg-black text-white" style={{ height: `${EXTENSION_MAX_HEIGHT}px` }}>
      {/* Header */}
      <div className="bg-black border-b border-zinc-800 p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <IconChevronLeft size={24} />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold">Usage Analytics</h2>
            <p className="text-xs text-gray-400 mt-1">View detailed usage trends and patterns</p>
          </div>
        </div>
      </div>

      <ScrollArea style={{ height: `${EXTENSION_MAX_HEIGHT - 73}px` }}>
        <div className="p-6">
          {/* Period Selector */}
          <div className="flex gap-2 mb-6">
            {(
              [
                { key: "monthly", label: "Monthly" },
                { key: "quarterly", label: "Quarterly" },
                { key: "bi-annual", label: "Bi-Annual" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`flex-1 py-2 px-3 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                  period === key
                    ? "bg-accent text-black"
                    : "bg-zinc-900 text-gray-400 hover:bg-zinc-800 border border-zinc-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Chart Area */}
          {period === "monthly" && <MonthlyView />}
          {period === "quarterly" && <QuarterlyView />}
          {period === "bi-annual" && <BiAnnualView />}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Monthly View ────────────────────────────────────────────────────

function MonthlyView() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const [selectedMonth, setSelectedMonth] = useState(`${currentYear}-${pad(currentMonth)}`);
  const [activities, setActivities] = useState<DailyActivity[]>([]);

  const [year, month] = selectedMonth.split("-").map(Number);
  const daysInMonth = getDaysInMonth(year, month);

  // Generate month options (last 6 months up to current)
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      options.push({
        value: `${y}-${pad(m)}`,
        label: `${MONTH_NAMES[m]} ${y}`,
      });
    }
    return options;
  }, [currentYear, currentMonth]);

  useEffect(() => {
    const fetchData = async () => {
      const startDate = `${year}-${pad(month + 1)}-01`;
      const endDate = `${year}-${pad(month + 1)}-${pad(daysInMonth)}`;
      try {
        const data = await db.getDailyActivitiesInRange(startDate, endDate);
        setActivities(data);
      } catch (error) {
        console.error("Error fetching monthly data:", error);
      }
    };
    fetchData();
  }, [year, month, daysInMonth]);

  const chartData = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
      const activity = activities.find((a) => a.date === dateStr);
      return {
        day,
        dateLabel: `${SHORT_MONTHS[month]} ${day}, ${year}`,
        screenTime: activity ? +(activity.totalTime / 3600).toFixed(2) : 0,
      };
    });
  }, [activities, year, month, daysInMonth]);

  const yMax = useMemo(() => {
    const max = Math.max(...chartData.map((d) => d.screenTime), 0);
    return Math.max(Math.ceil(max), 1);
  }, [chartData]);

  const yTicks = useMemo(() => {
    return Array.from({ length: yMax + 1 }, (_, i) => i);
  }, [yMax]);

  return (
    <div className="space-y-4">
      {/* Month Selector Dropdown */}
      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
        <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-white">
          <SelectValue placeholder="Select a month" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-800">
          {monthOptions.map((opt) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              className="text-white hover:bg-zinc-800 focus:bg-zinc-800 focus:text-white"
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Bar Chart */}
      <div className="w-full h-[220px]">
        <ChartContainer config={barChartConfig} className="h-full w-full">
          <BarChart data={chartData} margin={{ top: 10, right: 5, left: -5, bottom: 5 }}>
            <CartesianGrid vertical={false} stroke="#374151" />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}h`}
              tick={{ className: "fill-gray-500 text-xs" }}
              ticks={yTicks}
              domain={[0, yMax]}
              width={30}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  className="bg-zinc-900 border-none shadow-xl"
                  labelFormatter={(_label, payload) => {
                    const item = payload?.[0]?.payload;
                    return item?.dateLabel || "";
                  }}
                  formatter={(value, _name, _item) => (
                    <>
                      <div className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                      <div className="flex flex-1 justify-between leading-none items-center gap-4">
                        <span className="text-muted-foreground">Screen Time</span>
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {formatHours((value as number) * 3600)}
                        </span>
                      </div>
                    </>
                  )}
                />
              }
            />
            <Bar dataKey="screenTime" fill="#10b981" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}

// ─── Quarterly View ──────────────────────────────────────────────────

function QuarterlyView() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const [activities, setActivities] = useState<DailyActivity[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;
      try {
        const data = await db.getDailyActivitiesInRange(startDate, endDate);
        setActivities(data);
      } catch (error) {
        console.error("Error fetching quarterly data:", error);
      }
    };
    fetchData();
  }, [currentYear]);

  const quarters = useMemo(() => {
    return [
      { label: "Jan – Mar", months: [0, 1, 2] },
      { label: "Apr – Jun", months: [3, 4, 5] },
      { label: "Jul – Sep", months: [6, 7, 8] },
      { label: "Oct – Dec", months: [9, 10, 11] },
    ].map((q) => {
      const data = q.months.map((m) => {
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
      return { ...q, data };
    });
  }, [activities]);

  return (
    <div className="space-y-6">
      {quarters.map((q, i) => (
        <div key={q.label} className="w-full">
          <div className="p-4">
            <div className="w-full h-[200px]">
              <ChartContainer config={radarChartConfig} className="h-full w-full">
                <RadarChart data={q.data}>
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
            <p className="text-center text-base font-medium text-white mt-4">{q.label}</p>
          </div>
          {i < quarters.length - 1 && <div className="h-px bg-zinc-800 w-full" />}
        </div>
      ))}
    </div>
  );
}

// ─── Bi-Annual View ──────────────────────────────────────────────────

function BiAnnualView() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const [activities, setActivities] = useState<DailyActivity[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;
      try {
        const data = await db.getDailyActivitiesInRange(startDate, endDate);
        setActivities(data);
      } catch (error) {
        console.error("Error fetching bi-annual data:", error);
      }
    };
    fetchData();
  }, [currentYear]);

  const halves = useMemo(() => {
    return [
      { label: "Jan – Jun", months: [0, 1, 2, 3, 4, 5] },
      { label: "Jul – Dec", months: [6, 7, 8, 9, 10, 11] },
    ].map((h) => {
      const data = h.months.map((m) => {
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
      return { ...h, data };
    });
  }, [activities]);

  return (
    <div className="space-y-6">
      {halves.map((h, i) => (
        <div key={h.label} className="w-full">
          <div className="p-4">
            <div className="w-full h-[250px]">
              <ChartContainer config={radarChartConfig} className="h-full w-full">
                <RadarChart data={h.data}>
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
            <p className="text-center text-base font-medium text-white mt-4">{h.label}</p>
          </div>
          {i < halves.length - 1 && <div className="h-px bg-zinc-800 w-full" />}
        </div>
      ))}
    </div>
  );
}
