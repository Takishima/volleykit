/**
 * Departure Reminder Settings Screen
 *
 * Allows users to configure smart departure reminders with location-based
 * notifications and buffer time preferences.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useTranslation } from '@volleykit/shared/i18n';
import { useStorage } from '@volleykit/shared/adapters';

import { location } from '../platform/location';
import { notifications } from '../platform/notifications';
import { departureReminderSettingsStore } from '../stores/departureReminderSettings';
import { COLORS, SETTINGS_ICON_SIZE } from '../constants';
import type {
  DepartureReminderSettings,
  BufferTimeOption,
} from '../types/departureReminder';
import {
  DEFAULT_DEPARTURE_REMINDER_SETTINGS,
  BUFFER_TIME_OPTIONS,
} from '../types/departureReminder';
import type { RootStackScreenProps } from '../navigation/types';

type Props = RootStackScreenProps<'DepartureReminderSettings'>;

export function DepartureReminderSettingsScreen(_props: Props) {
  const { t } = useTranslation();
  const { storage } = useStorage();

  const [settings, setSettings] = useState<DepartureReminderSettings>(
    DEFAULT_DEPARTURE_REMINDER_SETTINGS
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);

  // Load settings on mount
  useEffect(() => {
    async function loadData() {
      try {
        const loadedSettings = await departureReminderSettingsStore.loadSettings(
          storage
        );
        setSettings(loadedSettings);
      } catch {
        // Use defaults
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [storage]);

  // Request permissions when enabling
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    setIsRequestingPermissions(true);

    try {
      // Request foreground location
      const foreground = await location.requestForegroundPermissions();
      if (foreground !== 'granted') {
        Alert.alert(t('common.error'), t('settings.departure.permissionDenied'), [
          { text: t('common.close') },
        ]);
        return false;
      }

      // Request background location
      const background = await location.requestBackgroundPermissions();
      if (background !== 'granted') {
        Alert.alert(
          t('common.error'),
          t('settings.departure.backgroundLocationRequired'),
          [{ text: t('common.close') }]
        );
        return false;
      }

      // Request notification permission
      const notificationGranted = await notifications.requestPermissions();
      if (!notificationGranted) {
        Alert.alert(t('common.error'), t('settings.departure.notificationRequired'), [
          { text: t('common.close') },
        ]);
        return false;
      }

      return true;
    } finally {
      setIsRequestingPermissions(false);
    }
  }, [t]);

  // Handle enable toggle
  const handleToggle = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        // Check permissions first
        const hasPermissions =
          (await location.hasBackgroundPermissions()) &&
          (await notifications.hasPermissions());

        if (!hasPermissions) {
          const granted = await requestPermissions();
          if (!granted) return;
        }

        const updated = await departureReminderSettingsStore.enable(storage);
        setSettings(updated);

        // Start background tracking
        try {
          await location.startBackgroundTracking();
        } catch {
          // Ignore errors, tracking will start on next app launch
        }
      } else {
        const updated = await departureReminderSettingsStore.disable(storage);
        setSettings(updated);

        // Stop background tracking
        try {
          await location.stopBackgroundTracking();
        } catch {
          // Ignore errors
        }
      }
    },
    [storage, requestPermissions]
  );

  // Handle buffer time selection
  const handleBufferTimeSelect = useCallback(
    async (minutes: BufferTimeOption) => {
      const updated = await departureReminderSettingsStore.setBufferTime(
        storage,
        minutes
      );
      setSettings(updated);
    },
    [storage]
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Description */}
      <View className="px-4 py-4">
        <Text className="text-gray-600">{t('settings.departure.description')}</Text>
      </View>

      {/* Enable Toggle */}
      <View className="mt-2">
        <View className="bg-white border-y border-gray-200">
          <View className="flex-row items-center py-4 px-4">
            <View className="mr-4">
              <Feather
                name="bell"
                size={SETTINGS_ICON_SIZE}
                color={COLORS.gray500}
              />
            </View>
            <View className="flex-1">
              <Text className="text-gray-900 text-base font-medium">
                {settings.enabled
                  ? t('settings.departure.disable')
                  : t('settings.departure.enable')}
              </Text>
              <Text className="text-gray-500 text-sm mt-1">
                {settings.enabled
                  ? t('settings.calendar.enabled')
                  : t('settings.calendar.disabled')}
              </Text>
            </View>
            {isRequestingPermissions ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Switch
                value={settings.enabled}
                onValueChange={handleToggle}
                trackColor={{ false: COLORS.gray200, true: COLORS.primary }}
                accessibilityRole="switch"
                accessibilityLabel={t('settings.departure.title')}
                accessibilityState={{ checked: settings.enabled }}
              />
            )}
          </View>
        </View>
      </View>

      {/* Buffer Time Selection (only shown when enabled) */}
      {settings.enabled && (
        <View className="mt-6">
          <Text className="text-sm font-medium text-gray-500 px-4 mb-2 uppercase">
            {t('settings.departure.bufferTime')}
          </Text>
          <Text className="text-gray-600 px-4 mb-4">
            {t('settings.departure.bufferTimeDescription')}
          </Text>
          <View className="bg-white border-y border-gray-200">
            {BUFFER_TIME_OPTIONS.map((minutes, index) => (
              <View key={minutes}>
                <TouchableOpacity
                  className="flex-row items-center py-4 px-4"
                  onPress={() => handleBufferTimeSelect(minutes)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: settings.bufferMinutes === minutes }}
                  accessibilityLabel={`${minutes} minutes`}
                >
                  <View className="flex-1">
                    <Text className="text-gray-900 text-base">
                      {minutes} {t('common.minutesUnit')}
                    </Text>
                  </View>
                  <View
                    className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                      settings.bufferMinutes === minutes
                        ? 'border-sky-500 bg-sky-500'
                        : 'border-gray-300'
                    }`}
                  >
                    {settings.bufferMinutes === minutes && (
                      <Feather name="check" size={14} color="white" />
                    )}
                  </View>
                </TouchableOpacity>
                {index < BUFFER_TIME_OPTIONS.length - 1 && (
                  <View className="h-px bg-gray-200 ml-4" />
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* How it works */}
      <View className="mt-6 px-4 mb-8">
        <Text className="text-sm font-medium text-gray-500 mb-2 uppercase">
          {t('settings.departure.howItWorks')}
        </Text>
        <View className="bg-white rounded-lg p-4 border border-gray-200">
          <View className="flex-row items-start mb-3">
            <Feather name="map-pin" size={16} color={COLORS.gray500} />
            <Text className="text-gray-600 ml-2 flex-1">
              {t('settings.departure.howItWorksLocation')}
            </Text>
          </View>
          <View className="flex-row items-start mb-3">
            <Feather name="navigation" size={16} color={COLORS.gray500} />
            <Text className="text-gray-600 ml-2 flex-1">
              {t('settings.departure.howItWorksRoutes')}
            </Text>
          </View>
          <View className="flex-row items-start">
            <Feather name="bell" size={16} color={COLORS.gray500} />
            <Text className="text-gray-600 ml-2 flex-1">
              {t('settings.departure.howItWorksNotification')}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
