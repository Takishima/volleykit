/**
 * Auth-to-settings sync hook.
 *
 * Subscribes to the auth store and:
 * - Syncs dataSource changes to the settings store
 * - Registers cache cleanup callback for logout
 * - Clears query cache on login transitions
 */

import { useEffect } from 'react'

import { queryClient } from '@/queryClientConfig'
import { features } from '@/shared/config/features'
// features.offline — IndexedDB persistence and action queue (delete these imports when removing offline feature)
import { clearPersistedCache, clearAllActions } from '@/shared/services/offline'
import { useAuthStore, registerCacheCleanup } from '@/shared/stores/auth'
import { useSettingsStore } from '@/shared/stores/settings'
import { logger } from '@/shared/utils/logger'

export function useAuthSync() {
  useEffect(() => {
    // Set initial mode from auth store
    const initialDataSource = useAuthStore.getState().dataSource
    useSettingsStore.getState()._setCurrentMode(initialDataSource)

    // Register cache cleanup callback so auth store can clear cache during logout.
    // This ensures cache is cleared synchronously before state updates,
    // preventing any race conditions with React re-renders.
    const unregisterCacheCleanup = registerCacheCleanup(() => {
      queryClient.resetQueries()
      // features.offline — Also clear the persisted IndexedDB cache and action queue
      if (features.offline) {
        clearPersistedCache().catch((err) => logger.warn('Failed to clear persisted cache:', err))
        clearAllActions().catch((err) => logger.warn('Failed to clear action queue:', err))
      }
    })

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
        queryClient.resetQueries()
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
