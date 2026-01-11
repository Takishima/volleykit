/**
 * Notification Service Types
 *
 * Types for the native notifications service that handles
 * permission requests and scheduled game reminders.
 */

/** Possible reminder times before a game */
export type ReminderTime = '1h' | '2h' | '1d'

// Time constants for scheduling limits
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
const MS_PER_SECOND = 1000

/** One day in milliseconds - used for max scheduling limit */
export const ONE_DAY_MS = HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND

/** Available reminder time options */
export const REMINDER_TIME_OPTIONS: ReminderTime[] = ['1h', '2h', '1d']

/** Notification permission status */
export type NotificationPermission = 'granted' | 'denied' | 'default'

/** Result of a notification operation */
export interface NotificationResult {
  success: boolean
  error?: string
}

/** Options for showing a notification */
export interface ShowNotificationOptions {
  /** Notification title */
  title: string
  /** Notification body text */
  body: string
  /** Optional icon URL */
  icon?: string
  /** Optional tag to replace existing notifications */
  tag?: string
  /** Whether to require interaction to dismiss */
  requireInteraction?: boolean
  /** Optional data payload */
  data?: Record<string, unknown>
}

/** Scheduled notification info */
export interface ScheduledNotification {
  /** Unique identifier for this scheduled notification */
  id: string
  /** Assignment ID this notification is for */
  assignmentId: string
  /** When the notification should fire */
  scheduledTime: number
  /** The timeout ID for cancellation */
  timeoutId: ReturnType<typeof setTimeout>
}

/** Notification service interface */
export interface NotificationService {
  /** Check if notifications are supported in this browser */
  isSupported: () => boolean
  /** Get current permission status */
  getPermission: () => NotificationPermission
  /** Request permission from the user */
  requestPermission: () => Promise<NotificationPermission>
  /** Show a notification immediately */
  showNotification: (options: ShowNotificationOptions) => Promise<NotificationResult>
  /** Schedule a notification for a future time */
  scheduleNotification: (
    id: string,
    options: ShowNotificationOptions,
    triggerTime: number
  ) => ScheduledNotification | null
  /** Cancel a scheduled notification */
  cancelScheduledNotification: (id: string) => void
  /** Cancel all scheduled notifications */
  cancelAllScheduledNotifications: () => void
  /** Get all currently scheduled notifications */
  getScheduledNotifications: () => ScheduledNotification[]
}
