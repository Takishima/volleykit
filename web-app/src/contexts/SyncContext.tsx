/**
 * Sync Context - Provider for offline sync functionality.
 *
 * Initializes the sync engine, connects to storage, and handles
 * automatic sync when connectivity is restored.
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
  type ReactElement,
} from 'react'

import { useQueryClient } from '@tanstack/react-query'
import {
  SyncEngine,
  useSyncStore,
  useAuthStore,
  queryKeys,
  type SyncResult,
  type MutationType,
} from '@volleykit/shared'

import { getApiClient } from '@/api/client'
import { useNetworkStatus, useNetworkChangeCallback } from '@/shared/hooks/useNetworkStatus'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { webSyncStorage } from '@/shared/services/syncStorage'
import { toast } from '@/shared/stores/toast'

/**
 * Sync context value.
 */
interface SyncContextValue {
  /** Manually trigger a sync */
  syncNow: () => Promise<void>
  /** Clear all pending operations */
  clearQueue: () => Promise<void>
}

const SyncContext = createContext<SyncContextValue | null>(null)

/**
 * Hook to access sync context.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSync(): SyncContextValue {
  const context = useContext(SyncContext)
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider')
  }
  return context
}

interface SyncProviderProps {
  children: ReactNode
}

/**
 * Provider that manages offline sync functionality.
 *
 * - Initializes the sync engine on mount
 * - Automatically syncs when connectivity is restored
 * - Shows notifications for sync results
 */
export function SyncProvider({ children }: SyncProviderProps): ReactElement {
  const { t, tInterpolate } = useTranslation()
  const queryClient = useQueryClient()
  const networkStatus = useNetworkStatus()
  const dataSource = useAuthStore((state) => state.dataSource)

  const { setItems, setSyncing, setLastSyncResults } = useSyncStore()

  const engineRef = useRef<SyncEngine | null>(null)
  const initializedRef = useRef(false)

  // Initialize sync engine
  useEffect(() => {
    if (initializedRef.current) return

    const apiClient = getApiClient(dataSource)

    const executors: Partial<
      Record<MutationType, (item: { payload: unknown }) => Promise<unknown>>
    > = {
      applyForExchange: async (item) => {
        const exchangeId =
          (item.payload as { exchangeId?: string })?.exchangeId ?? (item.payload as string)
        return apiClient.applyForExchange(exchangeId)
      },
      withdrawFromExchange: async (item) => {
        const exchangeId =
          (item.payload as { exchangeId?: string })?.exchangeId ?? (item.payload as string)
        return apiClient.withdrawFromExchange(exchangeId)
      },
      addToExchange: async (item) => {
        const payload = item.payload as { assignmentId: string }
        return apiClient.addToExchange(payload.assignmentId)
      },
      updateCompensation: async (item) => {
        const payload = item.payload as {
          id: string
          data: { distanceInMetres?: number; correctionReason?: string }
        }
        return apiClient.updateCompensation(payload.id, payload.data)
      },
    }

    const engine = new SyncEngine({
      storage: webSyncStorage,
      executors,
      onQueueChange: (items) => {
        setItems(items)
      },
      onSyncStart: () => {
        setSyncing(true)
      },
      onSyncComplete: (results) => {
        setSyncing(false)
        setLastSyncResults(results)
        handleSyncResults(results)
      },
    })

    engine.initialize().then(() => {
      engineRef.current = engine
      initializedRef.current = true
    })

    return () => {
      engineRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSource])

  // Handle sync results - show notifications and invalidate queries
  const handleSyncResults = (results: SyncResult[]) => {
    const successes = results.filter((r) => r.status === 'success')
    const conflicts = results.filter((r) => r.status === 'conflict')

    // Invalidate relevant queries
    if (successes.length > 0 || conflicts.length > 0) {
      queryClient.invalidateQueries({ queryKey: queryKeys.exchanges.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.compensations.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all })
    }

    // Show summary notifications
    if (successes.length > 0 && conflicts.length === 0) {
      toast.success(tInterpolate('sync.allSynced', { count: successes.length }))
    } else if (conflicts.length > 0) {
      // Conflicts are shown in the SyncResultsModal
      toast.warning(tInterpolate('sync.someConflicts', { count: conflicts.length }))
    }
  }

  // Auto-sync when coming back online
  useNetworkChangeCallback(
    async () => {
      // Coming online - trigger sync
      if (engineRef.current) {
        const pendingCount = engineRef.current.getPendingCount()
        if (pendingCount > 0) {
          toast.info(t('sync.syncing' as never))
          await engineRef.current.sync({ isConnected: true, isKnown: true, type: 'unknown' })
        }
      }
    },
    () => {
      // Going offline - no action needed
    }
  )

  const syncNow = async () => {
    if (engineRef.current && networkStatus.isConnected) {
      await engineRef.current.sync(networkStatus)
    }
  }

  const clearQueue = async () => {
    if (engineRef.current) {
      await engineRef.current.clearQueue()
    }
  }

  return <SyncContext.Provider value={{ syncNow, clearQueue }}>{children}</SyncContext.Provider>
}
