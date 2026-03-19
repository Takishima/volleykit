/**
 * Notification Service Types
 *
 * Types for the unified notification system that supports both
 * native browser notifications and in-app notifications.
 */

/** Possible reminder times before a game */
export type ReminderTime = '1h' | '2h' | '1d'

/**
 * Notification delivery channel.
 * - 'native': Browser's native Notification API (requires permission)
 * - 'in-app': In-app notification displayed within the UI
 * - 'all': Both native and in-app
 */
export type NotificationChannel = 'native' | 'in-app' | 'all'

/**
 * User preference for notification delivery.
 * - 'native': Prefer native, fall back to in-app if unavailable
 * - 'in-app': Always use in-app only
 * - 'both': Show both native and in-app
 */
export type NotificationPreference = 'native' | 'in-app' | 'both'

// Time constants for scheduling limits
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
const MS_PER_SECOND = 1000

/** One day in milliseconds - used for max scheduling limit */
export const ONE_DAY_MS = HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND

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

/** Notification service interface (native notifications) */
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

// ============================================================================
// Unified Notification Types
// ============================================================================

/** Notification type/severity for in-app display */
export type NotificationType = 'info' | 'success' | 'warning' | 'error'

/** Options for showing a unified notification */
export interface UnifiedNotificationOptions {
  /** Notification title */
  title: string
  /** Notification body text */
  body: string
  /** Notification type/severity (for in-app styling) */
  type?: NotificationType
  /** Optional icon URL (for native notifications) */
  icon?: string
  /** Optional tag to replace existing notifications with same tag */
  tag?: string
  /** Whether to require user interaction to dismiss (native only) */
  requireInteraction?: boolean
  /** Duration in ms for in-app notifications (default: 8000ms for notifications) */
  duration?: number
  /** Optional data payload */
  data?: Record<string, unknown>
  /** Which channel to use (default: based on user preference) */
  channel?: NotificationChannel
}

/** Result of a unified notification operation */
export interface UnifiedNotificationResult {
  /** Whether the notification was shown successfully */
  success: boolean
  /** Which channels successfully delivered the notification */
  channels: {
    native?: boolean
    inApp?: boolean
  }
  /** Error message if both channels failed */
  error?: string
}

/** Unified notification service interface */
export interface UnifiedNotificationService {
  /**
   * Show a notification using the preferred channel(s).
   * Falls back to in-app if native is unavailable.
   */
  notify: (options: UnifiedNotificationOptions) => Promise<UnifiedNotificationResult>

  /**
   * Check if native notifications are available (supported + permitted).
   */
  isNativeAvailable: () => boolean

  /**
   * Check if native notifications are supported (browser capability).
   */
  isNativeSupported: () => boolean

  /**
   * Get current native notification permission status.
   */
  getNativePermission: () => NotificationPermission

  /**
   * Request native notification permission.
   */
  requestNativePermission: () => Promise<NotificationPermission>

  /**
   * Show a notification via native channel only.
   */
  showNative: (options: ShowNotificationOptions) => Promise<NotificationResult>

  /**
   * Show a notification via in-app channel only.
   */
  showInApp: (options: UnifiedNotificationOptions) => string

  /**
   * Schedule a notification for a future time.
   * Uses native notifications if available, otherwise schedules in-app.
   */
  schedule: (
    id: string,
    options: UnifiedNotificationOptions,
    triggerTime: number,
    preference?: NotificationPreference
  ) => ScheduledNotification | null

  /** Cancel a scheduled notification */
  cancelScheduled: (id: string) => void

  /** Cancel all scheduled notifications */
  cancelAllScheduled: () => void

  /** Get all currently scheduled notifications */
  getScheduled: () => ScheduledNotification[]
}
