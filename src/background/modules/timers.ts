import { db } from "@/db/database";
import type { WebsiteTimer } from "@/types";

// Cache for timers to avoid frequent DB reads
let timerCache: Map<string, WebsiteTimer> = new Map();

/**
 * Load all timers into cache
 */
export async function loadTimerCache() {
  const timers = await db.getAllTimers();
  timerCache = new Map(timers.map((t) => [t.domain, t]));
}

/**
 * Get a timer from cache
 */
export function getCachedTimer(domain: string): WebsiteTimer | undefined {
  return timerCache.get(domain);
}

/**
 * Get the start timestamp of the current interval window for a given intervalHours.
 * Interval windows are aligned to midnight.
 * E.g., for intervalHours=6: windows are 0-6h, 6-12h, 12-18h, 18-24h.
 */
export function getIntervalWindowStart(intervalHours: number): Date {
  const now = new Date();
  if (intervalHours >= 24) {
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);
    return midnight;
  }

  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const hoursSinceMidnight = (now.getTime() - midnight.getTime()) / (1000 * 60 * 60);
  const windowIndex = Math.floor(hoursSinceMidnight / intervalHours);
  const windowStart = new Date(midnight.getTime() + windowIndex * intervalHours * 60 * 60 * 1000);
  return windowStart;
}

/**
 * Calculate time spent on a domain within the current interval window.
 * For 24h intervals, this returns the full day's time.
 * For shorter intervals, it approximates by scaling daily time proportionally
 * since we only track daily totals, not per-hour granularity.
 */
export function getTimeSpentInInterval(totalDailyTime: number, intervalHours: number): number {
  if (intervalHours >= 24) {
    return totalDailyTime;
  }

  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const hoursElapsedToday = Math.max((now.getTime() - midnight.getTime()) / (1000 * 60 * 60), 0.1);

  const windowStart = getIntervalWindowStart(intervalHours);
  const hoursIntoWindow = (now.getTime() - windowStart.getTime()) / (1000 * 60 * 60);
  const windowFraction = Math.min(hoursIntoWindow / hoursElapsedToday, 1);

  return Math.round(totalDailyTime * windowFraction);
}
