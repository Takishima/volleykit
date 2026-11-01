/**
 * Selector hooks for the travel time data source.
 *
 * Single place that decides whether travel times come from the demo mock
 * or the real OJP API, so every call site of getOrFetchTravelTime agrees
 * and mock/real results never share a cache entry with different sources.
 */

import { isOjpConfigured } from '@/common/services/transport'
import { useAuthStore } from '@/common/stores/auth'

interface TravelTimeSource {
  /** Use the demo-mode mock instead of the OJP API */
  useMock: boolean
}

export function useTravelTimeSource(): TravelTimeSource {
  const dataSource = useAuthStore((state) => state.dataSource)
  return { useMock: dataSource === 'demo' || !isOjpConfigured() }
}

/**
 * Check if travel time feature is available.
 * Returns true if demo mode, calendar mode is active, or OJP API is configured.
 *
 * Calendar mode is included because it provides coordinates from iCal GEO data,
 * enabling transport calculations when OJP is configured.
 */
export function useTravelTimeAvailable(): boolean {
  const dataSource = useAuthStore((state) => state.dataSource)
  return dataSource === 'demo' || dataSource === 'calendar' || isOjpConfigured()
}
