import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query'

import {
  api,
  getApiClient,
  type SearchConfiguration,
  type CompensationRecord,
  type Assignment,
} from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import {
  DEFAULT_PAGE_SIZE,
  COMPENSATION_LOOKUP_LIMIT,
  COMPENSATIONS_STALE_TIME_MS,
} from '@/shared/hooks/usePaginatedQuery'
import { useAuthStore } from '@/shared/stores/auth'
import { useDemoStore } from '@/shared/stores/demo'
import { createLogger } from '@/shared/utils/logger'

const log = createLogger('useCompensations')

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
    queryKey: queryKeys.compensations.list(config, associationKey),
    queryFn: () => apiClient.searchCompensations(config),
    select: (data) => {
      const items = data.items ?? EMPTY_COMPENSATIONS
      // Apply client-side filtering for paid/unpaid status
      if (paidFilter === undefined) {
        return items
      }
      return items.filter((record) => record.convocationCompensation?.paymentDone === paidFilter)
    },
    staleTime: COMPENSATIONS_STALE_TIME_MS,
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

// Compensation update types
export interface CompensationUpdateData {
  distanceInMetres?: number
  correctionReason?: string
}

/**
 * Mutation hook to update a compensation record directly.
 * Used when editing from the compensations tab where we have the compensation ID.
 */
export function useUpdateCompensation(): UseMutationResult<
  void,
  Error,
  { compensationId: string; data: CompensationUpdateData }
> {
  const queryClient = useQueryClient()
  const dataSource = useAuthStore((state) => state.dataSource)
  const apiClient = getApiClient(dataSource)

  return useMutation({
    mutationFn: async ({
      compensationId,
      data,
    }: {
      compensationId: string
      data: CompensationUpdateData
    }) => {
      log.debug('Updating compensation:', {
        compensationId,
        data,
        dataSource,
      })
      await apiClient.updateCompensation(compensationId, data)
    },
    onSuccess: () => {
      // Invalidate compensation lists (not details) to refetch fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.compensations.lists() })
    },
  })
}

/**
 * Searches all cached assignment queries for a specific assignment by ID.
 * Uses partial key matching to find assignments regardless of search configuration.
 */
function findAssignmentInCache(
  assignmentId: string,
  queryClient: ReturnType<typeof useQueryClient>
): Assignment | null {
  // Get all cached queries that start with "assignments"
  const queries = queryClient.getQueriesData<{ items: Assignment[] }>({
    queryKey: queryKeys.assignments.all,
  })

  for (const [, data] of queries) {
    const assignment = data?.items?.find((a) => a.__identity === assignmentId)
    if (assignment) {
      return assignment
    }
  }
  return null
}

/**
 * Searches all cached compensation queries for a compensation matching the game number.
 * Uses partial key matching to find compensations regardless of search configuration.
 */
function findCompensationInCache(
  gameNumber: number,
  queryClient: ReturnType<typeof useQueryClient>
): CompensationRecord | null {
  // Get all cached queries that start with "compensations"
  const queries = queryClient.getQueriesData<{ items: CompensationRecord[] }>({
    queryKey: queryKeys.compensations.all,
  })

  for (const [, data] of queries) {
    const comp = data?.items?.find((c) => c.refereeGame?.game?.number === gameNumber)
    if (comp) {
      return comp
    }
  }
  return null
}

/**
 * Fetches compensations from the API and finds one matching the game number.
 */
async function fetchCompensationByGameNumber(
  gameNumber: number,
  apiClient: typeof api
): Promise<CompensationRecord | null> {
  log.debug('Fetching compensations from API:', { gameNumber })

  const compensations = await apiClient.searchCompensations({
    limit: COMPENSATION_LOOKUP_LIMIT,
  })

  return compensations.items.find((c) => c.refereeGame?.game?.number === gameNumber) || null
}

/**
 * Finds the corresponding compensation record for an assignment by matching game numbers.
 * This is needed because assignments don't have the convocationCompensation.__identity
 * required by the compensation update API.
 *
 * @param assignmentId - The assignment's __identity (convocation ID)
 * @param queryClient - TanStack Query client for cache access
 * @param apiClient - The API client to use for fetching compensations
 * @returns The matching CompensationRecord
 * @throws Error if assignment or compensation cannot be found
 */
async function findCompensationForAssignment(
  assignmentId: string,
  queryClient: ReturnType<typeof useQueryClient>,
  apiClient: typeof api
): Promise<CompensationRecord> {
  // Find the assignment in cache to get its game number
  const assignment = findAssignmentInCache(assignmentId, queryClient)

  if (!assignment?.refereeGame?.game?.number) {
    throw new Error(COMPENSATION_ERROR_KEYS.ASSIGNMENT_NOT_FOUND)
  }

  const gameNumber = assignment.refereeGame.game.number

  // Try to find compensation in cache first
  const cachedComp = findCompensationInCache(gameNumber, queryClient)
  if (cachedComp) {
    log.debug('Found compensation in cache:', {
      gameNumber,
      compensationId: cachedComp.convocationCompensation?.__identity,
    })
    return cachedComp
  }

  // Fetch from API if not in cache
  const fetchedComp = await fetchCompensationByGameNumber(gameNumber, apiClient)
  if (fetchedComp) {
    log.debug('Found compensation via API:', {
      gameNumber,
      compensationId: fetchedComp.convocationCompensation?.__identity,
    })
    return fetchedComp
  }

  throw new Error(COMPENSATION_ERROR_KEYS.COMPENSATION_NOT_FOUND)
}

/**
 * Mutation hook to update compensation from an assignment context.
 * Used when editing compensation from the assignments tab (where we have an Assignment, not a CompensationRecord).
 * Handles the lookup of the corresponding compensation record.
 */
export function useUpdateAssignmentCompensation(): UseMutationResult<
  void,
  Error,
  { assignmentId: string; data: CompensationUpdateData }
> {
  const queryClient = useQueryClient()
  const dataSource = useAuthStore((state) => state.dataSource)
  const isDemoMode = dataSource === 'demo'
  const updateAssignmentCompensation = useDemoStore((state) => state.updateAssignmentCompensation)
  const apiClient = getApiClient(dataSource)

  return useMutation({
    mutationFn: async ({
      assignmentId,
      data,
    }: {
      assignmentId: string
      data: CompensationUpdateData
    }) => {
      if (isDemoMode) {
        // Demo mode: update the demo store directly
        updateAssignmentCompensation(assignmentId, data)
        return
      }

      // Non-demo mode: find the corresponding compensation record and update it via API
      log.debug('Looking up compensation for assignment:', {
        assignmentId,
        data,
      })

      // findCompensationForAssignment throws if assignment or compensation not found
      const compensation = await findCompensationForAssignment(assignmentId, queryClient, apiClient)
      const compensationId = compensation.convocationCompensation?.__identity

      if (!compensationId) {
        throw new Error(COMPENSATION_ERROR_KEYS.COMPENSATION_MISSING_ID)
      }

      log.debug('Updating compensation via API:', {
        assignmentId,
        compensationId,
        data,
        dataSource,
      })

      await apiClient.updateCompensation(compensationId, data)
    },
    onSuccess: (_data, variables) => {
      // Invalidate targeted queries to refetch fresh data while avoiding unnecessary refetches
      // 1. Invalidate the specific assignment detail (if cached)
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.detail(variables.assignmentId),
      })
      // 2. Invalidate assignment lists (compensation data is embedded in list items)
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.lists() })
      // 3. Invalidate compensation lists
      queryClient.invalidateQueries({ queryKey: queryKeys.compensations.lists() })
    },
  })
}
