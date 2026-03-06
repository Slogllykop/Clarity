import {
  IconBell,
  IconChartBar,
  IconClock,
  IconDownload,
  IconShield,
  IconTarget,
  IconUpload,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EXTENSION_MAX_HEIGHT } from "@/constants/layout";
import { calculatePercentages, getTodayDate, groupWebsitesByOthers } from "@/db/utils";
import { useDataTransfer } from "@/hooks/useDataTransfer";
import type { ScreenName } from "@/hooks/useScreenNavigation";
import type { DailyActivity, WebsiteActivity } from "@/types";
import { CircularChart } from "./components/CircularChart";
import { FeatureCard } from "./components/FeatureCard";

interface DashboardProps {
  onNavigate: (screen: ScreenName) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [dailyActivity, setDailyActivity] = useState<DailyActivity | null>(null);
  const [websites, setWebsites] = useState<WebsiteActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTodayStats = async () => {
    try {
      const [statsResponse, blockedResponse] = await Promise.all([
        chrome.runtime.sendMessage({ type: "GET_TODAY_STATS" }),
        chrome.runtime.sendMessage({ type: "GET_BLOCKED_WEBSITES" }),
      ]);

      setDailyActivity(
        statsResponse.daily || { date: getTodayDate(), totalTime: 0, websiteCount: 0 },
      );

      // Filter out blocked websites from the chart
      const blockedDomains = (blockedResponse.blocked || []).map((b: { urlPattern: string }) =>
        b.urlPattern.toLowerCase(),
      );

      const filteredWebsites = (statsResponse.websites || []).filter((website: WebsiteActivity) => {
        const domainLower = website.domain.toLowerCase();
        return !blockedDomains.some(
          (blocked: string) => domainLower.includes(blocked) || blocked.includes(domainLower),
        );
      });

      setWebsites(filteredWebsites);
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

  const websitesWithPercentage = calculatePercentages(groupWebsitesByOthers(websites, 5));
  const totalTime = dailyActivity?.totalTime || 0;
  const websiteCount = dailyActivity?.websiteCount || 0;

  const { exporting, importing, fileInputRef, handleExport, handleImport, handleImportClick } =
    useDataTransfer({ onImportSuccess: loadTodayStats });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <ScrollArea className="bg-black text-white" style={{ height: `${EXTENSION_MAX_HEIGHT}px` }}>
      <div className="p-6 max-w-100">
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
        {/* Features Section */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-linear-to-r from-transparent via-zinc-700/60 to-transparent" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Features
            </h2>
            <div className="h-px flex-1 bg-linear-to-r from-transparent via-zinc-700/60 to-transparent" />
          </div>
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
            <FeatureCard
              icon={<IconChartBar size={20} />}
              title="Usage Analytics"
              description="View detailed usage trends and patterns"
              onClick={() => onNavigate("usage-analytics")}
            />
            <FeatureCard
              icon={<IconTarget size={20} />}
              title="Daily Targets"
              description="Set daily screen time goals with notifications"
              onClick={() => onNavigate("targets")}
            />
          </div>
        </div>
        {/* Data Management Section */}
        <div className="mt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-linear-to-r from-transparent via-zinc-700/60 to-transparent" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Data Management
            </h2>
            <div className="h-px flex-1 bg-linear-to-r from-transparent via-zinc-700/60 to-transparent" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* Export Button */}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="group relative p-px rounded-2xl transition-all duration-500 ease-out hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {/* Gradient border background - matches FeatureCard */}
              <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-zinc-800 via-zinc-900/50 to-zinc-800 opacity-100 transition-opacity duration-500 group-hover:from-emerald-500/50 group-hover:via-emerald-900/20 group-hover:to-zinc-800" />

              {/* Card Content */}
              <div className="relative flex flex-col items-center gap-2 p-4 bg-zinc-950/90 backdrop-blur-xl rounded-[15px] transition-colors duration-500 overflow-hidden">
                {/* Subtle inner top highlight */}
                <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-zinc-700/50 to-transparent opacity-50" />

                {/* Icon Container */}
                <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 transition-all duration-500 group-hover:border-emerald-500/30 group-hover:bg-emerald-950/30">
                  <div className="absolute inset-0 rounded-xl bg-emerald-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <IconDownload
                    size={18}
                    className="text-zinc-400 group-hover:text-emerald-400 transition-colors duration-300 relative z-10"
                  />
                </div>

                <span className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors duration-300">
                  {exporting ? "Exporting..." : "Export"}
                </span>
              </div>
            </button>

            {/* Import Button */}
            <button
              onClick={handleImportClick}
              disabled={importing}
              className="group relative p-px rounded-2xl transition-all duration-500 ease-out hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {/* Gradient border background - matches FeatureCard */}
              <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-zinc-800 via-zinc-900/50 to-zinc-800 opacity-100 transition-opacity duration-500 group-hover:from-emerald-500/50 group-hover:via-emerald-900/20 group-hover:to-zinc-800" />

              {/* Card Content */}
              <div className="relative flex flex-col items-center gap-2 p-4 bg-zinc-950/90 backdrop-blur-xl rounded-[15px] transition-colors duration-500 overflow-hidden">
                {/* Subtle inner top highlight */}
                <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-zinc-700/50 to-transparent opacity-50" />

                {/* Icon Container */}
                <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 transition-all duration-500 group-hover:border-emerald-500/30 group-hover:bg-emerald-950/30">
                  <div className="absolute inset-0 rounded-xl bg-emerald-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <IconUpload
                    size={18}
                    className="text-zinc-400 group-hover:text-emerald-400 transition-colors duration-300 relative z-10"
                  />
                </div>

                <span className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors duration-300">
                  {importing ? "Importing..." : "Import"}
                </span>
              </div>
            </button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </div>
    </ScrollArea>
  );
}
