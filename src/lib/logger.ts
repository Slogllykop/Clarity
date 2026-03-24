/**
 * Clarity Logger - Structured, color-coded console logging utility.
 *
 * Each message is prefixed with an ISO timestamp, log level, and the
 * [Clarity] namespace. Colours are applied via the %c directive so
 * output is easy to scan in both the service-worker DevTools console
 * and the popup console.
 *
 * Usage:
 *   import { log } from "@/lib/logger";
 *   log.info("Service worker initialized");
 *   log.error("Failed to save session", error);
 */

// ─── Types ───────────────────────────────────────────────────────────

type LogLevel = "debug" | "info" | "warn" | "error";

interface LevelConfig {
  badge: string;
  color: string;
  method: "debug" | "log" | "warn" | "error";
}

// ─── Level palette ───────────────────────────────────────────────────

const LEVELS: Record<LogLevel, LevelConfig> = {
  debug: {
    badge: "DEBUG",
    color: "#9e9e9e",
    method: "debug",
  },
  info: {
    badge: "INFO",
    color: "#1e88e5",
    method: "log",
  },
  warn: {
    badge: "WARN",
    color: "#f57c00",
    method: "warn",
  },
  error: {
    badge: "ERROR",
    color: "#e53935",
    method: "error",
  },
};

// ─── Formatter ───────────────────────────────────────────────────────

function formatTimestamp(): string {
  return new Date().toTimeString().split(" ")[0]; // HH:mm:ss
}

function emit(level: LogLevel, message: string, ...extra: unknown[]): void {
  const cfg = LEVELS[level];
  const timestamp = formatTimestamp();

  // The prefix contains 4 %c segments: Level, Timestamp, [Clarity], and finally the Message.
  const prefix = `%c${cfg.badge}%c ${timestamp} %c[Clarity] %c`;

  const styles = [
    // Level Badge: Uppercase, colored text, no background.
    `color:${cfg.color};font-weight:bold`,
    // Timestamp: Subtle gray.
    "color:#888;font-weight:normal",
    // [Clarity] Namespace: Blue color at all times (#1e88e5).
    "color:#1e88e5;font-weight:bold",
    // Reset/Message Body: Normal appearance (inherited/white).
    "color:inherit;font-weight:normal",
  ];

  const consoleFn = console[cfg.method] ?? console.log;

  if (extra.length > 0) {
    consoleFn(`${prefix}${message}`, ...styles, ...extra);
  } else {
    consoleFn(`${prefix}${message}`, ...styles);
  }
}

// ─── Public API ──────────────────────────────────────────────────────

export const log = {
  debug(message: string, ...extra: unknown[]) {
    emit("debug", message, ...extra);
  },
  info(message: string, ...extra: unknown[]) {
    emit("info", message, ...extra);
  },
  warn(message: string, ...extra: unknown[]) {
    emit("warn", message, ...extra);
  },
  error(message: string, ...extra: unknown[]) {
    emit("error", message, ...extra);
  },
} as const;
