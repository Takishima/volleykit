/**
 * Calendar Settings Screen
 *
 * Allows users to configure calendar integration:
 * - iCal subscription (opens native calendar app)
 * - Direct calendar sync (adds events to selected calendar)
 */

import { useState, useEffect, useCallback } from 'react'

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native'

import { Feather } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'

import { useStorage } from '@volleykit/shared/adapters'
import { queryKeys, type Assignment } from '@volleykit/shared/api'
import { useTranslation } from '@volleykit/shared/i18n'
import { useAuthStore } from '@volleykit/shared/stores'

import { CalendarPicker } from '../components/CalendarPicker'
import { COLORS, SETTINGS_ICON_SIZE, CALENDAR_SETTINGS_KEY } from '../constants'
import { useCalendarSync } from '../hooks'
import { calendar } from '../platform/calendar'

import type { RootStackScreenProps } from '../navigation/types'
import type { CalendarInfo, CalendarSyncMode, CalendarSettings } from '../types/calendar'

type Props = RootStackScreenProps<'CalendarSettings'>

/** API base URL for iCal subscriptions */
const ICAL_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://volleymanager.volleyball.ch'

/**
 * Construct the iCal URL for a given calendar code.
 * Uses webcal:// protocol for native calendar app integration.
 */
function getIcalUrl(calendarCode: string): string {
  // Convert https:// to webcal:// for native calendar integration
  const webcalBase = ICAL_BASE_URL.replace(/^https?:\/\//, 'webcal://')
  return `${webcalBase}/iCal/referee/${calendarCode}`
}

/** Default calendar settings */
const DEFAULT_SETTINGS: CalendarSettings = {
  enabled: false,
  syncMode: 'none',
  selectedCalendarId: null,
  lastSyncAt: null,
}

export function CalendarSettingsScreen(_props: Props) {
  const { t } = useTranslation()
  const { storage } = useStorage()
  const queryClient = useQueryClient()
  const { syncAssignments, isSyncing } = useCalendarSync()
  const calendarCode = useAuthStore((state) => state.calendarCode)

  const [settings, setSettings] = useState<CalendarSettings>(DEFAULT_SETTINGS)
  const [calendars, setCalendars] = useState<CalendarInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCalendarPicker, setShowCalendarPicker] = useState(false)

  // Load settings and calendars on mount
  useEffect(() => {
    async function loadData() {
      try {
        // Load saved settings
        const savedSettings = await storage.getItem(CALENDAR_SETTINGS_KEY)
        if (savedSettings) {
          setSettings(JSON.parse(savedSettings) as CalendarSettings)
        }

        // Check calendar permissions and load calendars
        const hasPermission = await calendar.hasPermissions()
        if (hasPermission) {
          const cals = await calendar.getCalendars()
          setCalendars(cals)
        }
      } catch {
        // Ignore errors, use defaults
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [storage])

  // Save settings when they change
  const saveSettings = useCallback(
    async (newSettings: CalendarSettings) => {
      setSettings(newSettings)
      await storage.setItem(CALENDAR_SETTINGS_KEY, JSON.stringify(newSettings))
    },
    [storage]
  )

  // Request calendar permissions
  const requestPermissions = useCallback(async () => {
    const granted = await calendar.requestPermissions()
    if (granted) {
      const cals = await calendar.getCalendars()
      setCalendars(cals)
      return true
    } else {
      Alert.alert(t('common.error'), t('settings.calendar.permissionDenied'), [
        { text: t('common.close') },
      ])
      return false
    }
  }, [t])

  // Handle sync mode selection
  const handleModeSelect = useCallback(
    async (mode: CalendarSyncMode) => {
      if (mode === 'direct') {
        // Request permissions for direct sync
        const hasPermission = await calendar.hasPermissions()
        if (!hasPermission) {
          const granted = await requestPermissions()
          if (!granted) return
        }

        // Check if we have calendars
        if (calendars.length === 0) {
          const cals = await calendar.getCalendars()
          setCalendars(cals)
          if (cals.length === 0) {
            Alert.alert(t('common.error'), t('settings.calendar.noCalendars'), [
              { text: t('common.close') },
            ])
            return
          }
        }
      }

      await saveSettings({
        ...settings,
        enabled: mode !== 'none',
        syncMode: mode,
      })
    },
    [settings, saveSettings, calendars, requestPermissions, t]
  )

  // Handle iCal subscription
  const handleIcalSubscribe = useCallback(async () => {
    if (!calendarCode) {
      Alert.alert(t('common.error'), t('settings.calendar.noCalendarCode'), [
        { text: t('common.close') },
      ])
      return
    }

    const icalUrl = getIcalUrl(calendarCode)

    try {
      const canOpen = await Linking.canOpenURL(icalUrl)
      if (canOpen) {
        await Linking.openURL(icalUrl)
      } else {
        // Try HTTPS version as fallback
        const httpsUrl = icalUrl.replace('webcal://', 'https://')
        await Linking.openURL(httpsUrl)
      }
    } catch {
      Alert.alert(t('common.error'), t('settings.calendar.syncError'), [
        { text: t('common.close') },
      ])
    }
  }, [t, calendarCode])

  // Handle calendar selection
  const handleCalendarSelect = useCallback(
    async (calendarId: string) => {
      setShowCalendarPicker(false)
      await saveSettings({
        ...settings,
        selectedCalendarId: calendarId,
      })
    },
    [settings, saveSettings]
  )

  // Handle direct sync
  const handleSyncNow = useCallback(async () => {
    if (!settings.selectedCalendarId) {
      Alert.alert(t('common.error'), t('settings.calendar.selectCalendar'), [
        { text: t('common.close') },
      ])
      return
    }

    // Get cached assignments from query client
    const cachedAssignments = queryClient.getQueryData<Assignment[]>(queryKeys.assignments.all)

    if (!cachedAssignments || cachedAssignments.length === 0) {
      Alert.alert(t('common.error'), t('settings.calendar.noAssignmentsToSync'), [
        { text: t('common.close') },
      ])
      return
    }

    try {
      const result = await syncAssignments(cachedAssignments)

      await saveSettings({
        ...settings,
        lastSyncAt: new Date().toISOString(),
      })

      Alert.alert(
        t('settings.calendar.syncSuccess'),
        t('settings.calendar.syncSummary', {
          created: result.created,
          updated: result.updated,
          deleted: result.deleted,
        }),
        [{ text: t('common.close') }]
      )
    } catch {
      Alert.alert(t('common.error'), t('settings.calendar.syncError'), [
        { text: t('common.close') },
      ])
    }
  }, [settings, saveSettings, t, queryClient, syncAssignments])

  // Get selected calendar name
  const selectedCalendar = calendars.find((cal) => cal.id === settings.selectedCalendarId)

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
