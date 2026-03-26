/**
 * Indicator component for pending offline actions.
 *
 * Shows:
 * - Badge with count of pending actions
 * - Toast when actions are synced
 * - Failed action notifications
 *
 * Also handles automatic sync when connectivity is restored.
 */

import { useEffect, useRef } from 'react'

import { useShallow } from 'zustand/react/shallow'

import { useNetworkStatus } from '@/common/hooks/useNetworkStatus'
import { useTranslation } from '@/common/hooks/useTranslation'
import { useActionQueueStore, initializeActionQueueStore } from '@/common/stores/action-queue'
import { useAuthStore } from '@/common/stores/auth'
import { useToastStore } from '@/common/stores/toast'
import { createLogger } from '@/common/utils/logger'

import { CloudUpload } from './icons'

const log = createLogger('PendingActionsIndicator')

/**
 * Hook to sync pending actions when coming back online.
 */
function useAutoSync() {
  const isOnline = useNetworkStatus()
  const wasOnlineRef = useRef(isOnline)
  const dataSource = useAuthStore((state) => state.dataSource)
  const { sync, pendingCount, isSyncing } = useActionQueueStore(
    useShallow((s) => ({ sync: s.sync, pendingCount: s.pendingCount, isSyncing: s.isSyncing }))
  )
  const addToast = useToastStore((s) => s.addToast)
  const { t, tInterpolate } = useTranslation()

  // Initialize store on mount
  useEffect(() => {
    initializeActionQueueStore()
  }, [])

  // Sync when coming back online
  useEffect(() => {
    const wasOnline = wasOnlineRef.current
    wasOnlineRef.current = isOnline

    // Detect transition from offline to online (only sync in API mode)
    if (!wasOnline && isOnline && pendingCount > 0 && dataSource === 'api') {
      log.info('Connectivity restored, syncing pending actions:', { count: pendingCount })

      sync()
        .then((result) => {
          if (result) {
            if (result.succeeded > 0) {
              addToast({
                type: 'success',
                message: tInterpolate('offline.syncComplete', { count: result.succeeded }),
              })
            }
            if (result.failed > 0) {
              addToast({
                type: 'error',
                message: tInterpolate('offline.syncFailed', { count: result.failed }),
              })
            }
            if (result.requiresReauth) {
              addToast({
                type: 'warning',
                message: t('offline.sessionExpired'),
              })
            }
          }
        })
        .catch((error) => {
          log.error('Failed to sync pending actions:', error)
        })
    }
  }, [isOnline, pendingCount, dataSource, sync, addToast, t, tInterpolate])

  return { isSyncing }
}

/**
 * Badge showing pending action count.
 * Only visible when there are pending actions.
 */
export function PendingActionsBadge() {
  const { pendingCount, isSyncing } = useActionQueueStore(
    useShallow((s) => ({ pendingCount: s.pendingCount, isSyncing: s.isSyncing }))
  )
  const { t, tInterpolate } = useTranslation()

  useAutoSync()

  if (pendingCount === 0 && !isSyncing) {
    return null
  }

  return (
    <div
      className="flex items-center gap-1.5 rounded-full bg-warning-100 px-2.5 py-1 text-xs font-medium text-warning-800 dark:bg-warning-900/30 dark:text-warning-200"
      title={tInterpolate('offline.pendingActions', { count: pendingCount })}
      role="status"
      aria-live="polite"
    >
      <CloudUpload
        className={`h-3.5 w-3.5 ${isSyncing ? 'animate-pulse' : ''}`}
        aria-hidden="true"
      />
      <span>{pendingCount}</span>
      {isSyncing && <span className="sr-only">{t('offline.syncing')}</span>}
    </div>
  )
}

/**
 * Full indicator with badge and auto-sync functionality.
 * Use this in the app shell/header.
 */
export function PendingActionsIndicator() {
  // The badge component handles auto-sync internally
  return <PendingActionsBadge />
}
