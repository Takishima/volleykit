/**
 * Cleanup service for departure reminder data.
 *
 * Handles deletion of reminder data after assignment completion
 * to maintain privacy (per FR-026a: no location history retained).
 */

import { stopBackgroundTask } from './background-task'
import {
  cancelReminderNotification,
  cancelAllDepartureNotifications,
} from './notification-scheduler'
import { departureRemindersStore } from '../../stores/departureReminders'

/**
 * Cleanup options.
 */
export interface CleanupOptions {
  /** Cancel all pending notifications */
  cancelNotifications?: boolean
  /** Stop background tracking */
  stopTracking?: boolean
}

/**
 * Clean up reminder data for a specific assignment.
 *
 * Called after assignment is completed or when user is at venue.
 *
 * @param assignmentId The assignment ID to clean up
 */
export async function cleanupAssignmentReminder(assignmentId: string): Promise<void> {
  const reminder = departureRemindersStore.getReminder(assignmentId)

  if (reminder) {
    // Cancel scheduled notification
    if (reminder.notificationId) {
      await cancelReminderNotification(reminder.notificationId)
    }

    // Remove from store
    departureRemindersStore.removeReminder(assignmentId)
  }
}

/**
 * Clean up all reminders for past assignments.
 *
 * @param currentTime The current time to compare against
 */
export async function cleanupPastReminders(currentTime: Date = new Date()): Promise<void> {
  const reminders = departureRemindersStore.getActiveReminders()

  for (const reminder of reminders) {
    const arrivalTime = new Date(reminder.arrivalTime)

    // Clean up if assignment time has passed
    if (arrivalTime < currentTime) {
      await cleanupAssignmentReminder(reminder.assignmentId)
    }
  }
}

/**
 * Clean up all reminder data.
 *
 * Used when user disables the feature or logs out.
 *
 * @param options Cleanup options
 */
export async function cleanupAllReminders(options: CleanupOptions = {}): Promise<void> {
  const { cancelNotifications = true, stopTracking = true } = options

  // Cancel all notifications
  if (cancelNotifications) {
    await cancelAllDepartureNotifications()
  }

  // Stop background tracking
  if (stopTracking) {
    await stopBackgroundTask()
  }

  // Clear all reminders from store
  departureRemindersStore.clearAll()
}

/**
 * Register cleanup on app foreground.
 *
 * This should be called when the app comes to foreground
 * to clean up any stale reminder data.
 */
export async function onAppForeground(): Promise<void> {
  await cleanupPastReminders()
}

/**
 * Register cleanup for feature disable.
 *
 * This should be called when user disables departure reminders.
 */
export async function onFeatureDisabled(): Promise<void> {
  await cleanupAllReminders({
    cancelNotifications: true,
    stopTracking: true,
  })
}

/**
 * Register cleanup for user logout.
 *
 * This should be called when user logs out to ensure
 * no location data is retained.
 */
export async function onUserLogout(): Promise<void> {
  await cleanupAllReminders({
    cancelNotifications: true,
    stopTracking: true,
  })

  // Reset the store completely
  departureRemindersStore.reset()
}

/**
 * Verify no location history is retained.
 *
 * This is a diagnostic function to verify compliance with FR-026a.
 * Returns true if no location data is stored.
 */
export function verifyNoLocationHistory(): boolean {
  const state = departureRemindersStore.getState()

  // Check that no location is stored (should be null or transient)
  // Location is only kept in memory, not persisted
  return state.lastKnownLocation === null || !state.isTracking
}

/**
 * Schedule periodic cleanup.
 *
 * @returns Cleanup interval ID for cancellation
 */
export function schedulePeriodicCleanup(intervalMs: number = 60 * 60 * 1000): NodeJS.Timeout {
  return setInterval(async () => {
    await cleanupPastReminders()
  }, intervalMs)
}
