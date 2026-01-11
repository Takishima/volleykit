// Native notification service (low-level)
export { notificationService } from './notification-service'

// Unified notification service (recommended)
export { unifiedNotificationService } from './unified-notification-service'

// Types
export type {
  // Native types
  NotificationPermission,
  NotificationResult,
  NotificationService,
  ReminderTime,
  ScheduledNotification,
  ShowNotificationOptions,
  // Unified types
  NotificationChannel,
  NotificationPreference,
  NotificationType,
  UnifiedNotificationOptions,
  UnifiedNotificationResult,
  UnifiedNotificationService,
} from './types'

export { REMINDER_TIME_OPTIONS } from './types'
