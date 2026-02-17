import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EXTENSION_MAX_HEIGHT } from "@/constants/layout";
import {
  formatDate,
  formatTime,
  generateWeeklyStatsArray,
  getRelativeDayLabel,
  getTodayDate,
  getWeekRange,
} from "@/db/utils";
import type { WebsiteActivity, WeeklyStats } from "@/types";
import { WebsiteList } from "./components/WebsiteList";
import { WeeklyBarChart } from "./components/WeeklyBarChart";

interface ActivityDetailsProps {
  onBack: () => void;
}

export function ActivityDetails({ onBack }: ActivityDetailsProps) {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([]);
  const [websites, setWebsites] = useState<WebsiteActivity[]>([]);
  const [totalTime, setTotalTime] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadWeeklyStats = async () => {
    try {
      const weekRange = getWeekRange(selectedDate);
      const response = await chrome.runtime.sendMessage({
        type: "GET_WEEKLY_STATS",
        payload: { startDate: weekRange.start, endDate: weekRange.end },
      });

      const stats = generateWeeklyStatsArray(weekRange, response.activities || []);
      setWeeklyStats(stats);
    } catch (error) {
      console.error("Error loading weekly stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadWebsitesForDate = async (date: string) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "GET_WEBSITE_LIST",
        payload: { date },
      });

      const websiteList = response.websites || [];
      setWebsites(websiteList);
      setTotalTime(websiteList.reduce((sum: number, w: WebsiteActivity) => sum + w.timeSpent, 0));
    } catch (error) {
      console.error("Error loading websites:", error);
    }
  };

  useEffect(() => {
    loadWeeklyStats();
  }, [selectedDate]);

  useEffect(() => {
    loadWebsitesForDate(selectedDate);
  }, [selectedDate]);

  const navigateDay = (direction: "prev" | "next") => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + (direction === "next" ? 1 : -1));
    const newDate = current.toISOString().split("T")[0];

    // Don't allow future dates
    if (direction === "next" && newDate > getTodayDate()) {
      return;
    }

    setSelectedDate(newDate);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-black text-white" style={{ height: `${EXTENSION_MAX_HEIGHT}px` }}>
      {/* Header */}
      <div className="bg-black border-b border-zinc-800 p-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
            <IconChevronLeft size={24} />
          </button>
          <h2 className="text-xl font-bold">Activity Details</h2>
        </div>
      </div>

      <ScrollArea style={{ height: `${EXTENSION_MAX_HEIGHT - 73}px` }}>
        {/* Stats Section */}
        <div className="p-6 border-b border-zinc-800">
          {/* Total Time */}
          <div className="text-center mb-6">
            <div className="text-4xl font-bold text-white mb-1">{formatTime(totalTime)}</div>
            <div className="text-sm text-gray-400">{getRelativeDayLabel(selectedDate)}</div>
          </div>

          {/* Weekly Bar Chart */}
          <WeeklyBarChart
            data={weeklyStats}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
          />

          {/* Day Navigation */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => navigateDay("prev")}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <IconChevronLeft size={20} />
            </button>

            <div className="text-center">
              <div className="text-sm font-medium text-white">
                {getRelativeDayLabel(selectedDate)}
              </div>
              <div className="text-xs text-gray-400">{formatDate(selectedDate)}</div>
            </div>

            <button
              onClick={() => navigateDay("next")}
              disabled={selectedDate >= getTodayDate()}
              className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed!"
            >
              <IconChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Website List */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Websites Visited</h3>
            <span className="text-sm text-gray-400">
              {websites.length} {websites.length === 1 ? "website" : "websites"}
            </span>
          </div>
          <WebsiteList websites={websites} />
        </div>
      </ScrollArea>
    </div>
  );
}
