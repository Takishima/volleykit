/**
 * Settings store - Platform-agnostic user preferences
 *
 * Note: No persist middleware - platform adapters handle storage
 */

import { create } from 'zustand';

export type Language = 'de' | 'en' | 'fr' | 'it';
export type DepartureReminderBuffer = 5 | 10 | 15 | 20 | 30;

export interface SettingsState {
  language: Language;
  // Mobile-only settings (optional on web)
  biometricEnabled: boolean;
  calendarSyncEnabled: boolean;
  selectedCalendarId: string | null;
  homeLocation: { lat: number; lng: number } | null;
  // Smart Departure Reminder settings (Mobile only)
  departureReminderEnabled: boolean;
  departureReminderBufferMinutes: DepartureReminderBuffer;
  // Actions
  setLanguage: (language: Language) => void;
  setBiometricEnabled: (enabled: boolean) => void;
  setCalendarSyncEnabled: (enabled: boolean) => void;
  setSelectedCalendarId: (id: string | null) => void;
  setHomeLocation: (location: { lat: number; lng: number } | null) => void;
  setDepartureReminderEnabled: (enabled: boolean) => void;
  setDepartureReminderBufferMinutes: (minutes: DepartureReminderBuffer) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  language: 'de',
  biometricEnabled: false,
  calendarSyncEnabled: false,
  selectedCalendarId: null,
  homeLocation: null,
  departureReminderEnabled: false,
  departureReminderBufferMinutes: 15,

  setLanguage: (language) => set({ language }),
  setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),
  setCalendarSyncEnabled: (calendarSyncEnabled) => set({ calendarSyncEnabled }),
  setSelectedCalendarId: (selectedCalendarId) => set({ selectedCalendarId }),
  setHomeLocation: (homeLocation) => set({ homeLocation }),
  setDepartureReminderEnabled: (departureReminderEnabled) =>
    set({ departureReminderEnabled }),
  setDepartureReminderBufferMinutes: (departureReminderBufferMinutes) =>
    set({ departureReminderBufferMinutes }),
}));
