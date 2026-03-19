/**
 * Calendar Settings Screen
 *
 * Allows users to configure calendar integration:
 * - iCal subscription (opens native calendar app)
 * - Direct calendar sync (adds events to selected calendar)
 */

import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'

import { Feather } from '@expo/vector-icons'

import { useTranslation } from '@volleykit/shared/i18n'

import { CalendarPicker } from '../components/CalendarPicker'
import { COLORS, SETTINGS_ICON_SIZE } from '../constants'
import { useCalendarSettings } from '../hooks/useCalendarSettings'

import type { RootStackScreenProps } from '../navigation/types'

type Props = RootStackScreenProps<'CalendarSettings'>

export function CalendarSettingsScreen(_props: Props) {
  const { t } = useTranslation()
  const {
    settings,
    calendars,
    isLoading,
    isSyncing,
    showCalendarPicker,
    selectedCalendar,
    setShowCalendarPicker,
    handleModeSelect,
    handleIcalSubscribe,
    handleCalendarSelect,
    handleSyncNow,
  } = useCalendarSettings()

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Description */}
      <View className="px-4 py-4">
        <Text className="text-gray-600">{t('settings.calendar.description')}</Text>
      </View>

      {/* Sync Mode Selection */}
      <View className="mt-2">
        <Text className="text-sm font-medium text-gray-500 px-4 mb-2 uppercase">
          {t('settings.calendar.mode')}
        </Text>
        <View className="bg-white border-y border-gray-200">
          {/* iCal Option */}
          <TouchableOpacity
            className="flex-row items-center py-4 px-4"
            onPress={() => handleModeSelect('ical')}
            accessibilityRole="radio"
            accessibilityState={{ checked: settings.syncMode === 'ical' }}
            accessibilityLabel={t('settings.calendar.modeIcal')}
          >
            <View className="mr-4">
              <Feather name="link" size={SETTINGS_ICON_SIZE} color={COLORS.gray500} />
            </View>
            <View className="flex-1">
              <Text className="text-gray-900 text-base font-medium">
                {t('settings.calendar.modeIcal')}
              </Text>
              <Text className="text-gray-500 text-sm mt-1">
                {t('settings.calendar.icalDescription')}
              </Text>
            </View>
            <View
              className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                settings.syncMode === 'ical' ? 'border-sky-500 bg-sky-500' : 'border-gray-300'
              }`}
            >
              {settings.syncMode === 'ical' && <Feather name="check" size={14} color="white" />}
            </View>
          </TouchableOpacity>

          <View className="h-px bg-gray-200 ml-14" />

          {/* Direct Sync Option */}
          <TouchableOpacity
            className="flex-row items-center py-4 px-4"
            onPress={() => handleModeSelect('direct')}
            accessibilityRole="radio"
            accessibilityState={{ checked: settings.syncMode === 'direct' }}
            accessibilityLabel={t('settings.calendar.modeDirect')}
          >
            <View className="mr-4">
              <Feather name="calendar" size={SETTINGS_ICON_SIZE} color={COLORS.gray500} />
            </View>
            <View className="flex-1">
              <Text className="text-gray-900 text-base font-medium">
                {t('settings.calendar.modeDirect')}
              </Text>
              <Text className="text-gray-500 text-sm mt-1">
                {t('settings.calendar.directDescription')}
              </Text>
            </View>
            <View
              className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                settings.syncMode === 'direct' ? 'border-sky-500 bg-sky-500' : 'border-gray-300'
              }`}
            >
              {settings.syncMode === 'direct' && <Feather name="check" size={14} color="white" />}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* iCal Subscribe Button */}
      {settings.syncMode === 'ical' && (
        <View className="mt-6 px-4">
          <TouchableOpacity
            className="bg-sky-500 rounded-lg py-4"
            onPress={handleIcalSubscribe}
            accessibilityRole="button"
            accessibilityLabel={t('settings.calendar.subscribeIcal')}
          >
            <Text className="text-white text-center font-semibold text-base">
              {t('settings.calendar.subscribeIcal')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Direct Sync Settings */}
      {settings.syncMode === 'direct' && (
        <>
          {/* Calendar Selection */}
          <View className="mt-6">
            <Text className="text-sm font-medium text-gray-500 px-4 mb-2 uppercase">
              {t('settings.calendar.selectCalendar')}
            </Text>
            <TouchableOpacity
              className="flex-row items-center py-4 px-4 bg-white border-y border-gray-200"
              onPress={() => setShowCalendarPicker(true)}
              accessibilityRole="button"
              accessibilityLabel={t('settings.calendar.selectCalendar')}
            >
              <View className="mr-4">
                {selectedCalendar ? (
                  <View
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: selectedCalendar.color }}
                  />
                ) : (
                  <Feather name="calendar" size={SETTINGS_ICON_SIZE} color={COLORS.gray500} />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 text-base">
                  {selectedCalendar?.title ?? t('settings.calendar.selectCalendar')}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={COLORS.gray400} />
            </TouchableOpacity>
          </View>

          {/* Sync Button */}
          <View className="mt-6 px-4">
            <TouchableOpacity
              className={`rounded-lg py-4 ${
                settings.selectedCalendarId ? 'bg-sky-500' : 'bg-gray-300'
              }`}
              onPress={handleSyncNow}
              disabled={!settings.selectedCalendarId || isSyncing}
              accessibilityRole="button"
              accessibilityLabel={t('settings.calendar.syncNow')}
              accessibilityState={{ disabled: !settings.selectedCalendarId || isSyncing }}
            >
              {isSyncing ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center font-semibold text-base">
                  {t('settings.calendar.syncNow')}
                </Text>
              )}
            </TouchableOpacity>

            {settings.lastSyncAt && (
              <Text className="text-gray-500 text-center text-sm mt-2">
                {t('settings.calendar.lastSync', {
                  date: new Date(settings.lastSyncAt).toLocaleString(),
                })}
              </Text>
            )}
          </View>
        </>
      )}

      {/* Calendar Picker Modal */}
      <CalendarPicker
        visible={showCalendarPicker}
        calendars={calendars}
        selectedCalendarId={settings.selectedCalendarId}
        onSelect={handleCalendarSelect}
        onClose={() => setShowCalendarPicker(false)}
      />
    </ScrollView>
  )
}
