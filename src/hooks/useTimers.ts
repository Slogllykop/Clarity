import { useEffect, useMemo, useState } from "react";
import { getTodayDate } from "@/db/utils";
import type { WebsiteActivity, WebsiteTimer } from "@/types";

/**
 * Custom hook for managing website timers via chrome.runtime messages.
 */
export function useTimers() {
  const [websites, setWebsites] = useState<WebsiteActivity[]>([]);
  const [timers, setTimers] = useState<Map<string, WebsiteTimer>>(new Map());
  const [intervalTimes, setIntervalTimes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [websitesResponse, timersResponse] = await Promise.all([
        chrome.runtime.sendMessage({
          type: "GET_WEBSITE_LIST",
          payload: { date: getTodayDate() },
        }),
        chrome.runtime.sendMessage({ type: "GET_ALL_TIMERS" }),
      ]);

      setWebsites(websitesResponse.websites || []);
      setIntervalTimes(timersResponse.intervalTimes || {});

      const timerMap = new Map<string, WebsiteTimer>();
      for (const timer of timersResponse.timers || []) {
        timerMap.set(timer.domain, timer);
      }
      setTimers(timerMap);
    } catch (error) {
      console.error("Error loading timer data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const setTimer = async (
    domain: string,
    timeLimit: number,
    intervalHours: number,
  ): Promise<boolean> => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "UPDATE_TIMER",
        payload: { domain, timeLimit, intervalHours, enabled: true },
      });

      if (response?.success) {
        await loadData();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error setting timer:", error);
      return false;
    }
  };

  const deleteTimer = async (domain: string): Promise<void> => {
    try {
      await chrome.runtime.sendMessage({
        type: "DELETE_TIMER",
        payload: { domain },
      });
      await loadData();
    } catch (error) {
      console.error("Error deleting timer:", error);
    }
  };

  const sortedWebsites = useMemo(
    () => [...websites].sort((a, b) => b.timeSpent - a.timeSpent),
    [websites],
  );

  const allTimersWithActivity = useMemo(() => {
    const timersList: Array<{
      domain: string;
      timeSpent: number;
      intervalTimeSpent: number;
      faviconUrl?: string;
      visitCount: number;
    }> = [];

    timers.forEach((_timer, domain) => {
      const website = websites.find((w) => w.domain === domain);
      timersList.push({
        domain,
        timeSpent: website?.timeSpent || 0,
        intervalTimeSpent: intervalTimes[domain] || 0,
        faviconUrl: website?.faviconUrl || undefined,
        visitCount: website?.visitCount || 0,
      });
    });

    return timersList.sort((a, b) => b.timeSpent - a.timeSpent);
  }, [timers, websites, intervalTimes]);

  return {
    websites,
    timers,
    intervalTimes,
    loading,
    sortedWebsites,
    allTimersWithActivity,
    setTimer,
    deleteTimer,
    reloadData: loadData,
  };
}
