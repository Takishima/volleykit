import { useMemo } from 'react'

import { useQuery } from '@tanstack/react-query'
import { startOfDay, endOfDay, addWeeks, format } from 'date-fns'

import { getApiClient, type SearchConfiguration, type RefereeBackupEntry } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { DEFAULT_PAGE_SIZE } from '@/shared/hooks/usePaginatedQuery'
import { useAuthStore } from '@/shared/stores/auth'
import { useDemoStore } from '@/shared/stores/demo'
import { MS_PER_MINUTE } from '@/shared/utils/constants'

/** Default number of weeks ahead to fetch referee backups */
const DEFAULT_WEEKS_AHEAD = 2

// Format date as YYYY-MM-DD for stable comparison (no time component)
const formatDateKey = (date: Date): string => format(date, 'yyyy-MM-dd')

// Stable empty array for React Query selectors to prevent unnecessary re-renders.
const EMPTY_BACKUPS: RefereeBackupEntry[] = []

/**
 * Hook to fetch referee backup (Pikett) assignments.
 *
 * This hook fetches on-call referee schedules for NLA and NLB games.
 * It's intended for referee administrators to view who is on-call.
 *
 * @param weeksAhead - Number of weeks ahead to fetch (default: 2)
 * @returns Query result with referee backup entries
 */
export function useRefereeBackups(weeksAhead: number = DEFAULT_WEEKS_AHEAD) {
  const dataSource = useAuthStore((state) => state.dataSource)
  const isDemoMode = dataSource === 'demo'
  const activeOccupationId = useAuthStore((state) => state.activeOccupationId)
  const demoAssociationCode = useDemoStore((state) => state.activeAssociationCode)
  const apiClient = getApiClient(dataSource)

  // Use appropriate key for cache invalidation when switching associations
  const associationKey = isDemoMode ? demoAssociationCode : activeOccupationId

  // Compute date keys (YYYY-MM-DD) for stable memoization.
  const todayKey = formatDateKey(new Date())
  const endDateKey = formatDateKey(addWeeks(new Date(), weeksAhead))

  // Memoize date range to ensure stable query key across tab switches.
  const dateRange = useMemo(
    () => ({
      from: startOfDay(new Date()).toISOString(),
      to: endOfDay(addWeeks(new Date(), weeksAhead)).toISOString(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Use date keys for stability, not Date objects
    [todayKey, endDateKey, weeksAhead]
  )

  // Build property filters for date range
  const propertyFilters = useMemo<SearchConfiguration['propertyFilters']>(
    () => [
      {
        propertyName: 'date',
        dateRange,
      },
    ],
    [dateRange]
  )

  const config = useMemo<SearchConfiguration>(
    () => ({
      offset: 0,
      limit: DEFAULT_PAGE_SIZE,
      propertyFilters,
      propertyOrderings: [
        {
          propertyName: 'date',
          descending: false,
          isSetByUser: true,
        },
      ],
    }),
    [propertyFilters]
  )

  // Select items from the response, providing a stable empty array fallback
  const selectBackups = useMemo(() => {
    return (data: { items?: RefereeBackupEntry[] }) => {
      return data.items ?? EMPTY_BACKUPS
    }
  }, [])

  return useQuery({
    queryKey: queryKeys.refereeBackup.list(config, associationKey),
    queryFn: () => apiClient.searchRefereeBackups(config),
    select: selectBackups,
    staleTime: 2 * MS_PER_MINUTE,
    // Keep previous data while refetching
    placeholderData: (prev) => prev,
  })
}
