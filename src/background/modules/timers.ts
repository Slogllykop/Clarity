import { db } from "@/db/database";
import type { WebsiteTimer } from "@/types";

// ─── Timer Cache ─────────────────────────────────────────────────────

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

// ─── Interval Accumulator ────────────────────────────────────────────

interface IntervalBucket {
  windowStart: number; // timestamp of current interval window start
  timeSpent: number; // seconds accumulated in this window
}

const INTERVAL_STORAGE_KEY = "clarity_interval_accumulators";

/**
 * In-memory accumulator: domain -> { windowStart, timeSpent }
 */
let intervalAccumulators: Map<string, IntervalBucket> = new Map();

/**
 * Get the start timestamp of the current interval window for a given intervalHours.
 * Interval windows are aligned to midnight.
 * E.g., for intervalHours=6: windows are 0-6h, 6-12h, 12-18h, 18-24h.
 */
export function getIntervalWindowStart(intervalHours: number): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);

  if (intervalHours >= 24) {
    return midnight.getTime();
  }

  const hoursSinceMidnight = (now.getTime() - midnight.getTime()) / (1000 * 60 * 60);
  const windowIndex = Math.floor(hoursSinceMidnight / intervalHours);
  return midnight.getTime() + windowIndex * intervalHours * 60 * 60 * 1000;
}

/**
 * Add time to the interval accumulator for a domain.
 * Automatically resets if the interval window has rolled over.
 */
export function addIntervalTime(domain: string, seconds: number): void {
  const timer = timerCache.get(domain);
  if (!timer || !timer.enabled) return;

  const intervalHours = timer.intervalHours || 24;
  const windowStart = getIntervalWindowStart(intervalHours);

  const existing = intervalAccumulators.get(domain);

  if (existing && existing.windowStart === windowStart) {
    existing.timeSpent += seconds;
  } else {
    // New window or first entry – reset
    intervalAccumulators.set(domain, { windowStart, timeSpent: seconds });
  }

  // Persist in background (fire-and-forget)
  persistIntervalAccumulators();
}

/**
 * Get the accumulated time spent on a domain in the current interval window.
 */
export function getIntervalTimeSpent(domain: string, intervalHours: number): number {
  const windowStart = getIntervalWindowStart(intervalHours);
  const bucket = intervalAccumulators.get(domain);

  if (!bucket || bucket.windowStart !== windowStart) {
    return 0;
  }

  return bucket.timeSpent;
}

/**
 * Get all interval time data for domains that have active timers.
 * Returns a map of domain -> intervalTimeSpent.
 */
export function getAllIntervalTimes(): Map<string, number> {
  const result = new Map<string, number>();

  for (const [domain, timer] of timerCache) {
    if (!timer.enabled) continue;
    const intervalHours = timer.intervalHours || 24;
    result.set(domain, getIntervalTimeSpent(domain, intervalHours));
  }

  return result;
}

/**
 * Reset all interval accumulators (called at midnight).
 */
export function resetAllIntervalAccumulators(): void {
  intervalAccumulators.clear();
  persistIntervalAccumulators();
}

/**
 * Persist interval accumulators to chrome.storage.local for crash recovery.
 */
async function persistIntervalAccumulators(): Promise<void> {
  try {
    const serialized: Record<string, IntervalBucket> = {};
    for (const [domain, bucket] of intervalAccumulators) {
      serialized[domain] = bucket;
    }
    await chrome.storage.local.set({ [INTERVAL_STORAGE_KEY]: serialized });
  } catch (error) {
    console.error("Clarity: Error persisting interval accumulators", error);
  }
}

/**
 * Load interval accumulators from chrome.storage.local on startup.
 */
export async function loadIntervalAccumulators(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(INTERVAL_STORAGE_KEY);
    const stored = result[INTERVAL_STORAGE_KEY] as Record<string, IntervalBucket> | undefined;

    if (stored) {
      intervalAccumulators = new Map(Object.entries(stored));

      // Prune stale windows
      for (const [domain, bucket] of intervalAccumulators) {
        const timer = timerCache.get(domain);
        if (!timer) {
          intervalAccumulators.delete(domain);
          continue;
        }
        const intervalHours = timer.intervalHours || 24;
        const currentWindowStart = getIntervalWindowStart(intervalHours);
        if (bucket.windowStart !== currentWindowStart) {
          intervalAccumulators.delete(domain);
        }
      }
    }
  } catch (error) {
    console.error("Clarity: Error loading interval accumulators", error);
  }
}
