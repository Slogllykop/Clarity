import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { db } from "@/db/database";
import { log } from "@/lib/logger";
import type { DailyActivity } from "@/types";
import { barChartConfig, MONTH_NAMES, SHORT_MONTHS } from "../constants";
import { formatHours, getDaysInMonth, pad } from "../helpers";

export function MonthlyView() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const [selectedMonth, setSelectedMonth] = useState(`${currentYear}-${pad(currentMonth)}`);
  const [activities, setActivities] = useState<DailyActivity[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [availableMonths, setAvailableMonths] = useState<Set<string>>(new Set());

  const [year, month] = selectedMonth.split("-").map(Number);
  const daysInMonth = getDaysInMonth(year, month);

  useEffect(() => {
    const fetchAllMonths = async () => {
      const earliest = await db.getEarliestActivityDate();
      if (!earliest) return;

      const data = await db.getDailyActivitiesInRange(
        earliest,
        `${currentYear}-${pad(currentMonth + 1)}-31`,
      );

      const months = new Set<string>();
      for (const a of data) {
        if (a.totalTime > 0) {
          const [y, mStr] = a.date.split("-");
          months.add(`${y}-${pad(Number(mStr) - 1)}`);
        }
      }

      setAvailableMonths(months);

      if (months.size > 0 && !months.has(`${currentYear}-${pad(currentMonth)}`)) {
        const sorted = Array.from(months).sort((a, b) => b.localeCompare(a));
        setSelectedMonth(sorted[0]);
      }
    };
    fetchAllMonths();
  }, [currentYear, currentMonth]);

  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const sorted = Array.from(availableMonths).sort((a, b) => b.localeCompare(a));

    if (sorted.length === 0) {
      options.push({
        value: `${currentYear}-${pad(currentMonth)}`,
        label: `${MONTH_NAMES[currentMonth]} ${currentYear}`,
      });
      return options;
    }

    for (const val of sorted) {
      const [yStr, mStr] = val.split("-");
      options.push({
        value: val,
        label: `${MONTH_NAMES[Number(mStr)]} ${yStr}`,
      });
    }

    return options;
  }, [availableMonths, currentYear, currentMonth]);

  const selectedLabel = useMemo(() => {
    const opt = monthOptions.find((o) => o.value === selectedMonth);
    return opt ? opt.label : selectedMonth;
  }, [monthOptions, selectedMonth]);

  useEffect(() => {
    setInputValue(selectedLabel);
  }, [selectedLabel]);

  const filteredOptions = useMemo(() => {
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
        log.error("Error fetching monthly data", error);
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
