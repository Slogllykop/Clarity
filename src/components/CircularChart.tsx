import { useCallback, useMemo, useRef, useState } from "react";
import { Label, Pie, PieChart } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { formatTime } from "@/db/utils";
import { getDomainDisplayName } from "@/lib/domain-utils";
import type { WebsiteActivity } from "@/types";

interface CircularChartProps {
  websites: Array<WebsiteActivity & { percentage: number }>;
  totalTime: number;
  onClick?: () => void;
}

export function CircularChart({ websites, totalTime, onClick }: CircularChartProps) {
  const [showLabels, setShowLabels] = useState(false);
  const [isAnimationActive, setIsAnimationActive] = useState(true);
  const hasAnimated = useRef(false);
  const animEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced handler — recharts fires onAnimationEnd per-sector, so we wait
  // for the last sector to finish before updating state
  const handleAnimationEnd = useCallback(() => {
    if (hasAnimated.current) return;
    if (animEndTimer.current) clearTimeout(animEndTimer.current);
    animEndTimer.current = setTimeout(() => {
      hasAnimated.current = true;
      setIsAnimationActive(false);
      setShowLabels(true);
    }, 50);
  }, []);

  const { chartData, chartConfig } = useMemo(() => {
    const colors = [
      "hsl(142, 76%, 36%)", // emerald-600
      "hsl(217, 91%, 60%)", // blue-500
      "hsl(38, 92%, 50%)", // amber-500
      "hsl(0, 84%, 60%)", // red-500
      "hsl(258, 90%, 66%)", // violet-500
      "hsl(330, 81%, 60%)", // pink-500
      "hsl(173, 80%, 40%)", // teal-600
      "hsl(24, 95%, 53%)", // orange-500
      "hsl(188, 94%, 43%)", // cyan-600
      "hsl(271, 91%, 65%)", // purple-500
      "hsl(78, 92%, 45%)", // lime-600
      "hsl(239, 84%, 67%)", // indigo-500
      "hsl(45, 93%, 47%)", // yellow-500
      "hsl(142, 71%, 45%)", // green-600
      "hsl(292, 84%, 61%)", // fuchsia-500
      "hsl(199, 89%, 48%)", // sky-600
      "hsl(351, 95%, 71%)", // rose-400
      "hsl(47, 96%, 53%)", // yellow-400
    ];

    const data =
      websites.length > 0
        ? websites.map((website, index) => ({
            domain: website.domain,
            time: website.timeSpent,
            percentage: website.percentage,
            fill: website.domain === "Others" ? "hsl(0, 0%, 42%)" : colors[index % colors.length],
          }))
        : [{ domain: "No Data", time: 1, percentage: 100, fill: "hsl(0, 0%, 20%)" }];

    const config =
      websites.length > 0
        ? websites.reduce(
            (acc, website, index) => {
              acc[website.domain] = {
                label: getDomainDisplayName(website.domain),
                color:
                  website.domain === "Others" ? "hsl(0, 0%, 42%)" : colors[index % colors.length],
              };
              return acc;
            },
            {} as Record<string, { label: string; color: string }>,
          )
        : { "No Data": { label: "No Data", color: "hsl(0, 0%, 20%)" } };

    return { chartData: data, chartConfig: config };
  }, [websites]);

  // Memoize label renderer so it doesn't change reference on re-renders
  const renderLabel = showLabels
    ? ({ cx, cy, midAngle, outerRadius, time, percentage }: Record<string, number>) => {
        // Skip labels for very small slices to prevent overlap
        if (percentage < 5) return null;

        const RADIAN = Math.PI / 180;
        const sin = Math.sin(-midAngle * RADIAN);
        const cos = Math.cos(-midAngle * RADIAN);

        // Start point on the outer edge
        const sx = cx + (outerRadius + 4) * cos;
        const sy = cy + (outerRadius + 4) * sin;

        // Mid point of the connector
        const mx = cx + (outerRadius + 20) * cos;
        const my = cy + (outerRadius + 20) * sin;

        // End point - extends horizontally
        const isRight = cos >= 0;
        const ex = mx + (isRight ? 14 : -14);
        const ey = my;

        return (
          <g style={{ animation: "fadeIn 100ms ease-in forwards" }}>
            <path
              d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
              stroke="#888"
              fill="none"
              strokeWidth={1}
            />
            <text
              x={ex + (isRight ? 5 : -5)}
              y={ey}
              fill="white"
              textAnchor={isRight ? "start" : "end"}
              dominantBaseline="central"
              className="text-[12px]"
            >
              {formatTime(time, true)}
            </text>
          </g>
        );
      }
    : false;

  return (
    <button
      className="flex flex-col items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg w-full bg-transparent border-none p-0"
      onClick={onClick}
      type="button"
    >
      <div className="h-[320px] w-[340px]">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="time"
              nameKey="domain"
              innerRadius={80}
              outerRadius={100}
              strokeWidth={2}
              stroke="#000000"
              isAnimationActive={isAnimationActive}
              onAnimationEnd={handleAnimationEnd}
              label={renderLabel}
              labelLine={false}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-white text-3xl font-bold"
                        >
                          {formatTime(totalTime, true)}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 20}
                          className="fill-gray-400 text-xs"
                        >
                          Today
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
            <ChartLegend
              content={<ChartLegendContent />}
              wrapperStyle={{ paddingTop: 16, paddingLeft: 8, paddingRight: 8 }}
            />
          </PieChart>
        </ChartContainer>
      </div>
    </button>
  );
}
