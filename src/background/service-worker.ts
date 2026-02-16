import { db } from "@/db/database";
import { extractDomain, getTodayDate, isInternalPage, isNewTabPage } from "@/db/utils";
import type { WebsiteActivity, WebsiteTimer } from "@/types";

// Track current active session
let currentSession: {
  tabId: number | null;
  domain: string | null;
  startTime: number | null;
  faviconUrl: string | null;
  isNewVisit: boolean; // Track if this is a new visit to increment counter
  sessionDate: string | null; // Track which date this session belongs to
} = {
  tabId: null,
  domain: null,
  startTime: null,
  faviconUrl: null,
  isNewVisit: false,
  sessionDate: null,
};

// Track idle state
let isUserIdle = false;
const IDLE_THRESHOLD = 15 * 60; // 15 minutes in seconds

// Cache for timers to avoid frequent DB reads
let timerCache: Map<string, WebsiteTimer> = new Map();

// Track notifications sent per domain to avoid duplicates
const notificationTracker: Map<string, Set<number>> = new Map(); // domain -> Set of threshold values already notified

/**
 * Initialize the service worker
 */
async function initialize() {
  console.log("Clarity: Service worker initialized");
  await db.init();
  await loadTimerCache();
  await updateBlockingRules();

  // Set up periodic save alarm (every 10 seconds)
  chrome.alarms.create("saveActivity", { periodInMinutes: 1 / 6 });

  // Set up periodic rule update alarm (every minute to check timer limits)
  chrome.alarms.create("updateRules", { periodInMinutes: 1 });

  // Set up notification check alarm (every 30 seconds)
  chrome.alarms.create("checkNotifications", { periodInMinutes: 0.5 });

  // Set up midnight reset alarm
  chrome.alarms.create("midnightReset", {
    when: getNextMidnight(),
    periodInMinutes: 24 * 60, // Daily
  });

  // Set idle detection interval
  chrome.idle.setDetectionInterval(IDLE_THRESHOLD);

  // Check for active tab on startup
  checkActiveTab();
}

/**
 * Load all timers into cache
 */
async function loadTimerCache() {
  const timers = await db.getAllTimers();
  timerCache = new Map(timers.map((t) => [t.domain, t]));
}

/**
 * Update declarativeNetRequest rules for blocked websites and timers
 */
async function updateBlockingRules() {
  try {
    // Get blocked websites
    const blockedWebsites = await db.getAllBlockedWebsites();
    const timers = await db.getAllTimers();

    // Get today's activities to check timer limits
    const today = getTodayDate();
    const activities = await db.getWebsiteActivitiesForDate(today);

    const rules: chrome.declarativeNetRequest.Rule[] = [];
    let ruleId = 1;

    // Add rules for blocked websites (parental controls)
    for (const blocked of blockedWebsites) {
      const pattern = blocked.urlPattern.toLowerCase();
      rules.push({
        id: ruleId++,
        priority: 1,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
          redirect: {
            url: chrome.runtime.getURL(
              `blocked.html?reason=parental&domain=${encodeURIComponent(pattern)}`,
            ),
          },
        },
        condition: {
          urlFilter: `*${pattern}*`,
          resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
        },
      });
    }

    // Add rules for timer-exceeded websites
    for (const timer of timers) {
      if (!timer.enabled) continue;

      const activity = activities.find((a) => a.domain === timer.domain);
      if (activity && activity.timeSpent >= timer.timeLimit) {
        rules.push({
          id: ruleId++,
          priority: 1,
          action: {
            type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
            redirect: {
              url: chrome.runtime.getURL(
                `blocked.html?reason=timer&domain=${encodeURIComponent(timer.domain)}&limit=${timer.timeLimit}`,
              ),
            },
          },
          condition: {
            urlFilter: `*${timer.domain}*`,
            resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
          },
        });
      }
    }

    // Remove all existing dynamic rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map((rule) => rule.id);

    // Update rules
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRuleIds,
      addRules: rules,
    });

    console.log(`Clarity: Updated ${rules.length} blocking rules`);
  } catch (error) {
    console.error("Clarity: Error updating blocking rules", error);
  }
}

