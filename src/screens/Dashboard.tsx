import { IconBell, IconClock, IconShield } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { CircularChart } from "@/components/CircularChart";
import { FeatureCard } from "@/components/FeatureCard";
import { calculatePercentages, getTodayDate, groupWebsitesByOthers } from "@/db/utils";
import type { DailyActivity, WebsiteActivity } from "@/types";

type Screen =
  | "dashboard"
  | "activity-details"
  | "website-timers"
  | "parental-controls"
  | "screen-time-reminders";

interface DashboardProps {
  onNavigate: (screen: Screen) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [dailyActivity, setDailyActivity] = useState<DailyActivity | null>(null);
  const [websites, setWebsites] = useState<WebsiteActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTodayStats = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: "GET_TODAY_STATS" });
      setDailyActivity(response.daily || { date: getTodayDate(), totalTime: 0, websiteCount: 0 });
      setWebsites(response.websites || []);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodayStats();

    // Refresh every 10 seconds
    const interval = setInterval(loadTodayStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const websitesWithPercentage = calculatePercentages(groupWebsitesByOthers(websites, 10));
  const totalTime = dailyActivity?.totalTime || 0;
  const websiteCount = dailyActivity?.websiteCount || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">
          <span className="text-white">Clar</span>
          <span className="text-accent">ity</span>
        </h1>
        <p className="text-gray-400 text-sm mt-1">Digital Wellbeing</p>
      </div>

      {/* Circular Chart */}
      <div className="mb-6">
        <CircularChart
          websites={websitesWithPercentage}
          totalTime={totalTime}
          onClick={() => onNavigate("activity-details")}
        />
      </div>

      {/* Website Counter */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-full border border-zinc-800">
          <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
          <span className="text-sm text-gray-300">
            {websiteCount} website{websiteCount !== 1 ? "s" : ""} visited today
          </span>
        </div>
      </div>

      {/* Features */}
      <div className="space-y-3">
        <FeatureCard
          icon={<IconClock size={20} />}
          title="Website Timers"
          description="Set time limits for specific websites"
          onClick={() => onNavigate("website-timers")}
        />
        <FeatureCard
          icon={<IconShield size={20} />}
          title="Parental Controls"
          description="Block websites with password protection"
          onClick={() => onNavigate("parental-controls")}
        />
        <FeatureCard
          icon={<IconBell size={20} />}
          title="Screen Time Reminders"
          description="Get notified about excessive usage"
          onClick={() => onNavigate("screen-time-reminders")}
        />
      </div>
    </div>
  );
}
