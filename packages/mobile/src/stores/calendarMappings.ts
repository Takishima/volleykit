/**
 * Calendar mappings store
 *
 * Stores the mapping between VolleyKit assignment IDs and device calendar event IDs.
 * Uses AsyncStorage for persistence.
 */

import type { CalendarEventMapping } from '../types/calendar';

/** Storage key for calendar mappings */
const CALENDAR_MAPPINGS_KEY = 'calendar_event_mappings';

/** Storage adapter interface */
interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Calendar mappings store operations.
 */
export interface CalendarMappingsStore {
  /** Get all calendar event mappings */
  getMappings(storage: StorageAdapter): Promise<CalendarEventMapping[]>;
  /** Get mapping for a specific assignment */
  getMapping(
    storage: StorageAdapter,
    assignmentId: string
  ): Promise<CalendarEventMapping | null>;
  /** Add or update a mapping */
  setMapping(
    storage: StorageAdapter,
    mapping: CalendarEventMapping
  ): Promise<void>;
  /** Remove a mapping by assignment ID */
  removeMapping(storage: StorageAdapter, assignmentId: string): Promise<void>;
  /** Remove all mappings */
  clearMappings(storage: StorageAdapter): Promise<void>;
  /** Get mappings by calendar ID */
  getMappingsByCalendar(
    storage: StorageAdapter,
    calendarId: string
  ): Promise<CalendarEventMapping[]>;
}

/**
 * Load mappings from storage.
 */
async function loadMappings(
  storage: StorageAdapter
): Promise<CalendarEventMapping[]> {
  try {
    const data = await storage.getItem(CALENDAR_MAPPINGS_KEY);
    if (!data) return [];
    return JSON.parse(data) as CalendarEventMapping[];
  } catch {
    return [];
  }
}

/**
 * Save mappings to storage.
 */
async function saveMappings(
  storage: StorageAdapter,
  mappings: CalendarEventMapping[]
): Promise<void> {
  await storage.setItem(CALENDAR_MAPPINGS_KEY, JSON.stringify(mappings));
}

/**
 * Calendar mappings store implementation.
 */
export const calendarMappingsStore: CalendarMappingsStore = {
  async getMappings(storage) {
    return loadMappings(storage);
  },

  async getMapping(storage, assignmentId) {
    const mappings = await loadMappings(storage);
    return mappings.find((m) => m.assignmentId === assignmentId) ?? null;
  },

  async setMapping(storage, mapping) {
    const mappings = await loadMappings(storage);
    const index = mappings.findIndex(
      (m) => m.assignmentId === mapping.assignmentId
    );

    if (index >= 0) {
      mappings[index] = { ...mapping, lastUpdatedAt: new Date().toISOString() };
    } else {
      mappings.push({
        ...mapping,
        createdAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      });
    }

    await saveMappings(storage, mappings);
  },

  async removeMapping(storage, assignmentId) {
    const mappings = await loadMappings(storage);
    const filtered = mappings.filter((m) => m.assignmentId !== assignmentId);
    await saveMappings(storage, filtered);
  },

  async clearMappings(storage) {
    await storage.removeItem(CALENDAR_MAPPINGS_KEY);
  },

  async getMappingsByCalendar(storage, calendarId) {
    const mappings = await loadMappings(storage);
    return mappings.filter((m) => m.calendarId === calendarId);
  },
};
