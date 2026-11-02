/**
 * Auth-to-settings sync hook.
 *
 * Subscribes to the auth store and:
 * - Syncs dataSource changes to the settings store
 * - Registers cache cleanup callback for logout
 * - Clears query cache on login transitions
 */

import { useEffect } from 'react'

import { features } from '@/common/config/features'
// features.offline — IndexedDB persistence and action queue (delete these imports when removing offline feature)
import {
  clearPersistedCache,
  clearAllActions,
  clearApiResponseCaches,
} from '@/common/services/offline'
import { useAuthStore, registerCacheCleanup } from '@/common/stores/auth'
import { useSettingsStore } from '@/common/stores/settings'
import { logger } from '@/common/utils/logger'
import { queryClient } from '@/queryClientConfig'

/** Drops every cached query; a failure must not block the auth transition. */
function resetQueryCache(transition: 'login' | 'logout'): void {
  queryClient
    .resetQueries()
    .catch((err) => logger.warn(`Failed to reset query cache on ${transition}:`, err))
}

/**
 * Clears every client-side cache that belongs to the signed-out user.
 * Runs synchronously from the auth store before its state updates, so React
 * re-renders never see the previous user's data.
 */
function clearCachesOnLogout(): void {
  resetQueryCache('logout')
  // Drop the service worker's cached API responses so the next user on this
  // device cannot be served the previous user's data offline.
  clearApiResponseCaches().catch((err) =>
    logger.warn('Failed to clear service worker API caches:', err)
  )
  // features.offline — Also clear the persisted IndexedDB cache and action queue
  if (features.offline) {
    clearPersistedCache().catch((err) => logger.warn('Failed to clear persisted cache:', err))
    clearAllActions().catch((err) => logger.warn('Failed to clear action queue:', err))
  }
}

export function useAuthSync() {
  useEffect(() => {
    // Set initial mode from auth store
    const initialDataSource = useAuthStore.getState().dataSource
    useSettingsStore.getState()._setCurrentMode(initialDataSource)

    // Register cache cleanup callback so auth store can clear cache during logout.
    const unregisterCacheCleanup = registerCacheCleanup(clearCachesOnLogout)

    // Track state to detect changes
    let previousDataSource = initialDataSource
    let wasAuthenticated = useAuthStore.getState().user !== null

    const unsubscribe = useAuthStore.subscribe((state) => {
      // Sync dataSource changes to settings store
      if (state.dataSource !== previousDataSource) {
        previousDataSource = state.dataSource
        useSettingsStore.getState()._setCurrentMode(state.dataSource)
      }

      // Clear query cache on auth state transitions to prevent stale data.
      // - On logout: handled by cacheCleanupCallback in auth store (synchronous)
      // - On login: prevents seeing stale cached data from previous sessions
      //   (e.g., when persisted auth state restored an old activeOccupationId)
      const isAuthenticated = state.user !== null
      if (wasAuthenticated !== isAuthenticated && isAuthenticated) {
        // Only clear on login transition here - logout is handled synchronously
        // in the auth store via cacheCleanupCallback
        resetQueryCache('login')
        logger.info('Query cache cleared on login')
      }
      wasAuthenticated = isAuthenticated
    })

    return () => {
      unsubscribe()
      unregisterCacheCleanup()
    }
  }, [])
}
