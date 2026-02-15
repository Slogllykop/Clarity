// Database types
export interface DailyActivity {
  id?: number;
  date: string; // YYYY-MM-DD format
  totalTime: number; // in seconds
  websiteCount: number;
}

export interface WebsiteActivity {
  id?: number;
  date: string; // YYYY-MM-DD format
  domain: string;
  faviconUrl: string | null;
  timeSpent: number; // in seconds
  visitCount: number;
  lastVisit: number; // timestamp
}

export interface WebsiteTimer {
  id?: number;
  domain: string;
  timeLimit: number; // in seconds
  enabled: boolean;
  timeSpentToday?: number; // runtime tracking
}

export interface BlockedWebsite {
  id?: number;
  urlPattern: string;
  dateAdded: string; // ISO format
}

export interface Settings {
  id?: number;
  passwordHash?: string;
  securityQuestion?: string;
  securityAnswerHash?: string;
  reminderEnabled: boolean;
  reminderThresholds?: number[]; // in seconds [1800, 3600, 7200] = 30min, 1hr, 2hr
}

// UI types
export interface WebsiteStats {
  domain: string;
  faviconUrl: string | null;
  timeSpent: number;
  visitCount: number;
  percentage?: number;
}

export interface WeeklyStats {
  day: string; // Sun, Mon, Tue, etc.
  date: string; // YYYY-MM-DD
  totalTime: number; // in seconds
}

// Message types for background communication
export type MessageType =
  | "GET_TODAY_STATS"
  | "GET_WEEKLY_STATS"
  | "GET_WEBSITE_LIST"
  | "UPDATE_TIMER"
  | "ADD_BLOCKED_URL"
  | "REMOVE_BLOCKED_URL"
  | "UPDATE_SETTINGS";

export interface ChromeMessage {
  type: MessageType;
  payload?: unknown;
}
