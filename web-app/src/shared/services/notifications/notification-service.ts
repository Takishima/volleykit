/**
 * Notification Service
 *
 * Abstraction layer for the Web Notifications API.
 * Handles permission requests and scheduled notifications for game reminders.
 *
 * Browser Support:
 * - Desktop: All modern browsers (Chrome, Firefox, Safari, Edge)
 * - iOS/iPadOS: Safari 16.4+ (requires PWA installed)
 * - Android: All modern browsers
 *
 * Limitations:
 * - Scheduled notifications only work while the app is open/in background
 * - For true background notifications, a push notification server is required
 */

import {
  ONE_DAY_MS,
  type NotificationPermission,
  type NotificationResult,
  type NotificationService,
  type ScheduledNotification,
  type ShowNotificationOptions,
} from './types'

// Store scheduled notifications for management
const scheduledNotifications = new Map<string, ScheduledNotification>()

/**
 * Check if the Notifications API is available
 */
function isSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

/**
 * Get current notification permission status
 */
function getPermission(): NotificationPermission {
  if (!isSupported()) {
    return 'denied'
  }
  return Notification.permission as NotificationPermission
}

/**
 * Request notification permission from the user
 *
 * @returns The resulting permission status
 */
async function requestPermission(): Promise<NotificationPermission> {
  if (!isSupported()) {
    return 'denied'
  }

  // Already granted or denied - don't re-request
  if (Notification.permission !== 'default') {
    return Notification.permission as NotificationPermission
  }

  try {
    const result = await Notification.requestPermission()
    return result as NotificationPermission
  } catch {
    // Some browsers (older Safari) use callback-based API
    return new Promise((resolve) => {
      Notification.requestPermission((result) => {
        resolve(result as NotificationPermission)
      })
    })
  }
}

/**
 * Show a notification immediately
 *
 * @param options - Notification options
 * @returns Result indicating success or failure
 */
async function showNotification(options: ShowNotificationOptions): Promise<NotificationResult> {
  if (!isSupported()) {
    return {
      success: false,
      error: 'Notifications not supported in this browser',
    }
  }

  if (Notification.permission !== 'granted') {
    return {
      success: false,
      error: 'Notification permission not granted',
    }
  }

  try {
    // Try to use service worker for better notification experience
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(options.title, {
        body: options.body,
        icon: options.icon ?? '/icons/icon-192x192.png',
        tag: options.tag,
        requireInteraction: options.requireInteraction ?? false,
        data: options.data,
      })
    } else {
      // Fallback to regular Notification API
      new Notification(options.title, {
        body: options.body,
        icon: options.icon ?? '/icons/icon-192x192.png',
        tag: options.tag,
        requireInteraction: options.requireInteraction ?? false,
        data: options.data,
      })
    }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      error: `Failed to show notification: ${message}`,
    }
  }
}

/**
 * Schedule a notification for a future time
 *
 * @param id - Unique identifier for this scheduled notification
 * @param options - Notification options
 * @param triggerTime - Unix timestamp (ms) when to show the notification
 * @returns The scheduled notification info, or null if scheduling failed
 */
function scheduleNotification(
  id: string,
  options: ShowNotificationOptions,
  triggerTime: number
): ScheduledNotification | null {
  if (!isSupported()) {
    return null
  }

  // Cancel any existing notification with this ID
  cancelScheduledNotification(id)

  const now = Date.now()
  const delay = triggerTime - now

  // Don't schedule if the time has already passed
  if (delay <= 0) {
    return null
  }

  // Don't schedule notifications more than 24 hours in advance
  // (browser may not keep timers alive that long)
  if (delay > ONE_DAY_MS) {
    return null
  }

  const timeoutId = setTimeout(() => {
    showNotification(options)
    scheduledNotifications.delete(id)
  }, delay)

  const scheduled: ScheduledNotification = {
    id,
    assignmentId: (options.data?.assignmentId as string) ?? id,
    scheduledTime: triggerTime,
    timeoutId,
  }

  scheduledNotifications.set(id, scheduled)

  return scheduled
}

/**
 * Cancel a scheduled notification
 *
 * @param id - The notification ID to cancel
 */
function cancelScheduledNotification(id: string): void {
  const scheduled = scheduledNotifications.get(id)
  if (scheduled) {
    clearTimeout(scheduled.timeoutId)
    scheduledNotifications.delete(id)
  }
}

/**
 * Cancel all scheduled notifications
 */
function cancelAllScheduledNotifications(): void {
  for (const scheduled of scheduledNotifications.values()) {
    clearTimeout(scheduled.timeoutId)
  }
  scheduledNotifications.clear()
}

/**
 * Get all currently scheduled notifications
 */
function getScheduledNotifications(): ScheduledNotification[] {
  return Array.from(scheduledNotifications.values())
}

/**
 * Notification service singleton
 *
 * Usage:
 * ```typescript
 * import { notificationService } from '@/shared/services/notifications';
 *
 * if (notificationService.isSupported()) {
 *   const permission = await notificationService.requestPermission();
 *   if (permission === 'granted') {
 *     await notificationService.showNotification({
 *       title: 'Game Reminder',
 *       body: 'Your game starts in 1 hour',
 *     });
 *   }
 * }
 * ```
 */
export const notificationService: NotificationService = {
  isSupported,
  getPermission,
  requestPermission,
  showNotification,
  scheduleNotification,
  cancelScheduledNotification,
  cancelAllScheduledNotifications,
  getScheduledNotifications,
}
