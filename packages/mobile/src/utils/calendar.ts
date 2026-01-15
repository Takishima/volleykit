/**
 * Calendar utilities
 *
 * Functions for generating iCal URLs and handling calendar-related operations.
 */

import { Linking, Platform } from 'react-native';

/** Estimated volleyball match duration in hours */
const ESTIMATED_MATCH_DURATION_HOURS = 2;

/** Reminder time: 1 day before event in minutes */
const REMINDER_ONE_DAY_MINUTES = 60 * 24;

/** Reminder time: 2 hours before event in minutes */
const REMINDER_TWO_HOURS_MINUTES = 120;

/**
 * Configuration for the iCal URL
 */
interface ICalUrlConfig {
  /** Base URL for the VolleyManager API */
  baseUrl: string;
  /** User's association code */
  associationCode: string;
  /** User's referee ID */
  refereeId: string;
  /** Auth token for calendar access (if needed) */
  calendarToken?: string;
}

/**
 * Generates the iCal subscription URL for a user's assignments.
 *
 * @param config - Configuration for generating the URL
 * @returns The iCal subscription URL
 */
export function generateICalUrl(config: ICalUrlConfig): string {
  const { baseUrl, associationCode, refereeId, calendarToken } = config;

  // Build the iCal URL
  // The exact format depends on the VolleyManager API
  const params = new URLSearchParams({
    association: associationCode,
    referee: refereeId,
    ...(calendarToken && { token: calendarToken }),
  });

  // Use webcal:// protocol for calendar subscription
  const httpsUrl = `${baseUrl}/api/calendar/assignments.ics?${params.toString()}`;
  return httpsUrl.replace('https://', 'webcal://');
}

/**
 * Opens the device's calendar app with an iCal subscription URL.
 *
 * @param url - The iCal URL to subscribe to (webcal:// or https://)
 * @returns Promise that resolves when the URL is opened
 * @throws If the URL cannot be opened
 */
export async function openICalSubscription(url: string): Promise<void> {
  // Ensure URL uses webcal:// protocol for proper calendar handling
  const webcalUrl = url.startsWith('https://')
    ? url.replace('https://', 'webcal://')
    : url;

  const canOpen = await Linking.canOpenURL(webcalUrl);

  if (canOpen) {
    await Linking.openURL(webcalUrl);
    return;
  }

  // Fallback: try HTTPS URL (will open in browser, user can then subscribe)
  const httpsUrl = webcalUrl.replace('webcal://', 'https://');
  await Linking.openURL(httpsUrl);
}

/**
 * Generates a deep link URL for an assignment.
 *
 * @param assignmentId - The assignment ID
 * @returns The deep link URL
 */
export function generateAssignmentDeepLink(assignmentId: string): string {
  return `volleykit://assignment/${assignmentId}`;
}

/**
 * Formats an assignment for calendar event notes.
 * Includes deep link for navigation back to the app.
 *
 * @param assignment - Assignment details
 * @returns Formatted notes string
 */
export function formatCalendarNotes(assignment: {
  id: string;
  league?: string;
  role?: string;
  teamHome?: string;
  teamAway?: string;
}): string {
  const parts: string[] = [];

  if (assignment.league) {
    parts.push(`League: ${assignment.league}`);
  }

  if (assignment.role) {
    parts.push(`Role: ${assignment.role}`);
  }

  if (assignment.teamHome && assignment.teamAway) {
    parts.push(`Match: ${assignment.teamHome} vs ${assignment.teamAway}`);
  }

  // Add deep link for navigation back to the app
  const deepLink = generateAssignmentDeepLink(assignment.id);
  parts.push('');
  parts.push(`Open in VolleyKit: ${deepLink}`);

  return parts.join('\n');
}

/**
 * Calculates the end time for a volleyball match.
 * Assumes 2-3 hours per match.
 *
 * @param startDate - The match start time
 * @returns The estimated end time
 */
export function calculateMatchEndTime(startDate: Date): Date {
  const endDate = new Date(startDate);
  endDate.setHours(endDate.getHours() + ESTIMATED_MATCH_DURATION_HOURS);
  return endDate;
}

/**
 * Gets the default reminder times for calendar events.
 *
 * @returns Array of reminder times in minutes before the event
 */
export function getDefaultReminders(): number[] {
  // Remind 1 day before and 2 hours before
  return [REMINDER_ONE_DAY_MINUTES, REMINDER_TWO_HOURS_MINUTES];
}

/**
 * Opens the device calendar app.
 * Platform-specific implementation.
 */
export async function openCalendarApp(): Promise<void> {
  if (Platform.OS === 'ios') {
    // iOS: Open Calendar app
    await Linking.openURL('calshow://');
  } else {
    // Android: Open Calendar app
    await Linking.openURL('content://com.android.calendar/time/');
  }
}
