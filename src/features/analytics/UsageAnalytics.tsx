import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EXTENSION_MAX_HEIGHT } from "@/constants/layout";
import { BiAnnualView } from "./components/BiAnnualView";
import { MonthlyView } from "./components/MonthlyView";
import { QuarterlyView } from "./components/QuarterlyView";
import type { Period } from "./constants";

interface UsageAnalyticsProps {
  onBack: () => void;
}

const PERIOD_OPTIONS = [
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "bi-annual", label: "Bi-Annual" },
] as const;

export function UsageAnalytics({ onBack }: UsageAnalyticsProps) {
  const [period, setPeriod] = useState<Period>("monthly");

  return (
    <div className="bg-black text-white" style={{ height: `${EXTENSION_MAX_HEIGHT}px` }}>
      <PageHeader
        title="Usage Analytics"
        subtitle="View detailed usage trends and patterns"
        onBack={onBack}
      />

      <ScrollArea style={{ height: `${EXTENSION_MAX_HEIGHT - 73}px` }}>
        <div className="p-6">
          {/* Period Selector */}
          <div className="flex gap-2 mb-6">
            {PERIOD_OPTIONS.map(({ key, label }) => (
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
