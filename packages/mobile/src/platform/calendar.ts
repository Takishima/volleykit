/**
 * Calendar platform adapter
 *
 * Provides calendar access functions using expo-calendar for native calendar integration.
 */

import { Platform } from 'react-native';

import * as Calendar from 'expo-calendar';

import type { CalendarInfo, CalendarEventData } from '../types/calendar';

/**
 * Calendar adapter interface for platform abstraction.
 */
export interface CalendarAdapter {
  /** Request calendar permissions */
  requestPermissions(): Promise<boolean>;
  /** Check if calendar permission is granted */
  hasPermissions(): Promise<boolean>;
  /** Get list of available calendars */
  getCalendars(): Promise<CalendarInfo[]>;
  /** Create a calendar event */
  createEvent(calendarId: string, event: CalendarEventData): Promise<string>;
  /** Update an existing calendar event */
  updateEvent(eventId: string, event: Partial<CalendarEventData>): Promise<void>;
  /** Delete a calendar event */
  deleteEvent(eventId: string): Promise<void>;
  /** Get the default calendar ID */
  getDefaultCalendarId(): Promise<string | null>;
}

/**
 * Map expo-calendar Calendar to our CalendarInfo type.
 */
function mapCalendar(cal: Calendar.Calendar): CalendarInfo {
  return {
    id: cal.id,
    title: cal.title,
    color: cal.color ?? '#0ea5e9',
    isPrimary: cal.isPrimary ?? false,
    source: cal.source?.name ?? 'Unknown',
    allowsModifications: cal.allowsModifications ?? true,
  };
}

/**
 * Request calendar permissions for the current platform.
 */
async function requestPermissions(): Promise<boolean> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Check if calendar permission is granted.
 */
async function hasPermissions(): Promise<boolean> {
  try {
    const { status } = await Calendar.getCalendarPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Get list of available calendars that allow modifications.
 */
async function getCalendars(): Promise<CalendarInfo[]> {
  try {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

    // Filter to only calendars that allow modifications
    return calendars
      .filter((cal) => cal.allowsModifications !== false)
      .map(mapCalendar)
      .sort((a, b) => {
        // Primary calendars first, then by title
        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;
        return a.title.localeCompare(b.title);
      });
  } catch {
    return [];
  }
}

/**
 * Create a calendar event.
 */
async function createEvent(
  calendarId: string,
  event: CalendarEventData
): Promise<string> {
  const eventId = await Calendar.createEventAsync(calendarId, {
    title: event.title,
    startDate: new Date(event.startDate),
    endDate: new Date(event.endDate),
    location: event.location,
    notes: event.notes,
    url: event.url,
    timeZone: event.timeZone ?? 'Europe/Zurich',
    alarms: event.alarms?.map((minutes) => ({ relativeOffset: -minutes })),
  });

  return eventId;
}

/**
 * Update an existing calendar event.
 */
async function updateEvent(
  eventId: string,
  event: Partial<CalendarEventData>
): Promise<void> {
  const updates: Partial<Calendar.Event> = {};

  if (event.title !== undefined) updates.title = event.title;
  if (event.startDate !== undefined) updates.startDate = new Date(event.startDate);
  if (event.endDate !== undefined) updates.endDate = new Date(event.endDate);
  if (event.location !== undefined) updates.location = event.location;
  if (event.notes !== undefined) updates.notes = event.notes;
  if (event.url !== undefined) updates.url = event.url;

  await Calendar.updateEventAsync(eventId, updates);
}

/**
 * Delete a calendar event.
 */
async function deleteEvent(eventId: string): Promise<void> {
  await Calendar.deleteEventAsync(eventId);
}

/**
 * Get the default calendar ID for creating events.
 */
async function getDefaultCalendarId(): Promise<string | null> {
  try {
    if (Platform.OS === 'ios') {
      const defaultCalendar = await Calendar.getDefaultCalendarAsync();
      return defaultCalendar?.id ?? null;
    }

    // On Android, find the primary calendar or first available
    const calendars = await getCalendars();
    const primary = calendars.find((cal) => cal.isPrimary);
    return primary?.id ?? calendars[0]?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Calendar adapter implementation using expo-calendar.
 */
export const calendar: CalendarAdapter = {
  requestPermissions,
  hasPermissions,
  getCalendars,
  createEvent,
  updateEvent,
  deleteEvent,
  getDefaultCalendarId,
};
