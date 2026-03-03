import { db } from "@/db/database";
import { getTodayDate } from "@/db/utils";
import type { WebsiteTimer } from "@/types";
import { updateBlockingRules } from "./blocking";
import { checkAndSendNotifications } from "./notifications";
import { loadTimerCache } from "./timers";

/**
 * Handle messages from popup
 */
export async function handleMessage(
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
        const { startDate, endDate } = message.payload as {
          startDate: string;
          endDate: string;
        };
        const activities = await db.getDailyActivitiesInRange(startDate, endDate);
        sendResponse({ activities });
        break;
      }

      case "GET_EARLIEST_DATE": {
        const date = await db.getEarliestActivityDate();
        sendResponse({ date });
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
        await loadTimerCache();
        await updateBlockingRules();
        sendResponse({ success: true });
        break;
      }

      case "DELETE_TIMER": {
        const { domain } = message.payload as { domain: string };
        await db.deleteTimer(domain);
        await loadTimerCache();
        await updateBlockingRules();
        sendResponse({ success: true });
        break;
      }

      case "ADD_BLOCKED_URL": {
        const { urlPattern } = message.payload as { urlPattern: string };
        await db.addBlockedWebsite(urlPattern);
        await updateBlockingRules();
        sendResponse({ success: true });
        break;
      }

      case "REMOVE_BLOCKED_URL": {
        const { id } = message.payload as { id: number };
        await db.deleteBlockedWebsite(id);
        await updateBlockingRules();
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

        const payload = message.payload as {
          reminderEnabled?: boolean;
        };
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
