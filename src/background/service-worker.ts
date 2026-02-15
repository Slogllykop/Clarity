import { db } from "@/db/database";
import { extractDomain, getTodayDate, isInternalPage, isNewTabPage } from "@/db/utils";
import type { WebsiteActivity, WebsiteTimer } from "@/types";

// Track current active session
let currentSession: {
  tabId: number | null;
  domain: string | null;
  startTime: number | null;
  faviconUrl: string | null;
} = {
  tabId: null,
  domain: null,
  startTime: null,
  faviconUrl: null,
};

// Cache for timers to avoid frequent DB reads
let timerCache: Map<string, WebsiteTimer> = new Map();

/**
 * Initialize the service worker
 */
async function initialize() {
  console.log("Clarity: Service worker initialized");
  await db.init();
  await loadTimerCache();

  // Set up periodic save alarm (every 10 seconds)
  chrome.alarms.create("saveActivity", { periodInMinutes: 1 / 6 });

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
 * Save current session to database
 */
async function saveCurrentSession() {
  if (!currentSession.domain || !currentSession.startTime) {
    return;
  }

  const timeSpent = Math.floor((Date.now() - currentSession.startTime) / 1000);
  if (timeSpent < 1) return; // Don't save sessions less than 1 second

  const today = getTodayDate();
  const domain = currentSession.domain;

  try {
    // Get or create website activity
    const existing = await db.getWebsiteActivity(today, domain);
    const activity: WebsiteActivity = {
      date: today,
      domain,
      faviconUrl: currentSession.faviconUrl || existing?.faviconUrl || null,
      timeSpent: (existing?.timeSpent || 0) + timeSpent,
      visitCount: (existing?.visitCount || 0) + 1,
      lastVisit: Date.now(),
    };

    await db.saveWebsiteActivity(activity);

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
    // Block the website
    console.log(`Clarity: Timer limit exceeded for ${domain}`);
    // We'll handle blocking via declarativeNetRequest
    // For now, just log it
  }
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

  // Check if domain is blocked
  const blocked = await isBlockedDomain(domain);
  if (blocked) {
    // Redirect to blocked page
    chrome.tabs.update(tabId, {
      url: chrome.runtime.getURL(`blocked.html?reason=parental&domain=${domain}`),
    });
    return;
  }

  // Check if timer limit is exceeded
  const timer = timerCache.get(domain);
  if (timer?.enabled) {
    const today = getTodayDate();
    const activity = await db.getWebsiteActivity(today, domain);
    if (activity && activity.timeSpent >= timer.timeLimit) {
      // Redirect to blocked page
      chrome.tabs.update(tabId, {
        url: chrome.runtime.getURL(
          `blocked.html?reason=timer&domain=${domain}&limit=${timer.timeLimit}`,
        ),
      });
      return;
    }
  }

  currentSession = {
    tabId,
    domain,
    startTime: Date.now(),
    faviconUrl: faviconUrl || null,
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
  };
  console.log("Clarity: Stopped tracking");
}

/**
 * Check if domain is blocked
 */
async function isBlockedDomain(domain: string): Promise<boolean> {
  const blocked = await db.getAllBlockedWebsites();
  return blocked.some((b) => {
    const pattern = b.urlPattern.toLowerCase();
    const domainLower = domain.toLowerCase();
    return domainLower.includes(pattern) || pattern.includes(domainLower);
  });
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

// Alarm listener for periodic saves
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "saveActivity") {
    await saveCurrentSession();
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
        sendResponse({ success: true });
        break;
      }

      case "DELETE_TIMER": {
        const { domain } = message.payload as { domain: string };
        await db.deleteTimer(domain);
        await loadTimerCache(); // Refresh cache
        sendResponse({ success: true });
        break;
      }

      case "ADD_BLOCKED_URL": {
        const { urlPattern } = message.payload as { urlPattern: string };
        await db.addBlockedWebsite(urlPattern);
        sendResponse({ success: true });
        break;
      }

      case "REMOVE_BLOCKED_URL": {
        const { id } = message.payload as { id: number };
        await db.deleteBlockedWebsite(id);
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

// Initialize on install/update
chrome.runtime.onInstalled.addListener(() => {
  initialize();
});

// Initialize immediately
initialize();
