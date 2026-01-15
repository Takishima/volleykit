/**
 * Calendar sync service
 *
 * Handles synchronization of assignments to device calendar.
 */

import type { Assignment } from '@volleykit/shared/api';
import { calendar, type CalendarAdapter } from '../platform/calendar';
import { calendarMappingsStore, type CalendarMappingsStore } from '../stores/calendarMappings';
import type { CalendarEventMapping, CalendarEventData } from '../types/calendar';
import {
  generateAssignmentDeepLink,
  formatCalendarNotes,
  calculateMatchEndTime,
  getDefaultReminders,
} from '../utils/calendar';

/** Storage adapter interface */
interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Calendar sync service interface.
 */
export interface CalendarSyncService {
  /** Create calendar events from assignments */
  createEventsFromAssignments(
    storage: StorageAdapter,
    calendarId: string,
    assignments: Assignment[]
  ): Promise<CalendarEventMapping[]>;

  /** Update existing calendar events */
  updateEvents(
    storage: StorageAdapter,
    assignments: Assignment[]
  ): Promise<void>;

  /** Delete orphaned events (events without corresponding assignments) */
  deleteOrphanedEvents(
    storage: StorageAdapter,
    currentAssignmentIds: string[]
  ): Promise<void>;

  /** Sync all assignments to calendar */
  syncAll(
    storage: StorageAdapter,
    calendarId: string,
    assignments: Assignment[]
  ): Promise<{ created: number; updated: number; deleted: number }>;
}

/**
 * Convert an assignment to calendar event data.
 */
function assignmentToEventData(assignment: Assignment): CalendarEventData {
  const startDate = parseAssignmentDateTime(assignment);
  const endDate = calculateMatchEndTime(startDate);

  // Get venue info - handle both object and string formats
  const venue = typeof assignment.venue === 'string'
    ? assignment.venue
    : assignment.venue?.name ?? 'TBD';

  const location = typeof assignment.venue === 'object' && assignment.venue?.address
    ? `${venue}, ${assignment.venue.address}`
    : venue;

  // Get team names - handle both object and string formats
  const teamHome = typeof assignment.teamHome === 'string'
    ? assignment.teamHome
    : assignment.teamHome?.name ?? '';
  const teamAway = typeof assignment.teamAway === 'string'
    ? assignment.teamAway
    : assignment.teamAway?.name ?? '';

  // Build event title
  const title = teamHome && teamAway
    ? `${teamHome} vs ${teamAway}`
    : `Volleyball Assignment`;

  return {
    title,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    location,
    notes: formatCalendarNotes({
      id: assignment.__identity,
      league: assignment.league,
      role: assignment.role,
      teamHome,
      teamAway,
    }),
    url: generateAssignmentDeepLink(assignment.__identity),
    timeZone: 'Europe/Zurich',
    alarms: getDefaultReminders(),
  };
}

/**
 * Parse assignment date and time into a Date object.
 */
function parseAssignmentDateTime(assignment: Assignment): Date {
  const dateStr = assignment.gameDate;
  const timeStr = assignment.gameTime ?? '00:00';

  // Parse date (format: YYYY-MM-DD or similar)
  const date = new Date(dateStr);

  // Parse time (format: HH:mm)
  const [hours, minutes] = timeStr.split(':').map(Number);
  date.setHours(hours || 0, minutes || 0, 0, 0);

  return date;
}

/**
 * Calendar sync service implementation.
 */
export const calendarSyncService: CalendarSyncService = {
  async createEventsFromAssignments(
    storage: StorageAdapter,
    calendarId: string,
    assignments: Assignment[]
  ): Promise<CalendarEventMapping[]> {
    const createdMappings: CalendarEventMapping[] = [];

    for (const assignment of assignments) {
      // Check if event already exists
      const existingMapping = await calendarMappingsStore.getMapping(
        storage,
        assignment.__identity
      );

      if (existingMapping) {
        continue; // Skip if already mapped
      }

      try {
        const eventData = assignmentToEventData(assignment);
        const eventId = await calendar.createEvent(calendarId, eventData);

        const mapping: CalendarEventMapping = {
          assignmentId: assignment.__identity,
          calendarEventId: eventId,
          calendarId,
          createdAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString(),
        };

        await calendarMappingsStore.setMapping(storage, mapping);
        createdMappings.push(mapping);
      } catch {
        // Skip failed events, continue with others
        console.warn(`Failed to create event for assignment ${assignment.__identity}`);
      }
    }

    return createdMappings;
  },

  async updateEvents(
    storage: StorageAdapter,
    assignments: Assignment[]
  ): Promise<void> {
    for (const assignment of assignments) {
      const mapping = await calendarMappingsStore.getMapping(
        storage,
        assignment.__identity
      );

      if (!mapping) {
        continue; // No mapping, nothing to update
      }

      try {
        const eventData = assignmentToEventData(assignment);
        await calendar.updateEvent(mapping.calendarEventId, eventData);

        // Update the mapping timestamp
        await calendarMappingsStore.setMapping(storage, {
          ...mapping,
          lastUpdatedAt: new Date().toISOString(),
        });
      } catch {
        // Event may have been deleted by user, remove mapping
        await calendarMappingsStore.removeMapping(storage, assignment.__identity);
      }
    }
  },

  async deleteOrphanedEvents(
    storage: StorageAdapter,
    currentAssignmentIds: string[]
  ): Promise<void> {
    const allMappings = await calendarMappingsStore.getMappings(storage);
    const currentIdSet = new Set(currentAssignmentIds);

    for (const mapping of allMappings) {
      if (!currentIdSet.has(mapping.assignmentId)) {
        try {
          await calendar.deleteEvent(mapping.calendarEventId);
        } catch {
          // Event may already be deleted, ignore error
        }
        await calendarMappingsStore.removeMapping(storage, mapping.assignmentId);
      }
    }
  },

  async syncAll(
    storage: StorageAdapter,
    calendarId: string,
    assignments: Assignment[]
  ): Promise<{ created: number; updated: number; deleted: number }> {
    const currentAssignmentIds = assignments.map((a) => a.__identity);

    // First, delete orphaned events
    const mappingsBefore = await calendarMappingsStore.getMappings(storage);
    await this.deleteOrphanedEvents(storage, currentAssignmentIds);
    const mappingsAfterDelete = await calendarMappingsStore.getMappings(storage);
    const deleted = mappingsBefore.length - mappingsAfterDelete.length;

    // Then, update existing events
    const existingAssignmentIds = new Set(
      mappingsAfterDelete.map((m) => m.assignmentId)
    );
    const assignmentsToUpdate = assignments.filter((a) =>
      existingAssignmentIds.has(a.__identity)
    );
    await this.updateEvents(storage, assignmentsToUpdate);
    const updated = assignmentsToUpdate.length;

    // Finally, create new events
    const assignmentsToCreate = assignments.filter(
      (a) => !existingAssignmentIds.has(a.__identity)
    );
    const created = await this.createEventsFromAssignments(
      storage,
      calendarId,
      assignmentsToCreate
    );

    return {
      created: created.length,
      updated,
      deleted,
    };
  },
};
