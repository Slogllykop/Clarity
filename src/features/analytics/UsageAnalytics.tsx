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
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
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
          <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
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
                className={`flex-1 py-2 px-3 rounded-full text-sm font-medium transition-colors ${
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
  const [inputValue, setInputValue] = useState("");

  const [year, month] = selectedMonth.split("-").map(Number);
  const daysInMonth = getDaysInMonth(year, month);

  const [availableMonths, setAvailableMonths] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchAllMonths = async () => {
      const earliest = await db.getEarliestActivityDate();
      if (!earliest) return;

      const data = await db.getDailyActivitiesInRange(
        earliest,
        `${currentYear}-${pad(currentMonth + 1)}-31`,
      );

      const months = new Set<string>();
      data.forEach((a) => {
        if (a.totalTime > 0) {
          const [y, mStr] = a.date.split("-");
          months.add(`${y}-${pad(Number(mStr) - 1)}`);
        }
      });

      setAvailableMonths(months);

      // If the currently selected month has no data, select the most recent one with data
      if (months.size > 0 && !months.has(`${currentYear}-${pad(currentMonth)}`)) {
        const sorted = Array.from(months).sort((a, b) => b.localeCompare(a));
        setSelectedMonth(sorted[0]);
      }
    };
    fetchAllMonths();
  }, [currentYear, currentMonth]);

  // Generate month options (only for months with data)
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const sorted = Array.from(availableMonths).sort((a, b) => b.localeCompare(a));

    if (sorted.length === 0) {
      // Fallback if no data is present yet
      options.push({
        value: `${currentYear}-${pad(currentMonth)}`,
        label: `${MONTH_NAMES[currentMonth]} ${currentYear}`,
      });
      return options;
    }

    sorted.forEach((val) => {
      const [yStr, mStr] = val.split("-");
      options.push({
        value: val,
        label: `${MONTH_NAMES[Number(mStr)]} ${yStr}`,
      });
    });

    return options;
  }, [availableMonths, currentYear, currentMonth]);

  const selectedLabel = useMemo(() => {
    const opt = monthOptions.find((o) => o.value === selectedMonth);
    return opt ? opt.label : selectedMonth;
  }, [monthOptions, selectedMonth]);

  // Keep input in sync with the selected item's label
  useEffect(() => {
    setInputValue(selectedLabel);
  }, [selectedLabel]);

  // Filter dynamically based on search string
  const filteredOptions = useMemo(() => {
    // If input matches exactly the selected label, or is empty, show all options
    if (!inputValue || inputValue === selectedLabel) return monthOptions;

    const lower = inputValue.toLowerCase();
    return monthOptions.filter((o) => o.label.toLowerCase().includes(lower));
  }, [monthOptions, inputValue, selectedLabel]);

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
      <Combobox
        value={selectedLabel}
        onValueChange={(labelResult) => {
          if (labelResult) {
            const opt = monthOptions.find((o) => o.label === labelResult);
            if (opt) setSelectedMonth(opt.value);
          }
        }}
        inputValue={inputValue}
        onInputValueChange={(newVal) => {
          if (/^\d{4}-\d{2}$/.test(newVal)) {
            const match = monthOptions.find((o) => o.value === newVal);
            if (match) {
              setInputValue(match.label);
              return;
            }
          }
          setInputValue(newVal);
        }}
      >
        <ComboboxInput
          placeholder="Search month..."
          showTrigger
          className="w-full ring-accent bg-zinc-900 border-zinc-800 text-white *:data-[slot=input-group-input]:text-white *:data-[slot=input-group-input]:placeholder:text-gray-400"
        />
        <ComboboxContent className="bg-zinc-900 border-zinc-800 w-[--anchor-width]">
          <ComboboxList className="">
            {filteredOptions.length === 0 ? (
              <div className="text-gray-400 p-2 text-sm text-center">No months found</div>
            ) : (
              filteredOptions.map((opt) => (
                <ComboboxItem
                  key={opt.value}
                  value={opt.label}
                  className="text-white data-highlighted:bg-zinc-800 data-highlighted:text-white cursor-pointer"
                >
                  {opt.label}
                </ComboboxItem>
              ))
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
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

const QUARTER_DEFINITIONS = [
  { key: "Q1", label: "Q1 · Jan – Mar", months: [0, 1, 2] },
  { key: "Q2", label: "Q2 · Apr – Jun", months: [3, 4, 5] },
  { key: "Q3", label: "Q3 · Jul – Sep", months: [6, 7, 8] },
  { key: "Q4", label: "Q4 · Oct – Dec", months: [9, 10, 11] },
] as const;

function QuarterlyView() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarterIndex = Math.floor(now.getMonth() / 3);

  const [selectedQuarter, setSelectedQuarter] = useState<string>(
    QUARTER_DEFINITIONS[currentQuarterIndex].key,
  );
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [activities, setActivities] = useState<DailyActivity[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([String(currentYear)]);

  // Discover available years from database
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

// ─── Bi-Annual View ──────────────────────────────────────────────────

const HALF_DEFINITIONS = [
  { key: "H1", label: "H1 · Jan – Jun", months: [0, 1, 2, 3, 4, 5] },
  { key: "H2", label: "H2 · Jul – Dec", months: [6, 7, 8, 9, 10, 11] },
] as const;

function BiAnnualView() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentHalfKey = now.getMonth() < 6 ? "H1" : "H2";

  const [selectedHalf, setSelectedHalf] = useState<string>(currentHalfKey);
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [activities, setActivities] = useState<DailyActivity[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([String(currentYear)]);

  // Discover available years from database
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
        console.error("Error fetching bi-annual data:", error);
      }
    };
    fetchData();
  }, [selectedYear]);

  const selectedH = HALF_DEFINITIONS.find((h) => h.key === selectedHalf)!;

  const chartData = useMemo(() => {
    return selectedH.months.map((m) => {
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
  }, [activities, selectedH]);

  return (
    <div className="space-y-4">
      {/* Half & Year Selectors */}
      <div className="flex gap-2">
        <Select value={selectedHalf} onValueChange={setSelectedHalf}>
          <SelectTrigger className="flex-1 bg-zinc-900 border-zinc-800 text-white focus:ring-accent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            {HALF_DEFINITIONS.map((h) => (
              <SelectItem
                key={h.key}
                value={h.key}
                className="text-white focus:bg-zinc-800 focus:text-white cursor-pointer"
              >
                {h.label}
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

      {/* Radar Chart for Selected Half */}
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
            {selectedH.label} · {selectedYear}
          </p>
        </div>
      </div>
    </div>
  );
}
