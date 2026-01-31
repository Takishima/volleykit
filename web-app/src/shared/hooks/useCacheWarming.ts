/**
 * Cache warming hook for offline support.
 *
 * Prefetches critical data after login to ensure offline availability.
 * Runs in the background without blocking the UI.
 */

import { useEffect, useRef } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { addDays, startOfDay, endOfDay } from 'date-fns'

import { getApiClient } from '@/api/client'
import { queryKeys, type SearchConfiguration } from '@/api/queryKeys'
import { setMetadata } from '@/shared/services/offline'
import { useAuthStore } from '@/shared/stores/auth'
import { useDemoStore } from '@/shared/stores/demo'
import { MS_PER_MINUTE, MS_PER_HOUR } from '@/shared/utils/constants'
import { createLogger } from '@/shared/utils/logger'

const log = createLogger('cacheWarming')

/** Default page size for prefetch requests */
const PREFETCH_PAGE_SIZE = 100

/** Date range for prefetching upcoming assignments (30 days) */
const PREFETCH_DAYS_AHEAD = 30

/** Stale time for prefetched data (5 minutes) */
const PREFETCH_STALE_TIME_MINUTES = 5
const PREFETCH_STALE_TIME_MS = PREFETCH_STALE_TIME_MINUTES * MS_PER_MINUTE

/** Metadata key for last cache warming timestamp */
const LAST_WARMED_KEY = 'last-cache-warmed'

/** Minimum interval between cache warming attempts (1 hour) */
const MIN_WARMING_INTERVAL_MS = MS_PER_HOUR

/**
 * Hook to warm the cache with critical data after login.
 *
 * Features:
 * - Prefetches upcoming assignments (30 days)
 * - Runs only once per session (tracks last warming time)
 * - Respects minimum interval between warmings
 * - Runs in background without blocking UI
 * - Skips warming in demo mode (data is generated locally)
 */
export function useCacheWarming() {
  const queryClient = useQueryClient()
  const dataSource = useAuthStore((state) => state.dataSource)
  const user = useAuthStore((state) => state.user)
  const activeOccupationId = useAuthStore((state) => state.activeOccupationId)
  const demoAssociationCode = useDemoStore((state) => state.activeAssociationCode)

  // Track if warming has been attempted this session
  const hasWarmedRef = useRef(false)

  // Determine association key based on mode
  const associationKey = dataSource === 'demo' ? demoAssociationCode : activeOccupationId

  useEffect(() => {
    // Skip if not authenticated or already warmed this session
    if (!user || hasWarmedRef.current) return

    // Skip warming in demo mode - demo data is generated locally
    if (dataSource === 'demo') {
      hasWarmedRef.current = true
      return
    }

    // Skip warming in calendar mode - limited functionality
    if (dataSource === 'calendar') {
      hasWarmedRef.current = true
      return
    }

    hasWarmedRef.current = true

    // Run cache warming in background
    warmCache(queryClient, associationKey, dataSource).catch((error) => {
      log.warn('Cache warming failed:', error)
    })
  }, [user, dataSource, associationKey, queryClient])
}

/**
 * Warm the cache with critical data.
 * This runs in the background after login.
 */
async function warmCache(
  queryClient: ReturnType<typeof useQueryClient>,
  associationKey: string | null,
  dataSource: 'api' | 'demo' | 'calendar'
): Promise<void> {
  // Check if we've warmed recently
  const lastWarmed = await import('@/shared/services/offline').then((m) =>
    m.getMetadata<number>(LAST_WARMED_KEY)
  )

  if (lastWarmed && Date.now() - lastWarmed < MIN_WARMING_INTERVAL_MS) {
    log.debug('Cache was warmed recently, skipping')
    return
  }

  log.info('Starting cache warming...')
  const startTime = Date.now()

  const apiClient = getApiClient(dataSource)

  // Calculate date range for upcoming assignments
  const now = new Date()
  const fromDate = startOfDay(now).toISOString()
  const toDate = endOfDay(addDays(now, PREFETCH_DAYS_AHEAD)).toISOString()

  // Build search configuration
  const assignmentsConfig: SearchConfiguration = {
    offset: 0,
    limit: PREFETCH_PAGE_SIZE,
    fromDate,
    toDate,
    sortField: 'refereeGame.game.startingDateTime',
    sortDirection: 'asc',
  }

  const compensationsConfig: SearchConfiguration = {
    offset: 0,
    limit: PREFETCH_PAGE_SIZE,
    sortField: 'refereeGame.game.startingDateTime',
    sortDirection: 'desc',
  }

  // Prefetch assignments and compensations in parallel
  const results = await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: queryKeys.assignments.list(assignmentsConfig, associationKey),
      queryFn: () => apiClient.searchAssignments(assignmentsConfig),
      staleTime: PREFETCH_STALE_TIME_MS,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.compensations.list(compensationsConfig, associationKey),
      queryFn: () => apiClient.searchCompensations(compensationsConfig),
      staleTime: PREFETCH_STALE_TIME_MS,
    }),
  ])

  // Log results
  const successCount = results.filter((r) => r.status === 'fulfilled').length
  const failedCount = results.filter((r) => r.status === 'rejected').length
  const duration = Date.now() - startTime

  log.info('Cache warming complete:', {
    successCount,
    failedCount,
    durationMs: duration,
  })

  // Record warming time
  await setMetadata(LAST_WARMED_KEY, Date.now())
}
