/* eslint-disable @typescript-eslint/no-magic-numbers -- Debug panel uses inline styles with pixel values */
import { useSyncExternalStore } from 'react'

import {
  getAuthLogs,
  clearAuthLogs,
  onAuthLogsChange,
  type AuthLogEntry,
} from '@/shared/utils/auth-log-buffer'

/** Hook to subscribe to auth logs with useSyncExternalStore */
function useAuthLogs(): AuthLogEntry[] {
  return useSyncExternalStore(onAuthLogsChange, getAuthLogs, getAuthLogs)
}

/** Format timestamp as HH:MM:SS.mmm */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  const ms = date.getMilliseconds().toString().padStart(3, '0')
  return `${hours}:${minutes}:${seconds}.${ms}`
}

/** Color for each log level */
const LOG_LEVEL_COLORS: Record<AuthLogEntry['level'], string> = {
  debug: '#888',
  info: '#00d4ff',
  warn: '#ffaa00',
  error: '#ff6b6b',
}

/**
 * Debug section showing auth-related logs.
 * Useful for debugging iOS PWA login issues without Safari Web Inspector.
 */
export function AuthLogsSection() {
  const logs = useAuthLogs()

  return (
    <div style={{ fontSize: '9px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <span style={{ color: '#666' }}>{logs.length} entries</span>
        <button
          onClick={clearAuthLogs}
          style={{
            padding: '2px 8px',
            fontSize: '9px',
            backgroundColor: '#1a1a2e',
            border: '1px solid #444',
            color: '#888',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
      </div>

      {logs.length === 0 ? (
        <div style={{ color: '#666', padding: '8px', textAlign: 'center' }}>
          No auth logs yet. Try logging in to see debug messages.
        </div>
      ) : (
        <div
          style={{
            maxHeight: '200px',
            overflow: 'auto',
            backgroundColor: '#0a0a15',
            borderRadius: '4px',
            padding: '4px',
          }}
        >
          {logs.map((entry, index) => (
            <div
              key={`${entry.timestamp}-${index}`}
              style={{
                padding: '2px 4px',
                borderBottom: index < logs.length - 1 ? '1px solid #1a1a2e' : 'none',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              <span style={{ color: '#555' }}>{formatTime(entry.timestamp)}</span>{' '}
              <span style={{ color: LOG_LEVEL_COLORS[entry.level], fontWeight: 'bold' }}>
                [{entry.level.toUpperCase()}]
              </span>{' '}
              <span style={{ color: '#e0e0e0' }}>{entry.message}</span>
              {entry.data !== undefined && (
                <pre
                  style={{
                    margin: '2px 0 0 0',
                    padding: '2px 4px',
                    backgroundColor: '#111122',
                    borderRadius: '2px',
                    color: '#888',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    fontSize: '8px',
                  }}
                >
                  {typeof entry.data === 'object'
                    ? JSON.stringify(entry.data, null, 1)
                    : String(entry.data)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
