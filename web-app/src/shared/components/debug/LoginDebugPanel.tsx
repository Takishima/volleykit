/**
 * Minimal debug panel for the login page.
 * Shows auth logs to help debug iOS PWA login issues.
 *
 * Usage: Add ?debug to the login page URL
 */
/* eslint-disable @typescript-eslint/no-magic-numbers -- Debug panel uses inline styles */
import { useState, useSyncExternalStore } from "react";
import {
  getAuthLogs,
  clearAuthLogs,
  onAuthLogsChange,
  type AuthLogEntry,
} from "@/shared/utils/auth-log-buffer";

/** Hook to subscribe to auth logs with useSyncExternalStore */
function useAuthLogs(): AuthLogEntry[] {
  return useSyncExternalStore(onAuthLogsChange, getAuthLogs, getAuthLogs);
}

/** Format timestamp as HH:MM:SS.mmm */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  const ms = date.getMilliseconds().toString().padStart(3, "0");
  return `${hours}:${minutes}:${seconds}.${ms}`;
}

/** Color for each log level */
const LOG_LEVEL_COLORS: Record<AuthLogEntry["level"], string> = {
  debug: "#888",
  info: "#00d4ff",
  warn: "#ffaa00",
  error: "#ff6b6b",
};

/** Format logs as text for copying */
function formatLogsForExport(logs: AuthLogEntry[]): string {
  const header = [
    `VolleyKit Auth Debug Logs`,
    `Version: ${__APP_VERSION__} (${__GIT_HASH__})`,
    `Exported: ${new Date().toISOString()}`,
    `Platform: ${navigator.userAgent}`,
    `PWA Mode: ${isPWAMode() ? "Yes" : "No"}`,
    `URL: ${window.location.href}`,
    "---",
  ].join("\n");

  const logLines = logs.map((entry) => {
    const time = formatTime(entry.timestamp);
    const level = `[${entry.level.toUpperCase()}]`;
    const dataStr =
      entry.data !== undefined
        ? `\n  ${typeof entry.data === "object" ? JSON.stringify(entry.data, null, 2).replace(/\n/g, "\n  ") : String(entry.data)}`
        : "";
    return `${time} ${level} ${entry.message}${dataStr}`;
  });

  return `${header}\n${logLines.join("\n")}`;
}

/** Check if running as installed PWA (standalone mode) */
function isPWAMode(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari PWA detection
    ("standalone" in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true)
  );
}

/** Check if debug mode is enabled via URL parameter or PWA mode */
function isDebugModeEnabled(): boolean {
  // Always show debug panel for PWAs to help debug iOS Safari login issues
  if (isPWAMode()) {
    return true;
  }
  // Otherwise, check URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const debugValue = urlParams.get("debug");
  return debugValue !== null && debugValue !== "false" && debugValue !== "0";
}

export function LoginDebugPanel() {
  // Initialize visibility from URL parameter (synchronously, before first render)
  const [isVisible, setIsVisible] = useState(isDebugModeEnabled);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const logs = useAuthLogs();

  async function handleCopyLogs(): Promise<void> {
    try {
      const text = formatLogsForExport(logs);
      await navigator.clipboard.writeText(text);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("error");
      setTimeout(() => setCopyStatus("idle"), 2000);
    }
  }

  if (!isVisible) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "16px",
        left: "16px",
        right: "16px",
        maxHeight: "40vh",
        overflow: "auto",
        backgroundColor: "#0d0d1a",
        color: "#e0e0e0",
        padding: "8px",
        borderRadius: "8px",
        fontSize: "10px",
        fontFamily: "ui-monospace, monospace",
        zIndex: 9999,
        boxShadow: "0 4px 20px rgba(0,0,0,0.7)",
        border: "1px solid #333",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "6px",
          borderBottom: "1px solid #333",
          paddingBottom: "4px",
        }}
      >
        <strong style={{ color: "#00d4ff", fontSize: "11px" }}>
          Auth Debug ({logs.length} logs) | v{__APP_VERSION__} ({__GIT_HASH__})
        </strong>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handleCopyLogs}
            disabled={logs.length === 0}
            style={{
              background: copyStatus === "copied" ? "#1a3d1a" : "#1a1a2e",
              border: `1px solid ${copyStatus === "copied" ? "#4a4" : copyStatus === "error" ? "#a44" : "#444"}`,
              color: copyStatus === "copied" ? "#4f4" : copyStatus === "error" ? "#f44" : "#888",
              padding: "2px 6px",
              borderRadius: "4px",
              fontSize: "9px",
              cursor: logs.length === 0 ? "not-allowed" : "pointer",
              opacity: logs.length === 0 ? 0.5 : 1,
            }}
          >
            {copyStatus === "copied" ? "Copied!" : copyStatus === "error" ? "Failed" : "Copy"}
          </button>
          <button
            onClick={clearAuthLogs}
            style={{
              background: "#1a1a2e",
              border: "1px solid #444",
              color: "#888",
              padding: "2px 6px",
              borderRadius: "4px",
              fontSize: "9px",
              cursor: "pointer",
            }}
          >
            Clear
          </button>
          <button
            onClick={() => setIsVisible(false)}
            style={{
              background: "none",
              border: "none",
              color: "#ff6b6b",
              cursor: "pointer",
              fontSize: "14px",
            }}
            aria-label="Close debug panel"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Logs */}
      {logs.length === 0 ? (
        <div style={{ color: "#666", padding: "8px", textAlign: "center" }}>
          No auth logs yet. Try logging in to see debug messages.
        </div>
      ) : (
        <div
          style={{
            maxHeight: "calc(40vh - 50px)",
            overflow: "auto",
            backgroundColor: "#0a0a15",
            borderRadius: "4px",
            padding: "4px",
          }}
        >
          {logs.map((entry, index) => (
            <div
              key={`${entry.timestamp}-${index}`}
              style={{
                padding: "2px 4px",
                borderBottom: index < logs.length - 1 ? "1px solid #1a1a2e" : "none",
              }}
            >
              <span style={{ color: "#555" }}>{formatTime(entry.timestamp)}</span>
              {" "}
              <span
                style={{
                  color: LOG_LEVEL_COLORS[entry.level],
                  fontWeight: "bold",
                }}
              >
                [{entry.level.toUpperCase()}]
              </span>
              {" "}
              <span style={{ color: "#e0e0e0" }}>{entry.message}</span>
              {entry.data !== undefined && (
                <pre
                  style={{
                    margin: "2px 0 0 0",
                    padding: "2px 4px",
                    backgroundColor: "#111122",
                    borderRadius: "2px",
                    color: "#888",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    fontSize: "8px",
                  }}
                >
                  {typeof entry.data === "object"
                    ? JSON.stringify(entry.data, null, 1)
                    : String(entry.data)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
