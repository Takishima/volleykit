/**
 * Notification scheduler for departure reminders.
 *
 * Schedules and manages departure notification content.
 */

import { format, differenceInMinutes } from 'date-fns';
import { notifications } from '../../platform/notifications';
import type { DepartureReminder, TripLeg, VenueCluster } from '../../types/departureReminder';

/**
 * Translation function type.
 */
type TranslateFunction = (key: string, params?: Record<string, string | number>) => string;

/** Registered translation function */
let translateFn: TranslateFunction | null = null;

/**
 * Register the translation function for notifications.
 */
export function registerTranslationFunction(t: TranslateFunction): void {
  translateFn = t;
}

/**
 * Get translation or return key as fallback.
 */
function translate(key: string, params?: Record<string, string | number>): string {
  if (translateFn) {
    return translateFn(key, params);
  }
  // Fallback to English defaults
  return getFallbackTranslation(key, params);
}

/**
 * Fallback translations when i18n is not available.
 */
function getFallbackTranslation(
  key: string,
  params?: Record<string, string | number>
): string {
  const fallbacks: Record<string, string> = {
    'departure.notification.title': 'Time to Leave',
    'departure.notification.body': 'Leave now to arrive on time for {game}',
    'departure.notification.withTransit': 'Take {line} from {stop} (→ {direction})',
    'departure.notification.departureTime': 'Departure: {time}',
    'departure.notification.leaveIn': 'Leave in {minutes} min',
    'departure.notification.leaveNow': 'Leave now!',
    'departure.notification.clustered': '{count} games at nearby venues',
    'departure.notification.noRoute': 'Leave with plenty of time',
  };

  let text = fallbacks[key] ?? key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
  }
  return text;
}

/**
 * Format the first transit leg for notification display.
 */
function formatFirstTransitLeg(legs: TripLeg[]): string | null {
  const transitLeg = legs.find((leg) => leg.mode !== 'walk' && leg.line);
  if (!transitLeg || !transitLeg.line) return null;

  return translate('departure.notification.withTransit', {
    line: transitLeg.line,
    stop: transitLeg.fromStop,
    direction: transitLeg.direction ?? '',
  });
}

/**
 * Build notification content for a single reminder.
 */
function buildNotificationContent(
  reminder: DepartureReminder,
  _bufferMinutes: number
): { title: string; body: string } {
  const departureTime = new Date(reminder.departureTime);
  const now = new Date();
  const minutesUntilDeparture = differenceInMinutes(departureTime, now);

  // Title with departure urgency
  let title: string;
  if (minutesUntilDeparture <= 0) {
    title = `🚨 ${translate('departure.notification.leaveNow')}`;
  } else if (minutesUntilDeparture <= 5) {
    title = `⏰ ${translate('departure.notification.leaveIn', { minutes: minutesUntilDeparture })}`;
  } else {
    title = `🚆 ${translate('departure.notification.title')}`;
  }

  // Build body with venue and transit info
  const bodyParts: string[] = [];

  // Venue name
  bodyParts.push(reminder.venueName);

  // Transit info if available
  if (reminder.route.length > 0) {
    const transitInfo = formatFirstTransitLeg(reminder.route);
    if (transitInfo) {
      bodyParts.push(transitInfo);
    }
  }

  // Departure time
  bodyParts.push(
    translate('departure.notification.departureTime', {
      time: format(departureTime, 'HH:mm'),
    })
  );

  return {
    title,
    body: bodyParts.join('\n'),
  };
}

/**
 * Build notification content for clustered venues.
 */
function buildClusteredNotificationContent(
  cluster: VenueCluster,
  departureTime: Date
): { title: string; body: string } {
  const title = `🚆 ${translate('departure.notification.title')}`;

  const bodyParts: string[] = [];

  // Count and first venue
  bodyParts.push(
    translate('departure.notification.clustered', { count: cluster.assignmentIds.length })
  );

  // List venue names (max 3)
  const venueList = cluster.venueNames.slice(0, 3).join(', ');
  if (cluster.venueNames.length > 3) {
    bodyParts.push(`${venueList}...`);
  } else {
    bodyParts.push(venueList);
  }

  // Departure time
  bodyParts.push(
    translate('departure.notification.departureTime', {
      time: format(departureTime, 'HH:mm'),
    })
  );

  return {
    title,
    body: bodyParts.join('\n'),
  };
}

/**
 * Schedule a departure reminder notification.
 *
 * @param reminder The departure reminder data
 * @param bufferMinutes Minutes before departure to notify
 * @returns The notification ID if scheduled, null if not
 */
export async function scheduleReminderNotification(
  reminder: DepartureReminder,
  bufferMinutes: number
): Promise<string | null> {
  const departureTime = new Date(reminder.departureTime);
  const notifyTime = new Date(departureTime.getTime() - bufferMinutes * 60 * 1000);

  // Don't schedule if notification time has passed
  if (notifyTime <= new Date()) {
    return null;
  }

  const { title, body } = buildNotificationContent(reminder, bufferMinutes);

  // Deep link to assignment
  const deepLink = `volleykit://assignment/${reminder.assignmentId}`;

  try {
    const notificationId = await notifications.scheduleNotification({
      content: {
        title,
        body,
        data: {
          type: 'departure_reminder',
          assignmentId: reminder.assignmentId,
          deepLink,
        },
      },
      trigger: {
        date: notifyTime,
      },
    });

    return notificationId;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return null;
  }
}

/**
 * Schedule a notification for clustered venues.
 */
export async function scheduleClusteredNotification(
  cluster: VenueCluster,
  departureTime: Date,
  bufferMinutes: number
): Promise<string | null> {
  const notifyTime = new Date(departureTime.getTime() - bufferMinutes * 60 * 1000);

  if (notifyTime <= new Date()) {
    return null;
  }

  const { title, body } = buildClusteredNotificationContent(cluster, departureTime);

  // Deep link to first assignment in cluster
  const deepLink = `volleykit://assignment/${cluster.assignmentIds[0]}`;

  try {
    const notificationId = await notifications.scheduleNotification({
      content: {
        title,
        body,
        data: {
          type: 'departure_reminder_cluster',
          assignmentIds: cluster.assignmentIds,
          deepLink,
        },
      },
      trigger: {
        date: notifyTime,
      },
    });

    return notificationId;
  } catch (error) {
    console.error('Failed to schedule clustered notification:', error);
    return null;
  }
}

/**
 * Cancel a scheduled reminder notification.
 */
export async function cancelReminderNotification(notificationId: string): Promise<void> {
  try {
    await notifications.cancelNotification(notificationId);
  } catch (error) {
    console.error('Failed to cancel notification:', error);
  }
}

/**
 * Cancel all departure reminder notifications.
 */
export async function cancelAllDepartureNotifications(): Promise<void> {
  try {
    const scheduled = await notifications.getScheduledNotifications();
    const departureNotifications = scheduled.filter(
      (n) =>
        n.content.data?.type === 'departure_reminder' ||
        n.content.data?.type === 'departure_reminder_cluster'
    );

    for (const notification of departureNotifications) {
      await notifications.cancelNotification(notification.identifier);
    }
  } catch (error) {
    console.error('Failed to cancel departure notifications:', error);
  }
}
