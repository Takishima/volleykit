/**
 * Auth log buffer for debugging iOS PWA login issues.
 *
 * This buffer stores auth-related log entries even in production builds,
 * allowing them to be displayed in the debug panel when ?debug is present.
 *
 * Usage:
 * - Import authLogger instead of logger in auth-related files
 * - Logs are stored in a circular buffer (last N entries)
 * - Access via getAuthLogs() or subscribe with onAuthLogsChange()
 */

/** Maximum number of log entries to keep in the buffer */
const MAX_LOG_ENTRIES = 50;

/** Log entry with timestamp and level */
export interface AuthLogEntry {
  timestamp: number;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  data?: unknown;
}

/** Circular buffer for log entries */
const logBuffer: AuthLogEntry[] = [];

/** Cached snapshot for useSyncExternalStore - only update when buffer changes */
let cachedSnapshot: AuthLogEntry[] = [];

/** Subscribers for log changes */
type LogChangeCallback = () => void;
const subscribers = new Set<LogChangeCallback>();

/**
 * Adds a log entry to the buffer and notifies subscribers.
 */
function addLogEntry(
  level: AuthLogEntry["level"],
  message: string,
  data?: unknown,
): void {
  const entry: AuthLogEntry = {
    timestamp: Date.now(),
    level,
    message,
    data,
  };

  logBuffer.push(entry);

  // Keep buffer at max size (circular buffer)
  if (logBuffer.length > MAX_LOG_ENTRIES) {
    logBuffer.shift();
  }

  // Update cached snapshot (new array reference to trigger re-render)
  cachedSnapshot = [...logBuffer];

  // Notify all subscribers
  for (const callback of subscribers) {
    callback();
  }
}

/**
 * Get all current log entries (newest last).
 * Returns a stable reference (same array) until logs change.
 */
export function getAuthLogs(): AuthLogEntry[] {
  return cachedSnapshot;
}

/**
 * Clear all log entries.
 */
export function clearAuthLogs(): void {
  logBuffer.length = 0;
  cachedSnapshot = [];
  for (const callback of subscribers) {
    callback();
  }
}

/**
 * Subscribe to log changes.
 * Returns an unsubscribe function.
 */
export function onAuthLogsChange(callback: LogChangeCallback): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

/**
 * Auth-specific logger that stores entries in the buffer.
 * Also outputs to console in development mode.
 */
export const authLogger = {
  debug: (message: string, data?: unknown): void => {
    addLogEntry("debug", message, data);
    if (import.meta.env.DEV) {
      console.log("[Auth]", message, data ?? "");
    }
  },

  info: (message: string, data?: unknown): void => {
    addLogEntry("info", message, data);
    if (import.meta.env.DEV) {
      console.info("[Auth]", message, data ?? "");
    }
  },

  warn: (message: string, data?: unknown): void => {
    addLogEntry("warn", message, data);
    if (import.meta.env.DEV) {
      console.warn("[Auth]", message, data ?? "");
    }
  },

  error: (message: string, data?: unknown): void => {
    addLogEntry("error", message, data);
    if (import.meta.env.DEV) {
      console.error("[Auth]", message, data ?? "");
    }
  },
};