/**
 * Save current session to database
 */
async function saveCurrentSession() {
  // Don't save if user is idle
  if (isUserIdle) {
    console.log("Clarity: User is idle, skipping save");
    return;
  }

  if (!currentSession.domain || !currentSession.startTime) {
    return;
  }

  const today = getTodayDate();

  // Check if the day has changed since the session started
  if (currentSession.sessionDate && currentSession.sessionDate !== today) {
    console.log(
      `Clarity: Day changed from ${currentSession.sessionDate} to ${today}, resetting session`,
    );

    // Calculate midnight timestamp for the transition
    const todayMidnight = new Date(today);
    todayMidnight.setHours(0, 0, 0, 0);
    const midnightTime = todayMidnight.getTime();

    // Save time accumulated up to midnight for the previous day
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
          lastVisit: midnightTime - 1, // Just before midnight
        };
        await db.saveWebsiteActivity(activity);

        // Update daily total for previous day
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

    // Reset session for the new day - start from midnight
    currentSession.startTime = midnightTime;
    currentSession.sessionDate = today;
    currentSession.isNewVisit = true; // New visit for the new day

    // Reset notification tracker for new day
    await resetNotificationTracker();

    // Update blocking rules (timers reset daily)
    await updateBlockingRules();
  }

  const timeSpent = Math.floor((Date.now() - currentSession.startTime) / 1000);
  if (timeSpent < 1) return; // Don't save sessions less than 1 second

  const domain = currentSession.domain;

  try {
    // Get or create website activity
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

    // Reset the new visit flag after first save
    currentSession.isNewVisit = false;

    // Update daily total
    const dailyActivities = await db.getWebsiteActivitiesForDate(today);
    const totalTime = dailyActivities.reduce((sum, a) => sum + a.timeSpent, 0);
    const websiteCount = dailyActivities.length;

    await db.saveDailyActivity({
      date: today,
      totalTime,
      websiteCount,
    });

    // Check timer limits
    await checkTimerLimit(domain, activity.timeSpent);

    console.log(`Clarity: Saved ${timeSpent}s for ${domain}`);
  } catch (error) {
    console.error("Clarity: Error saving session", error);
  }

  // Reset start time for continuing session
  currentSession.startTime = Date.now();
}

/**
 * Check if timer limit is exceeded for a domain
 */
async function checkTimerLimit(domain: string, timeSpent: number) {
  const timer = timerCache.get(domain);
  if (!timer || !timer.enabled) return;

  if (timeSpent >= timer.timeLimit) {
    // Block the website by updating rules
    console.log(`Clarity: Timer limit exceeded for ${domain}`);
    await updateBlockingRules();

    // Close the current tab if it's the domain that exceeded the limit
    if (currentSession.domain === domain && currentSession.tabId) {
      try {
        const tab = await chrome.tabs.get(currentSession.tabId);
        if (tab?.url && extractDomain(tab.url) === domain) {
          // Reload the tab to trigger the block
          await chrome.tabs.reload(currentSession.tabId);
        }
      } catch (error) {
        console.error("Clarity: Error reloading tab after timer exceeded", error);
      }
    }
  }
}

/**
 * Check and send screen time notifications
 */
async function checkAndSendNotifications() {
  try {
    // Check if reminders are enabled
    const settings = await db.getSettings();
    if (!settings?.reminderEnabled || !settings?.reminderThresholds) {
      return;
    }

    const today = getTodayDate();
    const activities = await db.getWebsiteActivitiesForDate(today);
    const thresholds = settings.reminderThresholds; // [1800, 3600, 7200] = [30min, 1hr, 2hr]

    // Check each website activity
    for (const activity of activities) {
      const domain = activity.domain;
      const timeSpent = activity.timeSpent;

      // Get or create notification tracker for this domain
      if (!notificationTracker.has(domain)) {
        notificationTracker.set(domain, new Set());
      }
      const sentThresholds = notificationTracker.get(domain)!;

      // Check each threshold
      for (const threshold of thresholds) {
        // If time spent exceeds threshold and we haven't notified yet
        if (timeSpent >= threshold && !sentThresholds.has(threshold)) {
          await sendScreenTimeNotification(domain, timeSpent, threshold);
          sentThresholds.add(threshold);
        }
      }
    }
  } catch (error) {
    console.error("Clarity: Error checking notifications", error);
  }
}

