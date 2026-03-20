/**
 * Calendar Settings Hook
 *
 * Manages calendar integration state and actions:
 * - Loading/saving settings from storage
 * - Calendar permissions and discovery
 * - iCal subscription URL generation
 * - Direct calendar sync orchestration
 */

import { useState, useEffect, useCallback } from 'react'

import { Alert, Linking } from 'react-native'

import { useQueryClient } from '@tanstack/react-query'

import { useStorage } from '@volleykit/shared/adapters'
import { queryKeys, type Assignment } from '@volleykit/shared/api'
import { useTranslation } from '@volleykit/shared/i18n'
import { useAuthStore } from '@volleykit/shared/stores'

import { CALENDAR_SETTINGS_KEY } from '../constants'
import { useCalendarSync } from './useCalendarSync'
import { calendar } from '../platform/calendar'

import type { CalendarInfo, CalendarSyncMode, CalendarSettings } from '../types/calendar'

/** API base URL for iCal subscriptions */
const ICAL_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://volleymanager.volleyball.ch'

/**
 * Construct the iCal URL for a given calendar code.
 * Uses webcal:// protocol for native calendar app integration.
 */
function getIcalUrl(calendarCode: string): string {
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

export function useCalendarSettings() {
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
        const savedSettings = await storage.getItem(CALENDAR_SETTINGS_KEY)
        if (savedSettings) {
          setSettings(JSON.parse(savedSettings) as CalendarSettings)
        }

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
        const hasPermission = await calendar.hasPermissions()
        if (!hasPermission) {
          const granted = await requestPermissions()
          if (!granted) return
        }

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

  return {
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
  }
}
