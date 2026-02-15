import { useMemo } from "react";
import { formatTime } from "@/db/utils";
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
      "#10b981", // green
      "#34d399", // light green
      "#059669", // dark green
      "#6ee7b7", // lighter green
      "#047857", // darker green
      "#a7f3d0", // very light green
      "#065f46", // very dark green
      "#d1fae5", // pale green
      "#064e3b", // deepest green
      "#ffffff", // white for others
    ];

    return websites.map((website, index) => {
      const percentage = website.percentage;
      const angle = (percentage / 100) * 360;
      const color = colors[index % colors.length];

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
  const strokeWidth = 20;
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
          <div className="text-3xl font-bold text-white">{formatTime(totalTime)}</div>
          <div className="text-xs text-gray-400">Today</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 justify-center max-w-[350px]">
        {chartData.slice(0, 5).map((segment, index) => (
          <div key={index} className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: segment.color }} />
            <span className="text-gray-300 truncate max-w-[80px]">{segment.domain}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
