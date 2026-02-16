import {
  IconBell,
  IconChartBar,
  IconClock,
  IconDownload,
  IconShield,
  IconUpload,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CircularChart } from "@/components/CircularChart";
import { FeatureCard } from "@/components/FeatureCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EXTENSION_MAX_HEIGHT } from "@/constants/layout";
import { db } from "@/db/database";
import { calculatePercentages, getTodayDate, groupWebsitesByOthers } from "@/db/utils";
import type { ScreenName } from "@/hooks/useScreenNavigation";
import type { DailyActivity, WebsiteActivity } from "@/types";

interface DashboardProps {
  onNavigate: (screen: ScreenName) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [dailyActivity, setDailyActivity] = useState<DailyActivity | null>(null);
  const [websites, setWebsites] = useState<WebsiteActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleExport = async () => {
    try {
      setExporting(true);
      const exportData = await db.exportAllData();

      // Create JSON blob
      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clarity-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log("Export successful");
      toast.success("Data exported successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export data. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);

      // Read file
      const text = await file.text();
      const importData = JSON.parse(text);

      // Validate structure
      if (!importData.data || !importData.version) {
        throw new Error("Invalid backup file format");
      }

      // Import to database
      await db.importAllData(importData);

      // Reload stats
      await loadTodayStats();

      // Notify background worker to reload
      await chrome.runtime.sendMessage({ type: "RELOAD_DATA" });

      toast.success("Data imported successfully!");
      console.log("Import successful");
    } catch (error) {
      console.error("Import failed:", error);
      toast.error(
        `Failed to import data: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <ScrollArea className="bg-black text-white" style={{ height: `${EXTENSION_MAX_HEIGHT}px` }}>
      <div className="p-6">
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
          <FeatureCard
            icon={<IconChartBar size={20} />}
            title="Usage Analytics"
            description="View detailed usage trends and patterns"
            onClick={() => onNavigate("usage-analytics")}
          />
        </div>

        {/* Import/Export Section */}
        <div className="mt-6 pt-6 border-t border-zinc-800">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Data Management</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-accent rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IconDownload size={18} className="text-accent" />
              <span className="text-sm font-medium text-white">
                {exporting ? "Exporting..." : "Export Data"}
              </span>
            </button>

            <button
              onClick={handleImportClick}
              disabled={importing}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-accent rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IconUpload size={18} className="text-accent" />
              <span className="text-sm font-medium text-white">
                {importing ? "Importing..." : "Import Data"}
              </span>
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
