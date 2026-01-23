/**
 * Platform adapter for home screen widgets.
 *
 * Provides cross-platform interface for updating widget data on iOS and Android.
 */

import { Platform } from 'react-native'

import {
  EMPTY_WIDGET_DATA,
  MAX_WIDGET_ASSIGNMENTS,
  IOS_APP_GROUP,
  ANDROID_WIDGET_PREFS_KEY,
} from '../types/widget'

import type { WidgetData, WidgetAssignment } from '../types/widget'

/**
 * Widget adapter interface.
 */
export interface WidgetAdapter {
  /** Update widget data */
  updateWidgetData(data: WidgetData): Promise<void>
  /** Get current widget data */
  getWidgetData(): Promise<WidgetData | null>
  /** Clear widget data */
  clearWidgetData(): Promise<void>
  /** Request widget refresh (iOS only) */
  reloadAllTimelines(): Promise<void>
  /** Check if widgets are supported */
  isSupported(): boolean
}

/** Helper to reload iOS widget timelines */
async function reloadIOSTimelines(): Promise<void> {
  try {
    const widgetkit = await import('react-native-widgetkit')
    if (widgetkit.reloadAllTimelines) {
      widgetkit.reloadAllTimelines()
    }
  } catch (error) {
    console.error('Failed to reload widget timelines:', error)
  }
}

/**
 * iOS widget adapter using react-native-widgetkit.
 */
async function createIOSAdapter(): Promise<WidgetAdapter> {
  // Dynamic import to avoid issues on Android
  const widgetkit = await import('react-native-widgetkit')

  return {
    async updateWidgetData(data: WidgetData): Promise<void> {
      try {
        await widgetkit.setItem('widgetData', JSON.stringify(data), IOS_APP_GROUP)
        // Reload widget timelines to show updated data
        await reloadIOSTimelines()
      } catch (error) {
        console.error('Failed to update iOS widget data:', error)
      }
    },

    async getWidgetData(): Promise<WidgetData | null> {
      try {
        const data = await widgetkit.getItem('widgetData', IOS_APP_GROUP)
        if (data) {
          return JSON.parse(data) as WidgetData
        }
        return null
      } catch {
        return null
      }
    },

    async clearWidgetData(): Promise<void> {
      try {
        await widgetkit.setItem('widgetData', JSON.stringify(EMPTY_WIDGET_DATA), IOS_APP_GROUP)
        await reloadIOSTimelines()
      } catch (error) {
        console.error('Failed to clear iOS widget data:', error)
      }
    },

    async reloadAllTimelines(): Promise<void> {
      await reloadIOSTimelines()
    },

    isSupported(): boolean {
      return true
    },
  }
}

/** Helper to reload Android widget */
async function reloadAndroidWidget(): Promise<void> {
  try {
    const { requestWidgetUpdate } = await import('react-native-android-widget')
    await requestWidgetUpdate({
      widgetName: 'VolleyKitWidget',
      renderWidget: () => null, // Widget renders from stored data
      widgetNotFound: () => {
        // Widget not added to home screen yet
      },
    })
  } catch (error) {
    console.error('Failed to request Android widget update:', error)
  }
}

/**
 * Android widget adapter using react-native-android-widget.
 */
async function createAndroidAdapter(): Promise<WidgetAdapter> {
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default

  return {
    async updateWidgetData(data: WidgetData): Promise<void> {
      try {
        await AsyncStorage.setItem(ANDROID_WIDGET_PREFS_KEY, JSON.stringify(data))
        // Request widget update
        await reloadAndroidWidget()
      } catch (error) {
        console.error('Failed to update Android widget data:', error)
      }
    },

    async getWidgetData(): Promise<WidgetData | null> {
      try {
        const data = await AsyncStorage.getItem(ANDROID_WIDGET_PREFS_KEY)
        if (data) {
          return JSON.parse(data) as WidgetData
        }
        return null
      } catch {
        return null
      }
    },

    async clearWidgetData(): Promise<void> {
      try {
        await AsyncStorage.setItem(ANDROID_WIDGET_PREFS_KEY, JSON.stringify(EMPTY_WIDGET_DATA))
        await reloadAndroidWidget()
      } catch (error) {
        console.error('Failed to clear Android widget data:', error)
      }
    },

    async reloadAllTimelines(): Promise<void> {
      await reloadAndroidWidget()
    },

    isSupported(): boolean {
      return true
    },
  }
}

/**
 * No-op adapter for unsupported platforms.
 */
function createNoOpAdapter(): WidgetAdapter {
  return {
    async updateWidgetData(_data: WidgetData): Promise<void> {
      // No-op
    },
    async getWidgetData(): Promise<WidgetData | null> {
      return null
    },
    async clearWidgetData(): Promise<void> {
      // No-op
    },
    async reloadAllTimelines(): Promise<void> {
      // No-op
    },
    isSupported(): boolean {
      return false
    },
  }
}

/** Cached adapter instance */
let widgetAdapter: WidgetAdapter | null = null

/**
 * Get the widget adapter for the current platform.
 */
export async function getWidgetAdapter(): Promise<WidgetAdapter> {
  if (widgetAdapter) {
    return widgetAdapter
  }

  if (Platform.OS === 'ios') {
    widgetAdapter = await createIOSAdapter()
  } else if (Platform.OS === 'android') {
    widgetAdapter = await createAndroidAdapter()
  } else {
    widgetAdapter = createNoOpAdapter()
  }

  return widgetAdapter
}

/**
 * Format assignments for widget display.
 * Limits to MAX_WIDGET_ASSIGNMENTS and sorts by game time.
 */
export function formatAssignmentsForWidget(assignments: WidgetAssignment[]): WidgetAssignment[] {
  return assignments
    .filter((a) => new Date(a.gameTime) > new Date())
    .sort((a, b) => new Date(a.gameTime).getTime() - new Date(b.gameTime).getTime())
    .slice(0, MAX_WIDGET_ASSIGNMENTS)
}

/**
 * Create widget data from assignments.
 */
export function createWidgetData(
  assignments: WidgetAssignment[],
  isLoggedIn: boolean,
  userName?: string
): WidgetData {
  return {
    assignments: formatAssignmentsForWidget(assignments),
    lastUpdatedAt: new Date().toISOString(),
    isLoggedIn,
    userName,
  }
}
