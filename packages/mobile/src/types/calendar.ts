/**
 * Calendar types for native calendar integration
 */

/**
 * Mapping between VolleyKit assignment and device calendar event.
 * Used to track locally created calendar events for updates/deletion.
 */
export interface CalendarEventMapping {
  /** VolleyKit assignment ID */
  assignmentId: string
  /** Device calendar event ID */
  calendarEventId: string
  /** Target calendar identifier */
  calendarId: string
  /** When the event was created */
  createdAt: string
  /** Last sync timestamp */
  lastUpdatedAt: string
}

/**
 * Simplified calendar info for display in picker.
 */
export interface CalendarInfo {
  /** Calendar ID */
  id: string
  /** Calendar title/name */
  title: string
  /** Calendar color (hex) */
  color: string
  /** Whether this is the primary calendar */
  isPrimary: boolean
  /** Source (iCloud, Google, Local, etc.) */
  source: string
  /** Whether calendar allows modification */
  allowsModifications: boolean
}

/**
 * Calendar event creation data.
 */
export interface CalendarEventData {
  /** Event title */
  title: string
  /** Event start time (ISO string) */
  startDate: string
  /** Event end time (ISO string) */
  endDate: string
  /** Event location */
  location?: string
  /** Event notes/description */
  notes?: string
  /** Event URL for deep linking */
  url?: string
  /** Event time zone */
  timeZone?: string
  /** Reminder minutes before event */
  alarms?: number[]
}

/**
 * Calendar sync mode preference.
 */
export type CalendarSyncMode = 'ical' | 'direct' | 'none'

/**
 * Calendar settings state.
 */
export interface CalendarSettings {
  /** Whether calendar integration is enabled */
  enabled: boolean
  /** Sync mode (iCal subscription or direct events) */
  syncMode: CalendarSyncMode
  /** Selected calendar ID for direct sync */
  selectedCalendarId: string | null
  /** Last successful sync timestamp */
  lastSyncAt: string | null
}
