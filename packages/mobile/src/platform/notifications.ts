/**
 * Notifications platform adapter
 *
 * Provides local notification services using expo-notifications for Smart Departure Reminder.
 */

import { Platform } from 'react-native';

import * as Notifications from 'expo-notifications';

/**
 * Notification content for scheduling.
 */
export interface NotificationContent {
  /** Notification title */
  title: string;
  /** Notification body text */
  body: string;
  /** Optional data payload */
  data?: Record<string, unknown>;
  /** Optional sound (true for default, false for silent) */
  sound?: boolean;
  /** Optional badge count (iOS) */
  badge?: number;
}

/**
 * Notification adapter interface for platform abstraction.
 */
export interface NotificationAdapter {
  /** Request notification permissions */
  requestPermissions(): Promise<boolean>;
  /** Check if notification permission is granted */
  hasPermissions(): Promise<boolean>;
  /** Schedule a notification for a specific time */
  scheduleNotification(
    content: NotificationContent,
    triggerAt: Date
  ): Promise<string>;
  /** Cancel a scheduled notification */
  cancelNotification(id: string): Promise<void>;
  /** Cancel all scheduled notifications */
  cancelAllNotifications(): Promise<void>;
  /** Get all scheduled notifications */
  getScheduledNotifications(): Promise<{ id: string; date: Date | null }[]>;
  /** Configure notification handler */
  configureHandler(): void;
}

/**
 * Request notification permissions.
 */
async function requestPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    if (existingStatus === 'granted') {
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Check if notification permission is granted.
 */
async function hasPermissions(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Schedule a notification for a specific time.
 */
async function scheduleNotification(
  content: NotificationContent,
  triggerAt: Date
): Promise<string> {
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: content.title,
      body: content.body,
      data: content.data ?? {},
      sound: content.sound !== false,
      badge: content.badge,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerAt,
    },
  });

  return notificationId;
}

/**
 * Cancel a scheduled notification.
 */
async function cancelNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

/**
 * Cancel all scheduled notifications.
 */
async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get all scheduled notifications.
 */
async function getScheduledNotifications(): Promise<
  { id: string; date: Date | null }[]
> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  return scheduled.map((notification) => ({
    id: notification.identifier,
    date:
      notification.trigger &&
      typeof notification.trigger === 'object' &&
      'value' in notification.trigger
        ? new Date(notification.trigger.value as number)
        : null,
  }));
}

/**
 * Configure how notifications are handled when app is in foreground.
 */
function configureHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Set up notification response listener.
 * Returns cleanup function.
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): () => void {
  const subscription =
    Notifications.addNotificationResponseReceivedListener(callback);
  return () => subscription.remove();
}

/**
 * Get the Android notification channel ID.
 * Creates channel if it doesn't exist.
 */
export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync('departure-reminders', {
    name: 'Departure Reminders',
    description: 'Notifications for when to leave for your games',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0ea5e9',
  });
}

/**
 * Notification adapter implementation using expo-notifications.
 */
export const notifications: NotificationAdapter = {
  requestPermissions,
  hasPermissions,
  scheduleNotification,
  cancelNotification,
  cancelAllNotifications,
  getScheduledNotifications,
  configureHandler,
};
