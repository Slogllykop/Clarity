import { db } from "@/db/database";
import { extractDomain, getTodayDate, isInternalPage, isNewTabPage } from "@/db/utils";
import { log } from "@/lib/logger";
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

/**
 * Lightweight snapshot of the session we were tracking before the window
 * lost focus. When the window regains focus we attempt to resume tracking
 * the same tab so there is no gap.
 */
interface PendingSession {
  tabId: number;
  domain: string;
  faviconUrl: string | null;
}

let currentSession: SessionState = {
  tabId: null,
  domain: null,
  startTime: null,
  faviconUrl: null,
  isNewVisit: false,
  sessionDate: null,
};

let pendingSession: PendingSession | null = null;

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
    log.info(`Day changed from ${currentSession.sessionDate} to ${today}, resetting session`);

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

        log.info(
          `Saved ${timeUntilMidnight}s for ${domain} to previous day ${currentSession.sessionDate}`,
        );
      } catch (error) {
        log.error("Error saving previous day session", error);
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

    log.info(`Saved ${timeSpent}s for ${domain}`);
  } catch (error) {
    log.error("Error saving session", error);
  }

  currentSession.startTime = Date.now();
}

/**
 * Start tracking a new tab
 */
export async function startTracking(tabId: number, url: string, faviconUrl?: string) {
  if (isUserIdle) {
    log.debug("Ignoring startTracking while user is idle");
    return;
  }

  if (!isWindowFocused) {
    log.debug("Ignoring startTracking while window is unfocused");
    return;
  }

  await saveCurrentSession();

  if (isInternalPage(url) || isNewTabPage(url)) {
    stopTracking();
    return;
  }

  const domain = extractDomain(url);

  // Clear any pending session since we're now actively tracking
  pendingSession = null;

  currentSession = {
    tabId,
    domain,
    startTime: Date.now(),
    faviconUrl: faviconUrl || null,
    isNewVisit: true,
    sessionDate: getTodayDate(),
  };

  log.info(`Started tracking ${domain}`);
}

/**
 * Stop tracking current session.
 *
 * When called due to window unfocus, stashes the session info in
 * `pendingSession` so that `checkActiveTab` can seamlessly resume
 * tracking when the window regains focus.
 */
export async function stopTracking() {
  // Stash session context before clearing so we can resume later
  if (currentSession.tabId && currentSession.domain) {
    pendingSession = {
      tabId: currentSession.tabId,
      domain: currentSession.domain,
      faviconUrl: currentSession.faviconUrl,
    };
  }

  await saveCurrentSession();
  currentSession = {
    tabId: null,
    domain: null,
    startTime: null,
    faviconUrl: null,
    isNewVisit: false,
    sessionDate: null,
  };
  log.info("Stopped tracking");
}

/**
 * Check and start tracking the currently-active tab.
 *
 * This function trusts the `isWindowFocused` flag that is maintained by
 * `setWindowFocused()` (driven by `chrome.windows.onFocusChanged` and
 * the focus heartbeat alarm). When a `pendingSession` exists from a
 * previous unfocus event, it attempts to resume tracking the same tab
 * for a seamless experience.
 */
export async function checkActiveTab() {
  if (!isWindowFocused) {
    log.debug("Window not focused, skipping checkActiveTab");
    return;
  }

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab?.id && tab.url) {
      await startTracking(tab.id, tab.url, tab.favIconUrl);
    } else if (pendingSession) {
      // Tab query returned nothing useful but we have a pending session;
      // try to recover by looking up the pending tab directly.
      try {
        const pendingTab = await chrome.tabs.get(pendingSession.tabId);
        if (pendingTab?.url) {
          await startTracking(pendingSession.tabId, pendingTab.url, pendingTab.favIconUrl);
        } else {
          pendingSession = null;
          await stopTracking();
        }
      } catch {
        // Pending tab no longer exists
        pendingSession = null;
        await stopTracking();
      }
    } else {
      await stopTracking();
    }
  } catch (error) {
    log.error("Error checking active tab", error);
  }
}

// ─── Focus Heartbeat ─────────────────────────────────────────────────

/**
 * Heartbeat called by a periodic alarm to catch focus/unfocus transitions
 * that `chrome.windows.onFocusChanged` misses (a known Chromium bug when
 * alt-tabbing to non-Chrome applications or other browser profiles).
 *
 * Uses `chrome.windows.getLastFocused()` which reliably reports
 * `focused: false` even when Chrome has a window but another OS-level
 * app has focus.
 */
export async function checkFocusState() {
  try {
    const lastFocused = await chrome.windows.getLastFocused({
      populate: false,
    });
    const actuallyFocused = !!lastFocused?.focused;

    if (isWindowFocused && !actuallyFocused) {
      // The window lost focus but onFocusChanged didn't fire
      log.warn("Heartbeat detected window unfocus - stopping tracking");
      setWindowFocused(false);
      await stopTracking();
    } else if (!isWindowFocused && actuallyFocused) {
      // The window regained focus but onFocusChanged didn't fire
      log.warn("Heartbeat detected window re-focus - resuming tracking");
      setWindowFocused(true);
      await checkActiveTab();
    }
  } catch {
    // getLastFocused can fail if there are no windows at all
    if (isWindowFocused) {
      log.warn("Heartbeat: no windows found - marking as unfocused");
      setWindowFocused(false);
      await stopTracking();
    }
  }
}
