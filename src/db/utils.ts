import type { WebsiteActivity, WeeklyStats } from "@/types";

/**
 * Format seconds to human readable time
 * @param compact - If true, formats as "xh xm" or "xm" (no seconds)
 */
export function formatTime(seconds: number, compact = false): string {
  if (compact) {
    // Compact format: xh xm or just xm (no seconds)
    if (seconds < 60) {
      return "0m";
    }
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes}m`;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  // Default format: includes seconds
  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

/**
 * Get date string for a specific number of days ago
 */
export function getDateDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split("T")[0];
}

/**
 * Get the week range (Sun-Sat) for a given date
 */
export function getWeekRange(date: string): { start: string; end: string } {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 6 = Saturday

  // Get Sunday of the week
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - day);

  // Get Saturday of the week
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);

  return {
    start: sunday.toISOString().split("T")[0],
    end: saturday.toISOString().split("T")[0],
  };
}

/**
 * Get day name from date string
 */
export function getDayName(date: string): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const d = new Date(date);
  return days[d.getDay()];
}

/**
 * Get short day name from date string
 */
export function getShortDayName(date: string): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const d = new Date(date);
  return days[d.getDay()];
}

/**
 * Format date to display format (e.g., "Jan 15, 2024")
 */
export function formatDate(date: string): string {
  const d = new Date(date);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/**
 * Get relative day label (Today, Yesterday, or day name)
 */
export function getRelativeDayLabel(date: string): string {
  const today = getTodayDate();
  const yesterday = getDateDaysAgo(1);

  if (date === today) return "Today";
  if (date === yesterday) return "Yesterday";
  return getDayName(date);
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Check if URL is a chrome/edge/browser internal page
 */
export function isInternalPage(url: string): boolean {
  const internalPatterns = [
    "chrome://",
    "chrome-extension://",
    "edge://",
    "about:",
    "chrome.google.com/webstore",
  ];
  return internalPatterns.some((pattern) => url.startsWith(pattern));
}

/**
 * Check if URL is a new tab page
 */
export function isNewTabPage(url: string): boolean {
  const newTabPatterns = ["chrome://newtab", "edge://newtab", "about:newtab", "about:blank"];
  return newTabPatterns.some((pattern) => url.startsWith(pattern)) || url === "";
}

/**
 * Group websites by "Others" category
 * Shows top N websites individually, groups the rest
 */
export function groupWebsitesByOthers(
  websites: WebsiteActivity[],
  topCount = 5,
): WebsiteActivity[] {
  if (websites.length <= topCount) {
    return websites;
  }

  const sorted = [...websites].sort((a, b) => b.timeSpent - a.timeSpent);
  const top = sorted.slice(0, topCount);
  const others = sorted.slice(topCount);

  const othersTotal: WebsiteActivity = {
    domain: "Others",
    faviconUrl: null,
    date: websites[0]?.date || getTodayDate(),
    timeSpent: others.reduce((sum, w) => sum + w.timeSpent, 0),
    visitCount: others.reduce((sum, w) => sum + w.visitCount, 0),
    lastVisit: Date.now(),
  };

  return [...top, othersTotal];
}

/**
 * Calculate percentage for each website
 */
export function calculatePercentages(
  websites: WebsiteActivity[],
): Array<WebsiteActivity & { percentage: number }> {
  const total = websites.reduce((sum, w) => sum + w.timeSpent, 0);

  return websites.map((website) => ({
    ...website,
    percentage: total > 0 ? (website.timeSpent / total) * 100 : 0,
  }));
}

/**
 * Generate weekly stats array with all 7 days
 */
export function generateWeeklyStatsArray(
  weekRange: { start: string; end: string },
  dailyActivities: Array<{ date: string; totalTime: number }>,
): WeeklyStats[] {
  const stats: WeeklyStats[] = [];
  const current = new Date(weekRange.start);
  const end = new Date(weekRange.end);

  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0];
    const activity = dailyActivities.find((a) => a.date === dateStr);

    stats.push({
      day: getShortDayName(dateStr),
      date: dateStr,
      totalTime: activity?.totalTime || 0,
    });

    current.setDate(current.getDate() + 1);
  }

  return stats;
}

/**
 * Encrypt password using Web Crypto API
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}
