/**
 * Departure Reminder Settings store
 *
 * Manages user preferences for the Smart Departure Reminder feature.
 */

import { DEFAULT_DEPARTURE_REMINDER_SETTINGS } from '../types/departureReminder';

import type {
  DepartureReminderSettings,
  BufferTimeOption,
} from '../types/departureReminder';

/** Storage key for departure reminder settings */
const SETTINGS_KEY = 'departure_reminder_settings';

/** Storage adapter interface */
interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Departure reminder settings store operations.
 */
export interface DepartureReminderSettingsStore {
  /** Load settings from storage */
  loadSettings(storage: StorageAdapter): Promise<DepartureReminderSettings>;
  /** Save settings to storage */
  saveSettings(
    storage: StorageAdapter,
    settings: DepartureReminderSettings
  ): Promise<void>;
  /** Enable the feature */
  enable(storage: StorageAdapter): Promise<DepartureReminderSettings>;
  /** Disable the feature */
  disable(storage: StorageAdapter): Promise<DepartureReminderSettings>;
  /** Set buffer time */
  setBufferTime(
    storage: StorageAdapter,
    minutes: BufferTimeOption
  ): Promise<DepartureReminderSettings>;
  /** Reset to defaults */
  reset(storage: StorageAdapter): Promise<DepartureReminderSettings>;
}

/**
 * Load settings from storage.
 */
async function loadSettings(
  storage: StorageAdapter
): Promise<DepartureReminderSettings> {
  try {
    const data = await storage.getItem(SETTINGS_KEY);
    if (!data) return { ...DEFAULT_DEPARTURE_REMINDER_SETTINGS };
    return {
      ...DEFAULT_DEPARTURE_REMINDER_SETTINGS,
      ...(JSON.parse(data) as Partial<DepartureReminderSettings>),
    };
  } catch {
    return { ...DEFAULT_DEPARTURE_REMINDER_SETTINGS };
  }
}

/**
 * Save settings to storage.
 */
async function saveSettings(
  storage: StorageAdapter,
  settings: DepartureReminderSettings
): Promise<void> {
  await storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/**
 * Enable the feature.
 */
async function enable(
  storage: StorageAdapter
): Promise<DepartureReminderSettings> {
  const settings = await loadSettings(storage);
  const updated = { ...settings, enabled: true };
  await saveSettings(storage, updated);
  return updated;
}

/**
 * Disable the feature.
 */
async function disable(
  storage: StorageAdapter
): Promise<DepartureReminderSettings> {
  const settings = await loadSettings(storage);
  const updated = { ...settings, enabled: false };
  await saveSettings(storage, updated);
  return updated;
}

/**
 * Set buffer time.
 */
async function setBufferTime(
  storage: StorageAdapter,
  minutes: BufferTimeOption
): Promise<DepartureReminderSettings> {
  const settings = await loadSettings(storage);
  const updated = { ...settings, bufferMinutes: minutes };
  await saveSettings(storage, updated);
  return updated;
}

/**
 * Reset to defaults.
 */
async function reset(
  storage: StorageAdapter
): Promise<DepartureReminderSettings> {
  const defaults = { ...DEFAULT_DEPARTURE_REMINDER_SETTINGS };
  await saveSettings(storage, defaults);
  return defaults;
}

/**
 * Departure reminder settings store implementation.
 */
export const departureReminderSettingsStore: DepartureReminderSettingsStore = {
  loadSettings,
  saveSettings,
  enable,
  disable,
  setBufferTime,
  reset,
};
