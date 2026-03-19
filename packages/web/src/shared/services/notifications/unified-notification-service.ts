/**
 * Unified Notification Service
 *
 * Provides a unified interface for both native browser notifications
 * and in-app notifications. Automatically falls back to in-app when
 * native notifications are unavailable or not permitted.
 *
 * Usage:
 * ```typescript
 * import { unifiedNotificationService } from '@/shared/services/notifications';
 *
 * // Show notification (auto-selects channel based on availability)
 * await unifiedNotificationService.notify({
 *   title: 'Game Reminder',
 *   body: 'Your game starts in 1 hour',
 *   type: 'info',
 * });
 *
 * // Force specific channel
 * await unifiedNotificationService.notify({
 *   title: 'Game Reminder',
 *   body: 'Your game starts in 1 hour',
 *   channel: 'in-app', // or 'native', 'all'
 * });
 * ```
 */

import { useToastStore } from '@/shared/stores/toast'

import { notificationService } from './notification-service'
import {
  ONE_DAY_MS,
  type NotificationChannel,
  type NotificationPermission,
  type NotificationPreference,
  type NotificationResult,
  type ScheduledNotification,
  type ShowNotificationOptions,
  type UnifiedNotificationOptions,
  type UnifiedNotificationResult,
  type UnifiedNotificationService,
} from './types'

// Default duration for in-app notifications (longer than toasts for importance)
const DEFAULT_NOTIFICATION_DURATION_MS = 8000

// Store for scheduled unified notifications
const scheduledNotifications = new Map<string, ScheduledNotification>()

/**
 * Check if native notifications are supported by the browser.
 */
function isNativeSupported(): boolean {
  return notificationService.isSupported()
}

/**
 * Check if native notifications are available (supported AND permitted).
 */
function isNativeAvailable(): boolean {
  return isNativeSupported() && notificationService.getPermission() === 'granted'
}

/**
 * Get current native notification permission status.
 */
function getNativePermission(): NotificationPermission {
  return notificationService.getPermission()
}

/**
 * Request native notification permission.
 */
async function requestNativePermission(): Promise<NotificationPermission> {
  return notificationService.requestPermission()
}

/**
 * Show a native notification.
 */
async function showNative(options: ShowNotificationOptions): Promise<NotificationResult> {
  return notificationService.showNotification(options)
}

/**
 * Show an in-app notification using the toast system.
 * Returns the notification ID.
 */
function showInApp(options: UnifiedNotificationOptions): string {
  const { addToast } = useToastStore.getState()

  // Combine title and body for toast message
  const message = options.title ? `${options.title}: ${options.body}` : options.body

  return addToast({
    message,
    type: options.type ?? 'info',
    duration: options.duration ?? DEFAULT_NOTIFICATION_DURATION_MS,
  })
}

/**
 * Determine which channels to use based on options and availability.
 */
function resolveChannels(
  channel: NotificationChannel | undefined,
  preference: NotificationPreference = 'native'
): { native: boolean; inApp: boolean } {
  // Explicit channel override
  if (channel === 'native') {
    return { native: true, inApp: false }
  }
  if (channel === 'in-app') {
    return { native: false, inApp: true }
  }
  if (channel === 'all') {
    return { native: true, inApp: true }
  }

  // Based on preference
  const nativeAvailable = isNativeAvailable()

  switch (preference) {
    case 'both':
      return { native: nativeAvailable, inApp: true }
    case 'in-app':
      return { native: false, inApp: true }
    case 'native':
    default:
      // Prefer native, fall back to in-app
      return {
        native: nativeAvailable,
        inApp: !nativeAvailable,
      }
  }
}

/**
 * Show a notification using the preferred channel(s).
 */
async function notify(options: UnifiedNotificationOptions): Promise<UnifiedNotificationResult> {
  const channels = resolveChannels(options.channel)
  const result: UnifiedNotificationResult = {
    success: false,
    channels: {},
  }

  // Try native notification
  if (channels.native) {
    const nativeResult = await showNative({
      title: options.title,
      body: options.body,
      icon: options.icon,
      tag: options.tag,
      requireInteraction: options.requireInteraction,
      data: options.data,
    })
    result.channels.native = nativeResult.success
    if (nativeResult.success) {
      result.success = true
    }
  }

  // Try in-app notification
  if (channels.inApp) {
    try {
      showInApp(options)
      result.channels.inApp = true
      result.success = true
    } catch (error) {
      result.channels.inApp = false
      if (!result.success) {
        result.error = error instanceof Error ? error.message : 'Failed to show in-app notification'
      }
    }
  }

  // Set error if nothing succeeded
  if (!result.success && !result.error) {
    result.error = 'No notification channel available'
  }

  return result
}

/**
 * Schedule a notification for a future time.
 */
function schedule(
  id: string,
  options: UnifiedNotificationOptions,
  triggerTime: number,
  preference: NotificationPreference = 'native'
): ScheduledNotification | null {
  // Cancel any existing notification with this ID
  cancelScheduled(id)

  const now = Date.now()
  const delay = triggerTime - now

  // Don't schedule if the time has already passed
  if (delay <= 0) {
    return null
  }

  // Don't schedule notifications more than 24 hours in advance
  if (delay > ONE_DAY_MS) {
    return null
  }

  const timeoutId = setTimeout(() => {
    const channels = resolveChannels(options.channel, preference)

    // Show notification through appropriate channels
    if (channels.native && isNativeAvailable()) {
      showNative({
        title: options.title,
        body: options.body,
        icon: options.icon,
        tag: options.tag,
        requireInteraction: options.requireInteraction,
        data: options.data,
      })
    }

    if (channels.inApp) {
      showInApp(options)
    }

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
 * Cancel a scheduled notification.
 */
function cancelScheduled(id: string): void {
  const scheduled = scheduledNotifications.get(id)
  if (scheduled) {
    clearTimeout(scheduled.timeoutId)
    scheduledNotifications.delete(id)
  }

  // Also cancel from native service
  notificationService.cancelScheduledNotification(id)
}

/**
 * Cancel all scheduled notifications.
 */
function cancelAllScheduled(): void {
  for (const scheduled of scheduledNotifications.values()) {
    clearTimeout(scheduled.timeoutId)
  }
  scheduledNotifications.clear()

  // Also cancel from native service
  notificationService.cancelAllScheduledNotifications()
}

/**
 * Get all currently scheduled notifications.
 */
function getScheduled(): ScheduledNotification[] {
  // Combine unified and native scheduled notifications
  const unifiedScheduled = Array.from(scheduledNotifications.values())
  const nativeScheduled = notificationService.getScheduledNotifications()

  // Deduplicate by ID
  const all = new Map<string, ScheduledNotification>()
  for (const s of unifiedScheduled) {
    all.set(s.id, s)
  }
  for (const s of nativeScheduled) {
    if (!all.has(s.id)) {
      all.set(s.id, s)
    }
  }

  return Array.from(all.values())
}

/**
 * Unified notification service singleton.
 *
 * Provides a single interface for both native and in-app notifications.
 * Automatically handles fallback when native notifications are unavailable.
 */
export const unifiedNotificationService: UnifiedNotificationService = {
  notify,
  isNativeAvailable,
  isNativeSupported,
  getNativePermission,
  requestNativePermission,
  showNative,
  showInApp,
  schedule,
  cancelScheduled,
  cancelAllScheduled,
  getScheduled,
}
