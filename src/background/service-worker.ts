import { db } from "@/db/database";
import { updateBlockingRules } from "./modules/blocking";
import { handleMessage } from "./modules/message-handler";
import {
  checkAndSendNotifications,
  checkAndSendTargetNotification,
  resetNotificationTracker,
} from "./modules/notifications";
import {
  loadIntervalAccumulators,
  loadTimerCache,
  resetAllIntervalAccumulators,
} from "./modules/timers";
import {
  checkActiveTab,
  getCurrentSession,
  saveCurrentSession,
  setIdleState,
  startTracking,
  stopTracking,
} from "./modules/tracking";

// ─── Constants ───────────────────────────────────────────────────────

const IDLE_THRESHOLD = 15 * 60; // 15 minutes in seconds

// ─── Initialisation ──────────────────────────────────────────────────

async function initialize() {
  console.log("Clarity: Service worker initialized");
  await db.init();
  await loadTimerCache();
  await loadIntervalAccumulators();
  await updateBlockingRules();

  // Periodic alarms
  chrome.alarms.create("saveActivity", { periodInMinutes: 1 / 6 });
  chrome.alarms.create("updateRules", { periodInMinutes: 1 });
  chrome.alarms.create("checkNotifications", { periodInMinutes: 0.5 });
  chrome.alarms.create("midnightReset", {
    when: getNextMidnight(),
    periodInMinutes: 24 * 60,
  });

  chrome.idle.setDetectionInterval(IDLE_THRESHOLD);
  checkActiveTab();

  // Handle missed midnight (laptop off at midnight)
  await checkAndSendTargetNotification();
}

function getNextMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime();
}

// ─── Event Listeners ─────────────────────────────────────────────────

// Tab activated
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

// Tab updated
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active && tab.url) {
    await startTracking(tabId, tab.url, tab.favIconUrl);
  }
});

// Tab removed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (getCurrentSession().tabId === tabId) {
    await stopTracking();
  }
});

// Window focus changed
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await stopTracking();
  } else {
    await checkActiveTab();
  }
});

// Idle state
chrome.idle.onStateChanged.addListener(async (newState) => {
  console.log(`Clarity: Idle state changed to ${newState}`);

  if (newState === "idle" || newState === "locked") {
    setIdleState(true);
    console.log("Clarity: User is idle/locked, pausing tracking");
    await saveCurrentSession();

    const session = getCurrentSession();
    if (session.domain && session.startTime) {
      // Note: we can't mutate the session directly from here,
      // but saveCurrentSession already resets startTime
    }
  } else if (newState === "active") {
    setIdleState(false);
    console.log("Clarity: User is active, resuming tracking");
    await checkActiveTab();
  }
});

// Alarms
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
    await saveCurrentSession();
    await resetNotificationTracker();
    resetAllIntervalAccumulators();
    await updateBlockingRules();
    await checkAndSendTargetNotification();
  }
});

// Messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message, sendResponse);
  return true;
});

// ─── Bootstrap ───────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  initialize();
  chrome.alarms.create("resetNotifications", {
    when: getNextMidnight(),
    periodInMinutes: 24 * 60,
  });
});

initialize();

chrome.alarms.create("resetNotifications", {
  when: getNextMidnight(),
  periodInMinutes: 24 * 60,
});
