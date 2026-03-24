import { db } from "@/db/database";
import { getTodayDate } from "@/db/utils";
import { log } from "@/lib/logger";

// ─── Notification State ──────────────────────────────────────────────

interface NotificationState {
  date: string;
  sent: Record<string, number[]>;
}

const NOTIFICATION_STATE_KEY = "clarity_notification_state";
const TARGET_NOTIFICATION_KEY = "clarity_target_notification_state";

async function getNotificationState(): Promise<NotificationState> {
  const result = await chrome.storage.local.get(NOTIFICATION_STATE_KEY);
  const state = result[NOTIFICATION_STATE_KEY] as NotificationState | undefined;
  const today = getTodayDate();

  if (!state || state.date !== today) {
    const newState: NotificationState = { date: today, sent: {} };
    await saveNotificationState(newState);
    return newState;
  }

  return state;
}

async function saveNotificationState(state: NotificationState): Promise<void> {
  await chrome.storage.local.set({ [NOTIFICATION_STATE_KEY]: state });
}

// ─── Screen Time Notifications ───────────────────────────────────────

/**
 * Check and send screen time notifications
 */
export async function checkAndSendNotifications() {
  try {
    const settings = await db.getSettings();
    if (!settings?.reminderEnabled || !settings?.reminderThresholds) {
      return;
    }

    const today = getTodayDate();
    const activities = await db.getWebsiteActivitiesForDate(today);
    const thresholds = settings.reminderThresholds;

    const notificationState = await getNotificationState();
    let stateChanged = false;

    for (const activity of activities) {
      const domain = activity.domain;
      const timeSpent = activity.timeSpent;

      const sentThresholds = new Set(notificationState.sent[domain] || []);
      const crossedThresholds = thresholds.filter((t) => timeSpent >= t);
      const unsentCrossedThresholds = crossedThresholds.filter((t) => !sentThresholds.has(t));

      if (unsentCrossedThresholds.length > 0) {
        const highestUnsent = Math.max(...unsentCrossedThresholds);
        await sendScreenTimeNotification(domain, timeSpent, highestUnsent);

        const newSentList = Array.from(new Set([...sentThresholds, ...crossedThresholds]));
        notificationState.sent[domain] = newSentList;
        stateChanged = true;
      }
    }

    if (stateChanged) {
      await saveNotificationState(notificationState);
    }
  } catch (error) {
    log.error("Error checking notifications", error);
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

    log.info(`Sent notification for ${domain} at ${timeString}`);
  } catch (error) {
    log.error("Error sending notification", error);
  }
}

/**
 * Reset notification tracker daily
 */
export async function resetNotificationTracker() {
  const today = getTodayDate();
  const newState: NotificationState = { date: today, sent: {} };
  await saveNotificationState(newState);
  log.info("Reset notification tracker for new day");
}

// ─── Target Notifications ────────────────────────────────────────────

/**
 * Check and send daily target notification.
 * Called at midnight and on service-worker startup.
 */
export async function checkAndSendTargetNotification() {
  try {
    const settings = await db.getSettings();
    if (!settings?.targetSettings?.enabled || !settings.targetSettings.targetHours) {
      return;
    }

    const today = getTodayDate();

    const result = await chrome.storage.local.get(TARGET_NOTIFICATION_KEY);
    const targetState = result[TARGET_NOTIFICATION_KEY] as { lastSentDate: string } | undefined;

    if (targetState?.lastSentDate === today) {
      return;
    }

    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

    const dailyActivity = await db.getDailyActivity(yesterdayDate);
    const totalSeconds = dailyActivity?.totalTime || 0;
    const totalHours = totalSeconds / 3600;
    const targetHours = settings.targetSettings.targetHours;

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const timeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    const isUnderTarget = totalHours <= targetHours;
    const title = isUnderTarget ? "Clarity - Target Met! ✅" : "Clarity - Over Target ⚠️";
    const message = isUnderTarget
      ? `Great job! Yesterday you used ${timeString} - under your ${targetHours}h target.`
      : `Yesterday you used ${timeString} - over your ${targetHours}h target. Try to reduce today!`;

    await chrome.notifications.create(`clarity-target-${yesterdayDate}`, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
      title,
      message,
      priority: 2,
      requireInteraction: false,
    });

    await chrome.storage.local.set({
      [TARGET_NOTIFICATION_KEY]: { lastSentDate: today },
    });

    log.info(`Sent target notification for ${yesterdayDate}: ${message}`);
  } catch (error) {
    log.error("Error checking target notification", error);
  }
}
