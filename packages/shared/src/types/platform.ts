/**
 * Platform adapter interfaces
 *
 * These interfaces define the contract for platform-specific implementations.
 * Web and mobile platforms provide their own implementations.
 */

/**
 * Storage adapter for key-value persistence
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Secure storage adapter for credential storage
 * Uses Keychain on iOS and Keystore on Android
 */
export interface SecureStorageAdapter {
  setCredentials(username: string, password: string): Promise<void>;
  getCredentials(): Promise<{ username: string; password: string } | null>;
  clearCredentials(): Promise<void>;
  hasCredentials(): Promise<boolean>;
}

/**
 * Biometric authentication adapter
 */
export interface BiometricAdapter {
  isAvailable(): Promise<boolean>;
  authenticate(promptMessage: string): Promise<boolean>;
  getBiometricType(): Promise<'faceId' | 'touchId' | 'fingerprint' | null>;
}

/**
 * Location tracking adapter (Mobile only)
 */
export interface LocationAdapter {
  requestPermissions(): Promise<'granted' | 'denied' | 'restricted'>;
  getCurrentLocation(): Promise<{ lat: number; lng: number } | null>;
  startBackgroundTracking(taskName: string): Promise<void>;
  stopBackgroundTracking(): Promise<void>;
  isTrackingActive(): Promise<boolean>;
}

/**
 * Local notification adapter (Mobile only)
 */
export interface NotificationAdapter {
  requestPermissions(): Promise<boolean>;
  scheduleNotification(options: {
    title: string;
    body: string;
    triggerAt: Date;
    data?: Record<string, unknown>;
  }): Promise<string>; // Returns notification ID
  cancelNotification(id: string): Promise<void>;
  cancelAllNotifications(): Promise<void>;
}

/**
 * Calendar integration adapter (Mobile only)
 */
export interface CalendarAdapter {
  requestPermissions(): Promise<boolean>;
  getCalendars(): Promise<Array<{ id: string; name: string; color?: string }>>;
  createEvent(calendarId: string, event: CalendarEvent): Promise<string>; // Returns event ID
  updateEvent(eventId: string, event: CalendarEvent): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;
}

export interface CalendarEvent {
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  notes?: string;
  url?: string;
}
