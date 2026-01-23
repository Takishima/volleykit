/**
 * Location platform adapter
 *
 * Provides location services using expo-location for Smart Departure Reminder feature.
 */

import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'

/** Background location task name */
export const LOCATION_TASK_NAME = 'volleykit-background-location'

/**
 * Location coordinates
 */
export interface Coordinates {
  latitude: number
  longitude: number
}

/**
 * Location adapter interface for platform abstraction.
 */
export interface LocationAdapter {
  /** Request foreground location permissions */
  requestForegroundPermissions(): Promise<'granted' | 'denied' | 'restricted'>
  /** Request background location permissions (requires foreground first) */
  requestBackgroundPermissions(): Promise<'granted' | 'denied' | 'restricted'>
  /** Check if foreground permission is granted */
  hasForegroundPermissions(): Promise<boolean>
  /** Check if background permission is granted */
  hasBackgroundPermissions(): Promise<boolean>
  /** Get current location */
  getCurrentLocation(): Promise<Coordinates | null>
  /** Start background location tracking */
  startBackgroundTracking(): Promise<void>
  /** Stop background location tracking */
  stopBackgroundTracking(): Promise<void>
  /** Check if background tracking is active */
  isTrackingActive(): Promise<boolean>
}

/**
 * Request foreground location permissions.
 */
async function requestForegroundPermissions(): Promise<'granted' | 'denied' | 'restricted'> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status === 'granted') return 'granted'
    return 'denied'
  } catch {
    return 'denied'
  }
}

/**
 * Request background location permissions.
 * Must have foreground permissions first.
 */
async function requestBackgroundPermissions(): Promise<'granted' | 'denied' | 'restricted'> {
  try {
    // Check foreground first
    const foreground = await hasForegroundPermissions()
    if (!foreground) {
      return 'denied'
    }

    const { status } = await Location.requestBackgroundPermissionsAsync()
    if (status === 'granted') return 'granted'
    return 'denied'
  } catch {
    return 'denied'
  }
}

/**
 * Check if foreground permission is granted.
 */
async function hasForegroundPermissions(): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync()
    return status === 'granted'
  } catch {
    return false
  }
}

/**
 * Check if background permission is granted.
 */
async function hasBackgroundPermissions(): Promise<boolean> {
  try {
    const { status } = await Location.getBackgroundPermissionsAsync()
    return status === 'granted'
  } catch {
    return false
  }
}

/**
 * Get current location with balanced accuracy for battery efficiency.
 */
async function getCurrentLocation(): Promise<Coordinates | null> {
  try {
    const hasPermission = await hasForegroundPermissions()
    if (!hasPermission) {
      return null
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    })

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    }
  } catch {
    return null
  }
}

/**
 * Start background location tracking with hourly updates.
 * Uses significant location changes for battery efficiency.
 */
async function startBackgroundTracking(): Promise<void> {
  const hasPermission = await hasBackgroundPermissions()
  if (!hasPermission) {
    throw new Error('Background location permission not granted')
  }

  const isTracking = await isTrackingActive()
  if (isTracking) {
    return // Already tracking
  }

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    // Use significant changes for battery efficiency
    distanceInterval: 500, // 500 meters
    deferredUpdatesInterval: 1000 * 60 * 60, // 1 hour
    showsBackgroundLocationIndicator: false,
    foregroundService: {
      notificationTitle: 'VolleyKit',
      notificationBody: 'Monitoring departure times',
      notificationColor: '#0ea5e9',
    },
    pausesUpdatesAutomatically: true,
  })
}

/**
 * Stop background location tracking.
 */
async function stopBackgroundTracking(): Promise<void> {
  const isTracking = await isTrackingActive()
  if (!isTracking) {
    return // Not tracking
  }

  await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
}

/**
 * Check if background tracking is active.
 */
async function isTrackingActive(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
  } catch {
    return false
  }
}

/**
 * Location adapter implementation using expo-location.
 */
export const location: LocationAdapter = {
  requestForegroundPermissions,
  requestBackgroundPermissions,
  hasForegroundPermissions,
  hasBackgroundPermissions,
  getCurrentLocation,
  startBackgroundTracking,
  stopBackgroundTracking,
  isTrackingActive,
}

/**
 * Define the background location task.
 * This must be called at module scope (outside any component).
 */
export function defineLocationTask(callback: (locations: Coordinates[]) => Promise<void>): void {
  TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.warn('Background location error:', error)
      return
    }

    if (!data) {
      return
    }

    const { locations } = data as { locations: Location.LocationObject[] }

    if (locations && locations.length > 0) {
      const coords = locations.map((loc) => ({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      }))

      await callback(coords)
    }
  })
}
