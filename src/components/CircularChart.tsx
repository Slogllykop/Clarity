import { useMemo } from "react";
import { formatTime } from "@/db/utils";
import { getDomainDisplayName } from "@/lib/domain-utils";
import type { WebsiteActivity } from "@/types";

interface CircularChartProps {
  websites: Array<WebsiteActivity & { percentage: number }>;
  totalTime: number;
  onClick?: () => void;
}

export function CircularChart({ websites, totalTime, onClick }: CircularChartProps) {
  const chartData = useMemo(() => {
    let currentAngle = -90; // Start from top
    const colors = [
      "#10b981", // emerald
      "#3b82f6", // blue
      "#f59e0b", // amber
      "#ef4444", // red
      "#8b5cf6", // violet
      "#ec4899", // pink
      "#14b8a6", // teal
      "#f97316", // orange
      "#06b6d4", // cyan
      "#a855f7", // purple
      "#84cc16", // lime
      "#6366f1", // indigo
      "#eab308", // yellow
      "#22c55e", // green
      "#d946ef", // fuchsia
      "#0ea5e9", // sky
      "#f43f5e", // rose
      "#facc15", // yellow-400
    ];

    return websites.map((website, index) => {
      const percentage = website.percentage;
      const angle = (percentage / 100) * 360;
      // Use grey color for "Others" category, otherwise use colors array
      const color = website.domain === "Others" ? "#6b7280" : colors[index % colors.length];

      const segment = {
        domain: website.domain,
        percentage,
        color,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
      };

      currentAngle += angle;
      return segment;
    });
  }, [websites]);

  const radius = 80;
  const strokeWidth = 14; // Reduced from 20 to make it less fat
  const normalizedRadius = radius - strokeWidth / 2;

  return (
    <div
      className="flex flex-col items-center gap-4 cursor-pointer hover:opacity-90 transition-opacity"
      onClick={onClick}
    >
      <div className="relative">
        <svg height={radius * 2} width={radius * 2}>
          {/* Background circle */}
          <circle
            stroke="#1f1f1f"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />

          {/* Segments */}
          {chartData.map((segment, index) => {
            const startAngle = (segment.startAngle * Math.PI) / 180;
            const endAngle = (segment.endAngle * Math.PI) / 180;
            const largeArcFlag = segment.percentage > 50 ? 1 : 0;

            const startX = radius + normalizedRadius * Math.cos(startAngle);
            const startY = radius + normalizedRadius * Math.sin(startAngle);
            const endX = radius + normalizedRadius * Math.cos(endAngle);
            const endY = radius + normalizedRadius * Math.sin(endAngle);

            return (
              <path
                key={index}
                d={`M ${startX} ${startY} A ${normalizedRadius} ${normalizedRadius} 0 ${largeArcFlag} 1 ${endX} ${endY}`}
                stroke={segment.color}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-bold text-white">{formatTime(totalTime, true)}</div>
          <div className="text-xs text-gray-400">Today</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 justify-center max-w-[350px]">
        {chartData.map((segment, index) => (
          <div key={index} className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: segment.color }} />
            <span className="text-gray-300 truncate max-w-[80px]">
              {getDomainDisplayName(segment.domain)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