/**
 * Send a screen time notification
 */
async function sendScreenTimeNotification(domain: string, timeSpent: number, threshold: number) {
  try {
    const hours = Math.floor(timeSpent / 3600);
    const minutes = Math.floor((timeSpent % 3600) / 60);
    const timeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    const thresholdMinutes = threshold / 60;
    const thresholdString =
      thresholdMinutes >= 60 ? `${Math.floor(thresholdMinutes / 60)}h` : `${thresholdMinutes}m`;

    await chrome.notifications.create(`clarity-reminder-${domain}-${threshold}`, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
      title: "Clarity - Screen Time Reminder",
      message: `You've spent ${timeString} on ${domain} today (${thresholdString} threshold reached)`,
      priority: 1,
      requireInteraction: false,
    });

    console.log(`Clarity: Sent notification for ${domain} at ${timeString}`);
  } catch (error) {
    console.error("Clarity: Error sending notification", error);
  }
}

/**
 * Reset notification tracker daily
 */
async function resetNotificationTracker() {
  notificationTracker.clear();
  console.log("Clarity: Reset notification tracker for new day");
}

/**
 * Start tracking a new tab
 */
async function startTracking(tabId: number, url: string, faviconUrl?: string) {
  // Save previous session first
  await saveCurrentSession();

  // Check if URL should be tracked
  if (isInternalPage(url) || isNewTabPage(url)) {
    stopTracking();
    return;
  }

  const domain = extractDomain(url);

  // Note: Blocking is now handled by declarativeNetRequest rules
  // No need to manually redirect here, as rules will intercept before page loads

  currentSession = {
    tabId,
    domain,
    startTime: Date.now(),
    faviconUrl: faviconUrl || null,
    isNewVisit: true, // Mark as new visit
    sessionDate: getTodayDate(), // Track which date this session belongs to
  };

  console.log(`Clarity: Started tracking ${domain}`);
}

/**
 * Stop tracking current session
 */
async function stopTracking() {
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
 * Check and start tracking active tab
 */
async function checkActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id && tab.url) {
      await startTracking(tab.id, tab.url, tab.favIconUrl);
    } else {
      await stopTracking();
    }
  } catch (error) {
    console.error("Clarity: Error checking active tab", error);
  }
}

// ==================== EVENT LISTENERS ====================

// Tab activated (switched to different tab)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      await startTracking(activeInfo.tabId, tab.url, tab.favIconUrl);
    }
  } catch (error) {
    console.error("Clarity: Error on tab activated", error);
  }
});

// Tab updated (URL changed or loaded)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only track when URL is complete and tab is active
  if (changeInfo.status === "complete" && tab.active && tab.url) {
    await startTracking(tabId, tab.url, tab.favIconUrl);
  }
});

// Tab removed (closed)
chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (currentSession.tabId === tabId) {
    await stopTracking();
  }
});

// Window focus changed
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // No window is focused
    await stopTracking();
  } else {
    // Window focused, check active tab
    await checkActiveTab();
  }
});

// Idle state changed (user idle, locked, or active)
chrome.idle.onStateChanged.addListener(async (newState) => {
  console.log(`Clarity: Idle state changed to ${newState}`);

  if (newState === "idle" || newState === "locked") {
    // User is idle or locked - pause tracking
    isUserIdle = true;
    console.log("Clarity: User is idle/locked, pausing tracking");

    // Save current session before pausing
    await saveCurrentSession();

    // Reset start time so we don't accumulate time while idle
    if (currentSession.domain && currentSession.startTime) {
      currentSession.startTime = Date.now();
    }
  } else if (newState === "active") {
    // User is active again - resume tracking
    isUserIdle = false;
    console.log("Clarity: User is active, resuming tracking");

    // Reset start time to now (don't count idle time)
    if (currentSession.domain) {
      currentSession.startTime = Date.now();
    }
  }
});

