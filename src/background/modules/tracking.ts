import { db } from "@/db/database";
import { extractDomain, getTodayDate, isInternalPage, isNewTabPage } from "@/db/utils";
import type { WebsiteActivity } from "@/types";
import { checkTimerLimit, updateBlockingRules } from "./blocking";
import { resetNotificationTracker } from "./notifications";
import { addIntervalTime } from "./timers";

// ─── Session State ───────────────────────────────────────────────────

interface SessionState {
  tabId: number | null;
  domain: string | null;
  startTime: number | null;
  faviconUrl: string | null;
  isNewVisit: boolean;
  sessionDate: string | null;
}

let currentSession: SessionState = {
  tabId: null,
  domain: null,
  startTime: null,
  faviconUrl: null,
  isNewVisit: false,
  sessionDate: null,
};

let isUserIdle = false;
let isWindowFocused = false;

// Maximum seconds to accept per save chunk. The save alarm fires every
// 10 seconds, so anything significantly above that indicates the session
// ran while the window was unfocused or the service worker was suspended.
const MAX_SESSION_CHUNK_SECONDS = 120;

/**
 * Get current session state (for use by other modules)
 */
export function getCurrentSession(): Readonly<SessionState> {
  return currentSession;
}

/**
 * Set idle state
 */
export function setIdleState(idle: boolean) {
  isUserIdle = idle;
}

/**
 * Set window focus state (called from service-worker.ts)
 */
export function setWindowFocused(focused: boolean) {
  isWindowFocused = focused;
}

/**
 * Get window focus state
 */
export function getWindowFocused(): boolean {
  return isWindowFocused;
}

// ─── Session Management ──────────────────────────────────────────────

/**
 * Save current session to database.
 * Skipped when the browser window is not focused to prevent
 * background profiles from accumulating phantom screen time.
 */
export async function saveCurrentSession() {
  if (!currentSession.domain || !currentSession.startTime) {
    return;
  }

  // Don't save time while the window is unfocused or the user is idle
  if (!isWindowFocused || isUserIdle) {
    return;
  }

  const today = getTodayDate();

  // Handle day change
  if (currentSession.sessionDate && currentSession.sessionDate !== today) {
    console.log(
      `Clarity: Day changed from ${currentSession.sessionDate} to ${today}, resetting session`,
    );

    const todayMidnight = new Date(today);
    todayMidnight.setHours(0, 0, 0, 0);
    const midnightTime = todayMidnight.getTime();

    const timeUntilMidnight = Math.floor((midnightTime - currentSession.startTime) / 1000);

    if (timeUntilMidnight > 0) {
      const domain = currentSession.domain;
      try {
        const existing = await db.getWebsiteActivity(currentSession.sessionDate, domain);
        const activity: WebsiteActivity = {
          date: currentSession.sessionDate,
          domain,
          faviconUrl: currentSession.faviconUrl || existing?.faviconUrl || null,
          timeSpent: (existing?.timeSpent || 0) + timeUntilMidnight,
          visitCount: (existing?.visitCount || 0) + (currentSession.isNewVisit ? 1 : 0),
          lastVisit: midnightTime - 1,
        };
        await db.saveWebsiteActivity(activity);

        const dailyActivities = await db.getWebsiteActivitiesForDate(currentSession.sessionDate);
        const totalTime = dailyActivities.reduce((sum, a) => sum + a.timeSpent, 0);
        const websiteCount = dailyActivities.length;
        await db.saveDailyActivity({
          date: currentSession.sessionDate,
          totalTime,
          websiteCount,
        });

        console.log(
          `Clarity: Saved ${timeUntilMidnight}s for ${domain} to previous day ${currentSession.sessionDate}`,
        );
      } catch (error) {
        console.error("Clarity: Error saving previous day session", error);
      }
    }

    currentSession.startTime = midnightTime;
    currentSession.sessionDate = today;
    currentSession.isNewVisit = true;

    await resetNotificationTracker();
    await updateBlockingRules();
  }

  let timeSpent = Math.floor((Date.now() - currentSession.startTime) / 1000);
  if (timeSpent < 1) return;

  // Cap the chunk to guard against runaway accumulation (e.g. after
  // a service worker suspension/resume while the window was unfocused).
  timeSpent = Math.min(timeSpent, MAX_SESSION_CHUNK_SECONDS);

  const domain = currentSession.domain;

  try {
    const existing = await db.getWebsiteActivity(today, domain);
    const activity: WebsiteActivity = {
      date: today,
      domain,
      faviconUrl: currentSession.faviconUrl || existing?.faviconUrl || null,
      timeSpent: (existing?.timeSpent || 0) + timeSpent,
      visitCount: (existing?.visitCount || 0) + (currentSession.isNewVisit ? 1 : 0),
      lastVisit: Date.now(),
    };

    await db.saveWebsiteActivity(activity);
    currentSession.isNewVisit = false;

    const dailyActivities = await db.getWebsiteActivitiesForDate(today);
    const totalTime = dailyActivities.reduce((sum, a) => sum + a.timeSpent, 0);
    const websiteCount = dailyActivities.length;

    await db.saveDailyActivity({
      date: today,
      totalTime,
      websiteCount,
    });

    // Add this chunk to the interval accumulator
    addIntervalTime(domain, timeSpent);

    await checkTimerLimit(domain, activity.timeSpent, currentSession.tabId);

    console.log(`Clarity: Saved ${timeSpent}s for ${domain}`);
  } catch (error) {
    console.error("Clarity: Error saving session", error);
  }

  currentSession.startTime = Date.now();
}

/**
 * Start tracking a new tab
 */
export async function startTracking(tabId: number, url: string, faviconUrl?: string) {
  if (isUserIdle) {
    console.log("Clarity: Ignoring startTracking while user is idle");
    return;
  }

  if (!isWindowFocused) {
    console.log("Clarity: Ignoring startTracking while window is unfocused");
    return;
  }

  await saveCurrentSession();

  if (isInternalPage(url) || isNewTabPage(url)) {
    stopTracking();
    return;
  }

  const domain = extractDomain(url);

  currentSession = {
    tabId,
    domain,
    startTime: Date.now(),
    faviconUrl: faviconUrl || null,
    isNewVisit: true,
    sessionDate: getTodayDate(),
  };

  console.log(`Clarity: Started tracking ${domain}`);
}

/**
 * Stop tracking current session
 */
export async function stopTracking() {
  await saveCurrentSession();
  currentSession = {
    tabId: null,
    domain: null,
    startTime: null,
    faviconUrl: null,
    isNewVisit: false,
    sessionDate: null,
  };
  console.log("Clarity: Stopped tracking");
}

/**
 * Check and start tracking the currently-active tab.
 *
 * This function trusts the `isWindowFocused` flag that is maintained by
 * `setWindowFocused()` (driven by `chrome.windows.onFocusChanged`).
 * It does NOT independently query `chrome.windows.getLastFocused()`,
 * because that async call can return stale data and create a race
 * condition that prevents tracking from resuming after window re-focus.
 */
export async function checkActiveTab() {
  if (!isWindowFocused) {
    console.log("Clarity: Window not focused, skipping checkActiveTab");
    return;
  }

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id && tab.url) {
      await startTracking(tab.id, tab.url, tab.favIconUrl);
    } else {
      await stopTracking();
    }
  } catch (error) {
    console.error("Clarity: Error checking active tab", error);
  }
}
