/**
 * Tests for settings store
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import {
  useSettingsStore,
  DEFAULT_MAX_DISTANCE_KM,
  DEFAULT_MAX_TRAVEL_TIME_MINUTES,
  DEFAULT_ARRIVAL_BUFFER_MINUTES,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEMO_HOME_LOCATION,
  type UserLocation,
  type DepartureReminderBuffer,
} from './settings';

describe('useSettingsStore', () => {
  beforeEach(() => {
    useSettingsStore.getState().reset();
  });

  afterEach(() => {
    useSettingsStore.getState().reset();
  });

  describe('initial state', () => {
    it('should have correct default values', () => {
      const state = useSettingsStore.getState();

      expect(state.language).toBe('de');
      expect(state.homeLocation).toBeNull();
      expect(state.distanceFilter).toEqual({
        enabled: false,
        maxDistanceKm: DEFAULT_MAX_DISTANCE_KM,
      });
      expect(state.travelTimeFilter).toEqual({
        enabled: false,
        maxTravelTimeMinutes: DEFAULT_MAX_TRAVEL_TIME_MINUTES,
        arrivalBufferMinutes: DEFAULT_ARRIVAL_BUFFER_MINUTES,
      });
      expect(state.notificationSettings).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
      expect(state.biometricEnabled).toBe(false);
      expect(state.calendarSyncEnabled).toBe(false);
      expect(state.selectedCalendarId).toBeNull();
      expect(state.departureReminderEnabled).toBe(false);
      expect(state.departureReminderBufferMinutes).toBe(15);
    });
  });

  describe('setLanguage', () => {
    it('should update language', () => {
      act(() => {
        useSettingsStore.getState().setLanguage('en');
      });

      expect(useSettingsStore.getState().language).toBe('en');

      act(() => {
        useSettingsStore.getState().setLanguage('fr');
      });

      expect(useSettingsStore.getState().language).toBe('fr');

      act(() => {
        useSettingsStore.getState().setLanguage('it');
      });

      expect(useSettingsStore.getState().language).toBe('it');
    });
  });

  describe('setHomeLocation', () => {
    it('should set home location', () => {
      const location: UserLocation = {
        latitude: 47.3769,
        longitude: 8.5417,
        label: 'Zurich',
        source: 'geocoded',
      };

      act(() => {
        useSettingsStore.getState().setHomeLocation(location);
      });

      const state = useSettingsStore.getState();
      expect(state.homeLocation).toEqual(location);
    });

    it('should clear home location when set to null', () => {
      const location: UserLocation = {
        latitude: 47.3769,
        longitude: 8.5417,
        label: 'Zurich',
        source: 'geolocation',
      };

      act(() => {
        useSettingsStore.getState().setHomeLocation(location);
        useSettingsStore.getState().setHomeLocation(null);
      });

      expect(useSettingsStore.getState().homeLocation).toBeNull();
    });

    it('should support different location sources', () => {
      const locations: UserLocation[] = [
        { latitude: 1, longitude: 1, label: 'Test', source: 'geolocation' },
        { latitude: 2, longitude: 2, label: 'Test', source: 'geocoded' },
        { latitude: 3, longitude: 3, label: 'Test', source: 'manual' },
      ];

      for (const location of locations) {
        act(() => {
          useSettingsStore.getState().setHomeLocation(location);
        });
        expect(useSettingsStore.getState().homeLocation?.source).toBe(location.source);
      }
    });
  });

  describe('distance filter', () => {
    it('should enable distance filter', () => {
      act(() => {
        useSettingsStore.getState().setDistanceFilterEnabled(true);
      });

      expect(useSettingsStore.getState().distanceFilter.enabled).toBe(true);
    });

    it('should disable distance filter', () => {
      act(() => {
        useSettingsStore.getState().setDistanceFilterEnabled(true);
        useSettingsStore.getState().setDistanceFilterEnabled(false);
      });

      expect(useSettingsStore.getState().distanceFilter.enabled).toBe(false);
    });

    it('should update max distance', () => {
      act(() => {
        useSettingsStore.getState().setMaxDistanceKm(100);
      });

      expect(useSettingsStore.getState().distanceFilter.maxDistanceKm).toBe(100);
    });

    it('should preserve other filter settings when updating one', () => {
      act(() => {
        useSettingsStore.getState().setDistanceFilterEnabled(true);
        useSettingsStore.getState().setMaxDistanceKm(75);
      });

      const state = useSettingsStore.getState();
      expect(state.distanceFilter.enabled).toBe(true);
      expect(state.distanceFilter.maxDistanceKm).toBe(75);
    });
  });

  describe('travel time filter', () => {
    it('should enable travel time filter', () => {
      act(() => {
        useSettingsStore.getState().setTravelTimeFilterEnabled(true);
      });

      expect(useSettingsStore.getState().travelTimeFilter.enabled).toBe(true);
    });

    it('should update max travel time', () => {
      act(() => {
        useSettingsStore.getState().setMaxTravelTimeMinutes(90);
      });

      expect(useSettingsStore.getState().travelTimeFilter.maxTravelTimeMinutes).toBe(90);
    });

    it('should update arrival buffer', () => {
      act(() => {
        useSettingsStore.getState().setArrivalBufferMinutes(45);
      });

      expect(useSettingsStore.getState().travelTimeFilter.arrivalBufferMinutes).toBe(45);
    });

    it('should preserve other settings when updating one', () => {
      act(() => {
        useSettingsStore.getState().setTravelTimeFilterEnabled(true);
        useSettingsStore.getState().setMaxTravelTimeMinutes(60);
        useSettingsStore.getState().setArrivalBufferMinutes(20);
      });

      const state = useSettingsStore.getState();
      expect(state.travelTimeFilter.enabled).toBe(true);
      expect(state.travelTimeFilter.maxTravelTimeMinutes).toBe(60);
      expect(state.travelTimeFilter.arrivalBufferMinutes).toBe(20);
    });
  });

  describe('notification settings', () => {
    it('should enable notifications', () => {
      act(() => {
        useSettingsStore.getState().setNotificationsEnabled(true);
      });

      expect(useSettingsStore.getState().notificationSettings.enabled).toBe(true);
    });

    it('should set reminder times', () => {
      act(() => {
        useSettingsStore.getState().setNotificationReminderTimes(['1h', '2h', '1d']);
      });

      expect(useSettingsStore.getState().notificationSettings.reminderTimes).toEqual([
        '1h',
        '2h',
        '1d',
      ]);
    });

    it('should handle empty reminder times', () => {
      act(() => {
        useSettingsStore.getState().setNotificationReminderTimes([]);
      });

      expect(useSettingsStore.getState().notificationSettings.reminderTimes).toEqual([]);
    });
  });

  describe('mobile-specific settings', () => {
    it('should toggle biometric enabled', () => {
      act(() => {
        useSettingsStore.getState().setBiometricEnabled(true);
      });

      expect(useSettingsStore.getState().biometricEnabled).toBe(true);

      act(() => {
        useSettingsStore.getState().setBiometricEnabled(false);
      });

      expect(useSettingsStore.getState().biometricEnabled).toBe(false);
    });

    it('should toggle calendar sync', () => {
      act(() => {
        useSettingsStore.getState().setCalendarSyncEnabled(true);
      });

      expect(useSettingsStore.getState().calendarSyncEnabled).toBe(true);
    });

    it('should set selected calendar id', () => {
      act(() => {
        useSettingsStore.getState().setSelectedCalendarId('cal-123');
      });

      expect(useSettingsStore.getState().selectedCalendarId).toBe('cal-123');
    });

    it('should clear selected calendar id', () => {
      act(() => {
        useSettingsStore.getState().setSelectedCalendarId('cal-123');
        useSettingsStore.getState().setSelectedCalendarId(null);
      });

      expect(useSettingsStore.getState().selectedCalendarId).toBeNull();
    });

    it('should toggle departure reminder', () => {
      act(() => {
        useSettingsStore.getState().setDepartureReminderEnabled(true);
      });

      expect(useSettingsStore.getState().departureReminderEnabled).toBe(true);
    });

    it('should set departure reminder buffer', () => {
      const bufferValues: DepartureReminderBuffer[] = [5, 10, 15, 20, 30];

      for (const buffer of bufferValues) {
        act(() => {
          useSettingsStore.getState().setDepartureReminderBufferMinutes(buffer);
        });

        expect(useSettingsStore.getState().departureReminderBufferMinutes).toBe(buffer);
      }
    });
  });

  describe('reset', () => {
    it('should reset all settings to defaults', () => {
      // Change various settings
      act(() => {
        useSettingsStore.getState().setLanguage('fr');
        useSettingsStore.getState().setHomeLocation(DEMO_HOME_LOCATION);
        useSettingsStore.getState().setDistanceFilterEnabled(true);
        useSettingsStore.getState().setMaxDistanceKm(100);
        useSettingsStore.getState().setTravelTimeFilterEnabled(true);
        useSettingsStore.getState().setNotificationsEnabled(true);
        useSettingsStore.getState().setBiometricEnabled(true);
        useSettingsStore.getState().setCalendarSyncEnabled(true);
        useSettingsStore.getState().setSelectedCalendarId('cal-1');
        useSettingsStore.getState().setDepartureReminderEnabled(true);
        useSettingsStore.getState().setDepartureReminderBufferMinutes(30);
      });

      // Reset
      act(() => {
        useSettingsStore.getState().reset();
      });

      // Verify all back to defaults
      const state = useSettingsStore.getState();
      expect(state.language).toBe('de');
      expect(state.homeLocation).toBeNull();
      expect(state.distanceFilter.enabled).toBe(false);
      expect(state.distanceFilter.maxDistanceKm).toBe(DEFAULT_MAX_DISTANCE_KM);
      expect(state.travelTimeFilter.enabled).toBe(false);
      expect(state.notificationSettings.enabled).toBe(false);
      expect(state.biometricEnabled).toBe(false);
      expect(state.calendarSyncEnabled).toBe(false);
      expect(state.selectedCalendarId).toBeNull();
      expect(state.departureReminderEnabled).toBe(false);
      expect(state.departureReminderBufferMinutes).toBe(15);
    });
  });
});

describe('constants', () => {
  it('should have correct default values', () => {
    expect(DEFAULT_MAX_DISTANCE_KM).toBe(50);
    expect(DEFAULT_MAX_TRAVEL_TIME_MINUTES).toBe(120);
    expect(DEFAULT_ARRIVAL_BUFFER_MINUTES).toBe(30);
    expect(DEFAULT_NOTIFICATION_SETTINGS).toEqual({
      enabled: false,
      reminderTimes: ['1h'],
    });
  });

  it('should have correct demo home location', () => {
    expect(DEMO_HOME_LOCATION).toEqual({
      latitude: 46.949,
      longitude: 7.4474,
      label: 'Bern',
      source: 'geocoded',
    });
  });
});