// Alarm listener for periodic saves and notifications
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "saveActivity") {
    await saveCurrentSession();
  } else if (alarm.name === "updateRules") {
    await updateBlockingRules();
  } else if (alarm.name === "checkNotifications") {
    await checkAndSendNotifications();
  } else if (alarm.name === "resetNotifications") {
    await resetNotificationTracker();
  } else if (alarm.name === "midnightReset") {
    console.log("Clarity: Midnight reset triggered");
    // Force save current session (will handle day change)
    await saveCurrentSession();
    // Reset notification tracker
    await resetNotificationTracker();
    // Update blocking rules (timers reset daily)
    await updateBlockingRules();
  }
});

// Message listener for communication with popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message, sendResponse);
  return true; // Keep channel open for async response
});

/**
 * Handle messages from popup
 */
async function handleMessage(
  message: { type: string; payload?: unknown },
  sendResponse: (response: unknown) => void,
) {
  try {
    switch (message.type) {
      case "GET_TODAY_STATS": {
        const today = getTodayDate();
        const daily = await db.getDailyActivity(today);
        const websites = await db.getWebsiteActivitiesForDate(today);
        sendResponse({ daily, websites });
        break;
      }

      case "GET_WEEKLY_STATS": {
        const { startDate, endDate } = message.payload as { startDate: string; endDate: string };
        const activities = await db.getDailyActivitiesInRange(startDate, endDate);
        sendResponse({ activities });
        break;
      }

      case "GET_WEBSITE_LIST": {
        const { date } = message.payload as { date: string };
        const websites = await db.getWebsiteActivitiesForDate(date);
        sendResponse({ websites });
        break;
      }

      case "UPDATE_TIMER": {
        const timer = message.payload as WebsiteTimer;
        await db.saveTimer(timer);
        await loadTimerCache(); // Refresh cache
        await updateBlockingRules(); // Update rules immediately
        sendResponse({ success: true });
        break;
      }

      case "DELETE_TIMER": {
        const { domain } = message.payload as { domain: string };
        await db.deleteTimer(domain);
        await loadTimerCache(); // Refresh cache
        await updateBlockingRules(); // Update rules immediately
        sendResponse({ success: true });
        break;
      }

      case "ADD_BLOCKED_URL": {
        const { urlPattern } = message.payload as { urlPattern: string };
        await db.addBlockedWebsite(urlPattern);
        await updateBlockingRules(); // Update rules immediately
        sendResponse({ success: true });
        break;
      }

      case "REMOVE_BLOCKED_URL": {
        const { id } = message.payload as { id: number };
        await db.deleteBlockedWebsite(id);
        await updateBlockingRules(); // Update rules immediately
        sendResponse({ success: true });
        break;
      }

      case "GET_SETTINGS": {
        const settings = await db.getSettings();
        sendResponse({ settings });
        break;
      }

      case "UPDATE_SETTINGS": {
        await db.saveSettings(message.payload as never);

        // If enabling reminders, check immediately
        const payload = message.payload as { reminderEnabled?: boolean };
        if (payload.reminderEnabled) {
          await checkAndSendNotifications();
        }

        sendResponse({ success: true });
        break;
      }

      case "GET_ALL_TIMERS": {
        const timers = await db.getAllTimers();
        sendResponse({ timers });
        break;
      }

      case "GET_BLOCKED_WEBSITES": {
        const blocked = await db.getAllBlockedWebsites();
        sendResponse({ blocked });
        break;
      }

      default:
        sendResponse({ error: "Unknown message type" });
    }
  } catch (error) {
    console.error("Clarity: Error handling message", error);
    sendResponse({ error: String(error) });
  }
}

/**
 * Get timestamp for next midnight
 */
function getNextMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime();
}

// Initialize on install/update
chrome.runtime.onInstalled.addListener(() => {
  initialize();

  // Reset notification tracker at midnight (new day)
  chrome.alarms.create("resetNotifications", {
    when: getNextMidnight(),
    periodInMinutes: 24 * 60, // Daily
  });
});

// Initialize immediately
initialize();

// Set up daily notification reset
chrome.alarms.create("resetNotifications", {
  when: getNextMidnight(),
  periodInMinutes: 24 * 60, // Daily
});
