import { useQuery } from '@tanstack/react-query'

import { getApiClient, type SearchConfiguration, type CompensationRecord } from '@/api/client'
import { compensationListOptions } from '@/api/queryOptions'
import { DEFAULT_PAGE_SIZE } from '@/common/hooks/usePaginatedQuery'
import { useAuthStore } from '@/common/stores/auth'
import { useDemoStore } from '@/common/stores/demo'

// Stable empty array for React Query selectors to prevent unnecessary re-renders.
const EMPTY_COMPENSATIONS: CompensationRecord[] = []

/**
 * Error keys for compensation-related errors.
 * These correspond to i18n keys in compensations.* namespace.
 * Use with translateCompensationError() to get localized messages.
 */
export const COMPENSATION_ERROR_KEYS = {
  ASSIGNMENT_NOT_FOUND: 'compensations.assignmentNotFoundInCache',
  COMPENSATION_NOT_FOUND: 'compensations.compensationNotFound',
  COMPENSATION_MISSING_ID: 'compensations.compensationMissingId',
} as const

export type CompensationErrorKey =
  (typeof COMPENSATION_ERROR_KEYS)[keyof typeof COMPENSATION_ERROR_KEYS]

/**
 * Hook to fetch compensation records with optional paid/unpaid filtering.
 *
 * Always fetches from the compensations API endpoint to ensure complete data.
 * The assignments cache cannot be used as a substitute because it typically
 * only contains upcoming games, while compensations include past games that
 * are needed for the "past but not closed" tab.
 *
 * Note: The volleymanager API does not support filtering by paymentDone=true/false.
 * It only supports NOT_NULL to check if compensation data exists. Therefore, we
 * fetch all compensations and apply client-side filtering for paid/unpaid status.
 *
 * @param paidFilter - Optional filter: true for paid, false for unpaid, undefined for all
 */
export function useCompensations(paidFilter?: boolean) {
  const dataSource = useAuthStore((state) => state.dataSource)
  const isDemoMode = dataSource === 'demo'
  const activeOccupationId = useAuthStore((state) => state.activeOccupationId)
  const demoAssociationCode = useDemoStore((state) => state.activeAssociationCode)
  const apiClient = getApiClient(dataSource)

  // Use appropriate key for cache invalidation when switching associations
  const associationKey = isDemoMode ? demoAssociationCode : activeOccupationId

  // Note: We don't send paymentDone filter to the API because the real API
  // doesn't support "true"/"false" values - it only supports "NOT_NULL".
  // Client-side filtering is applied in the select function instead.
  const config: SearchConfiguration = {
    offset: 0,
    limit: DEFAULT_PAGE_SIZE,
    propertyFilters: [],
    propertyOrderings: [
      {
        propertyName: 'refereeGame.game.startingDateTime',
        descending: true,
        isSetByUser: true,
      },
    ],
  }

  return useQuery({
    // All tabs share the same base query - filtering is done client-side via select
    ...compensationListOptions(apiClient, config, associationKey),
    select: (data) => {
      const items = data.items ?? EMPTY_COMPENSATIONS
      // Apply client-side filtering for paid/unpaid status
      if (paidFilter === undefined) {
        return items
      }
      // Use !== instead of === for unpaid filter because paymentDone may be undefined
      // when not set by the API (the field is optional). For unpaid (paidFilter=false),
      // we want everything that isn't explicitly paid (true).
      if (paidFilter) {
        return items.filter((record) => record.convocationCompensation?.paymentDone === true)
      }
      return items.filter((record) => record.convocationCompensation?.paymentDone !== true)
    },
  })
}

/**
 * Convenience hook for paid compensations.
 */
export function usePaidCompensations() {
  return useCompensations(true)
}

/**
 * Convenience hook for unpaid compensations.
 */
export function useUnpaidCompensations() {
  return useCompensations(false)
}
