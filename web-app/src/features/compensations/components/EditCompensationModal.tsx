import { useState, useCallback, useEffect, useMemo, memo } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import type { Assignment, CompensationRecord } from '@/api/client'
import { getApiClient } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import {
  getTeamNames,
  getTeamNamesFromCompensation,
} from '@/features/assignments/utils/assignment-helpers'
import {
  useBatchUpdateCompensations,
  type BatchUpdateResult,
} from '@/features/compensations/hooks/useCompensations'
import { isCompensationEditable } from '@/features/compensations/utils/compensation-actions'
import {
  useUpdateCompensation,
  useUpdateAssignmentCompensation,
  COMPENSATION_ERROR_KEYS,
  type CompensationErrorKey,
} from '@/features/validation/hooks/useConvocations'
import { Button } from '@/shared/components/Button'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { Modal } from '@/shared/components/Modal'
import { ModalErrorBoundary } from '@/shared/components/ModalErrorBoundary'
import { ModalFooter } from '@/shared/components/ModalFooter'
import { ModalHeader } from '@/shared/components/ModalHeader'
import { COMPENSATION_LOOKUP_LIMIT } from '@/shared/hooks/usePaginatedQuery'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { useAuthStore } from '@/shared/stores/auth'
import { useDemoStore } from '@/shared/stores/demo'
import { toast } from '@/shared/stores/toast'
import {
  DECIMAL_INPUT_PATTERN,
  formatDistanceKm,
  kilometresToMetres,
  parseLocalizedNumber,
} from '@/shared/utils/distance'
import { logger } from '@/shared/utils/logger'

interface EditCompensationModalProps {
  assignment?: Assignment
  compensation?: CompensationRecord
  isOpen: boolean
  onClose: () => void
}

/**
 * Searches cached compensation queries to find a compensation matching the game number.
 */
function findCompensationInCache(
  gameNumber: number,
  queryClient: ReturnType<typeof useQueryClient>
): CompensationRecord | null {
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
 * Finds all editable compensations in cache that are at the same hall.
 * Excludes the current compensation from the results.
 */
function findOtherEditableCompensationsAtSameHall(
  currentCompensationId: string | undefined,
  hallId: string | undefined,
  queryClient: ReturnType<typeof useQueryClient>
): CompensationRecord[] {
  if (!hallId || !currentCompensationId) return []

  const queries = queryClient.getQueriesData<{ items: CompensationRecord[] }>({
    queryKey: queryKeys.compensations.all,
  })

  const results: CompensationRecord[] = []
  const seenIds = new Set<string>()

  for (const [, data] of queries) {
    if (!data?.items) continue
    for (const comp of data.items) {
      const compId = comp.convocationCompensation?.__identity
      const compHallId = comp.refereeGame?.game?.hall?.__identity

      // Skip current compensation, already seen, or different hall
      if (!compId || compId === currentCompensationId || seenIds.has(compId)) continue
      if (compHallId !== hallId) continue

      // Only include if editable
      if (isCompensationEditable(comp)) {
        seenIds.add(compId)
        results.push(comp)
      }
    }
  }

  return results
}

function EditCompensationModalComponent({
  assignment,
  compensation,
  isOpen,
  onClose,
}: EditCompensationModalProps) {
  const { t, tInterpolate } = useTranslation()
  const queryClient = useQueryClient()
  const dataSource = useAuthStore((state) => state.dataSource)
  const getAssignmentCompensation = useDemoStore((state) => state.getAssignmentCompensation)
  const updateCompensationMutation = useUpdateCompensation()
  const updateAssignmentCompensationMutation = useUpdateAssignmentCompensation()
  const batchUpdateMutation = useBatchUpdateCompensations()

  const [kilometers, setKilometers] = useState('')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<{ kilometers?: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isDistanceEditable, setIsDistanceEditable] = useState(true)
  const [applyToSameHall, setApplyToSameHall] = useState(false)

  // Determine if we're editing an assignment or a compensation record
  const isAssignmentEdit = !!assignment && !compensation

  // Track saving state to disable buttons during save
  const isSaving =
    updateCompensationMutation.isPending ||
    updateAssignmentCompensationMutation.isPending ||
    batchUpdateMutation.isPending

  // Get the compensation ID from the compensation record
  // Assignments don't have convocationCompensation, only CompensationRecord does
  const compensationId = compensation?.convocationCompensation?.__identity

  // Get hall information for "apply to same hall" feature
  const hallId = compensation?.refereeGame?.game?.hall?.__identity
  const hallName = compensation?.refereeGame?.game?.hall?.name

  // Find other editable compensations at the same hall (only for compensation edits, not assignment edits)
  const otherCompensationsAtSameHall = useMemo(() => {
    if (isAssignmentEdit || !isOpen) return []
    return findOtherEditableCompensationsAtSameHall(compensationId, hallId, queryClient)
  }, [isAssignmentEdit, isOpen, compensationId, hallId, queryClient])

  // Fetch detailed compensation data when modal opens
  useEffect(() => {
    if (!isOpen) return

    // For assignment edits in demo mode, load from stored assignment compensations
    if (isAssignmentEdit && dataSource === 'demo' && assignment) {
      const storedData = getAssignmentCompensation(assignment.__identity)
      if (storedData) {
        if (storedData.distanceInMetres !== undefined && storedData.distanceInMetres > 0) {
          setKilometers(formatDistanceKm(storedData.distanceInMetres))
        }
        if (storedData.correctionReason) {
          setReason(storedData.correctionReason)
        }
        logger.debug(
          '[EditCompensationModal] Loaded assignment compensation from store:',
          storedData
        )
      }
      // Check if distance is editable based on hasFlexibleTravelExpenses from assignment's compensation
      // Demo mode defaults to editable (true) unless explicitly set to false
      const hasFlexibleTravelExpenses = (
        assignment.convocationCompensation as { hasFlexibleTravelExpenses?: boolean } | undefined
      )?.hasFlexibleTravelExpenses
      setIsDistanceEditable(hasFlexibleTravelExpenses !== false)
      return
    }

    // For assignment edits in production/calendar mode, find compensation by game number
    if (isAssignmentEdit && dataSource !== 'demo' && assignment) {
      const gameNumber = assignment.refereeGame?.game?.number
      if (!gameNumber) {
        logger.debug(
          '[EditCompensationModal] Assignment has no game number, cannot fetch compensation'
        )
        return
      }

      let cancelled = false

      const fetchDetailsForAssignment = async () => {
        setIsLoading(true)
        setFetchError(null)
        const apiClient = getApiClient(dataSource)

        try {
          // Try to find compensation in cache first
          let foundCompensationId = findCompensationInCache(gameNumber, queryClient)
            ?.convocationCompensation?.__identity

          // If not in cache, fetch compensations from API
          if (!foundCompensationId) {
            const compensations = await apiClient.searchCompensations({
              limit: COMPENSATION_LOOKUP_LIMIT,
            })
            if (cancelled) return

            const matchingComp = compensations.items.find(
              (c) => c.refereeGame?.game?.number === gameNumber
            )
            foundCompensationId = matchingComp?.convocationCompensation?.__identity
          }

          if (!foundCompensationId) {
            // No compensation found for this assignment - this is OK for future games
            // that haven't had compensation recorded yet
            logger.debug(
              '[EditCompensationModal] No compensation found for game number:',
              gameNumber
            )
            return
          }

          // Fetch detailed compensation data
          const details = await apiClient.getCompensationDetails(foundCompensationId)
          if (cancelled) return

          const distanceInMetres = details.convocationCompensation?.distanceInMetres
          if (distanceInMetres !== undefined && distanceInMetres > 0) {
            setKilometers(formatDistanceKm(distanceInMetres))
          }

          const existingReason = details.convocationCompensation?.correctionReason
          if (existingReason) {
            setReason(existingReason)
          }

          // Check if distance is editable based on hasFlexibleTravelExpenses
          // When false, the backend (volleymanager) does not allow editing the distance
          const hasFlexibleTravelExpenses =
            details.convocationCompensation?.hasFlexibleTravelExpenses
          setIsDistanceEditable(hasFlexibleTravelExpenses !== false)

          logger.debug(
            '[EditCompensationModal] Loaded compensation details for assignment:',
            details
          )
        } catch (error) {
          if (cancelled) return

          logger.error(
            '[EditCompensationModal] Failed to fetch compensation details for assignment:',
            error
          )
          const errorMessage = error instanceof Error ? error.message : ''
          const knownErrorKeys = Object.values(COMPENSATION_ERROR_KEYS)
          const isKnownErrorKey = knownErrorKeys.includes(errorMessage as CompensationErrorKey)
          setFetchError(
            isKnownErrorKey
              ? t(errorMessage as CompensationErrorKey)
              : errorMessage || t('assignments.failedToLoadData')
          )
        } finally {
          if (!cancelled) {
            setIsLoading(false)
          }
        }
      }

      fetchDetailsForAssignment()
      return () => {
        cancelled = true
      }
    }

    // For compensation record edits, fetch from API using the compensation ID directly
    if (!compensationId) return

    let cancelled = false

    const fetchDetails = async () => {
      setIsLoading(true)
      setFetchError(null)
      const apiClient = getApiClient(dataSource)

      try {
        const details = await apiClient.getCompensationDetails(compensationId)
        if (cancelled) return

        // Pre-fill form with existing values
        const distanceInMetres = details.convocationCompensation?.distanceInMetres
        if (distanceInMetres !== undefined && distanceInMetres > 0) {
          setKilometers(formatDistanceKm(distanceInMetres))
        }

        const existingReason = details.convocationCompensation?.correctionReason
        if (existingReason) {
          setReason(existingReason)
        }

        // Check if distance is editable based on hasFlexibleTravelExpenses
        // When false, the backend (volleymanager) does not allow editing the distance
        const hasFlexibleTravelExpenses = details.convocationCompensation?.hasFlexibleTravelExpenses
        setIsDistanceEditable(hasFlexibleTravelExpenses !== false)

        logger.debug('[EditCompensationModal] Loaded compensation details:', details)
      } catch (error) {
        if (cancelled) return

        logger.error('[EditCompensationModal] Failed to fetch compensation details:', error)
        // Check if error message is a known i18n key and translate it
        const errorMessage = error instanceof Error ? error.message : ''
        const knownErrorKeys = Object.values(COMPENSATION_ERROR_KEYS)
        const isKnownErrorKey = knownErrorKeys.includes(errorMessage as CompensationErrorKey)
        setFetchError(
          isKnownErrorKey
            ? t(errorMessage as CompensationErrorKey)
            : errorMessage || t('assignments.failedToLoadData')
        )
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchDetails()
    return () => {
      cancelled = true
    }
  }, [
    isOpen,
    compensationId,
    dataSource,
    isAssignmentEdit,
    assignment,
    getAssignmentCompensation,
    queryClient,
    t,
  ])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setKilometers('')
      setReason('')
      setErrors({})
      setFetchError(null)
      setIsDistanceEditable(true)
      setApplyToSameHall(false)
    }
  }, [isOpen])

  /**
   * Handles batch update success/failure and shows appropriate toast message.
   */
  const handleBatchUpdateResult = useCallback(
    (result: BatchUpdateResult) => {
      // Total updated = current compensation + batch results
      const totalUpdated = 1 + result.successCount

      if (result.failedCount === 0) {
        // All succeeded
        toast.success(
          tInterpolate('compensations.batchUpdateSuccess', { count: String(totalUpdated) })
        )
      } else {
        // Partial success
        toast.warning(
          tInterpolate('compensations.batchUpdatePartialSuccess', {
            success: String(totalUpdated),
            total: String(1 + result.totalCount),
            failed: String(result.failedCount),
          })
        )
      }
    },
    [tInterpolate]
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      setErrors({})

      const km = parseLocalizedNumber(kilometers)
      if (kilometers && (isNaN(km) || km < 0)) {
        setErrors({ kilometers: t('assignments.invalidKilometers') })
        return
      }

      const updateData: { distanceInMetres?: number; correctionReason?: string } = {}

      if (kilometers) {
        updateData.distanceInMetres = kilometresToMetres(km)
      }
      if (reason) {
        updateData.correctionReason = reason
      }

      if (Object.keys(updateData).length > 0) {
        if (isAssignmentEdit && assignment) {
          // Use assignment-specific mutation for assignments
          updateAssignmentCompensationMutation.mutate(
            { assignmentId: assignment.__identity, data: updateData },
            {
              onSuccess: () => {
                logger.debug('[EditCompensationModal] Updated assignment compensation:', {
                  assignmentId: assignment.__identity,
                  ...updateData,
                })
                toast.success(t('compensations.saveSuccess'))
                onClose()
              },
              onError: (error) => {
                logger.error('[EditCompensationModal] Failed to update assignment compensation:', {
                  assignmentId: assignment.__identity,
                  error,
                })
                toast.error(t('compensations.saveError'))
              },
            }
          )
        } else if (compensationId) {
          // Use compensation mutation for compensation records
          updateCompensationMutation.mutate(
            { compensationId, data: updateData },
            {
              onSuccess: () => {
                logger.debug('[EditCompensationModal] Updated compensation:', {
                  compensationId,
                  ...updateData,
                })

                // If "apply to same hall" is checked and we have distance data, batch update others
                if (
                  applyToSameHall &&
                  updateData.distanceInMetres &&
                  otherCompensationsAtSameHall.length > 0
                ) {
                  const otherIds = otherCompensationsAtSameHall
                    .map((c) => c.convocationCompensation?.__identity)
                    .filter((id): id is string => !!id)

                  // Only update distance for batch (not correction reason)
                  const batchData = { distanceInMetres: updateData.distanceInMetres }

                  batchUpdateMutation.mutate(
                    { compensationIds: otherIds, data: batchData },
                    {
                      onSuccess: (result) => {
                        handleBatchUpdateResult(result)
                        onClose()
                      },
                      onError: (error) => {
                        logger.error('[EditCompensationModal] Batch update failed:', error)
                        // Primary update succeeded, but batch failed
                        toast.warning(
                          tInterpolate('compensations.batchUpdatePartialSuccess', {
                            success: '1',
                            total: String(1 + otherIds.length),
                            failed: String(otherIds.length),
                          })
                        )
                        onClose()
                      },
                    }
                  )
                } else {
                  toast.success(t('compensations.saveSuccess'))
                  onClose()
                }
              },
              onError: (error) => {
                logger.error('[EditCompensationModal] Failed to update compensation:', {
                  compensationId,
                  error,
                })
                toast.error(t('compensations.saveError'))
              },
            }
          )
        }
      } else {
        // No changes to save, just close
        onClose()
      }
    },
    [
      assignment,
      compensationId,
      kilometers,
      reason,
      isAssignmentEdit,
      updateAssignmentCompensationMutation,
      updateCompensationMutation,
      batchUpdateMutation,
      applyToSameHall,
      otherCompensationsAtSameHall,
      handleBatchUpdateResult,
      onClose,
      t,
      tInterpolate,
    ]
  )

  // Type safety: Ensure at least one of assignment or compensation is provided
  if (isOpen && !assignment && !compensation) {
    logger.error('[EditCompensationModal] Modal opened without assignment or compensation')
    return null
  }

  let homeTeam = t('common.tbd')
  let awayTeam = t('common.tbd')

  if (assignment) {
    ;({ homeTeam, awayTeam } = getTeamNames(assignment))
  } else if (compensation) {
    ;({ homeTeam, awayTeam } = getTeamNamesFromCompensation(compensation))
  }

  const modalTitleId = 'edit-compensation-title'
  const subtitle = `${homeTeam} ${t('common.vs')} ${awayTeam}`

  return (
    <Modal isOpen={isOpen} onClose={onClose} titleId={modalTitleId} size="md" isLoading={isLoading}>
      <ModalErrorBoundary modalName="EditCompensationModal" onClose={onClose}>
        <ModalHeader
          title={t('assignments.editCompensation')}
          titleId={modalTitleId}
          subtitle={subtitle}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
            <LoadingSpinner size="md" />
          </div>
        ) : fetchError ? (
          <div className="py-6 text-center" role="alert">
            <p className="text-danger-600 dark:text-danger-400 mb-4">{fetchError}</p>
            <Button variant="secondary" onClick={onClose}>
              {t('common.close')}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="kilometers"
                className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1"
              >
                {t('assignments.kilometers')}
              </label>
              <div className="relative">
                <input
                  id="kilometers"
                  type="text"
                  inputMode="decimal"
                  pattern={DECIMAL_INPUT_PATTERN}
                  value={kilometers}
                  onChange={(e) => setKilometers(e.target.value)}
                  disabled={!isDistanceEditable}
                  className={`w-full px-3 py-2 pr-10 border border-border-strong dark:border-border-strong-dark rounded-md bg-surface-card dark:bg-surface-subtle-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500 ${!isDistanceEditable ? 'opacity-50 cursor-not-allowed' : ''}`}
                  aria-invalid={errors.kilometers ? 'true' : 'false'}
                  aria-describedby={
                    errors.kilometers
                      ? 'kilometers-error'
                      : !isDistanceEditable
                        ? 'kilometers-readonly-hint'
                        : undefined
                  }
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted dark:text-text-muted-dark text-sm pointer-events-none">
                  {t('common.distanceUnit')}
                </span>
              </div>
              {errors.kilometers && (
                <p
                  id="kilometers-error"
                  className="mt-1 text-sm text-danger-600 dark:text-danger-400"
                >
                  {errors.kilometers}
                </p>
              )}
              {!isDistanceEditable && (
                <p
                  id="kilometers-readonly-hint"
                  className="mt-1 text-sm text-text-muted dark:text-text-muted-dark"
                >
                  {t('compensations.distanceNotEditable')}
                </p>
              )}
            </div>

            {/* Apply to same hall checkbox - only shown for compensation edits with other games at same hall */}
            {!isAssignmentEdit &&
              isDistanceEditable &&
              otherCompensationsAtSameHall.length > 0 &&
              hallName && (
                <div className="flex items-start gap-3 p-3 bg-surface-subtle dark:bg-surface-subtle-dark rounded-md">
                  <input
                    id="apply-to-same-hall"
                    type="checkbox"
                    checked={applyToSameHall}
                    onChange={(e) => setApplyToSameHall(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border-strong dark:border-border-strong-dark text-primary-600 focus:ring-primary-500 focus:ring-2"
                  />
                  <label
                    htmlFor="apply-to-same-hall"
                    className="text-sm text-text-secondary dark:text-text-secondary-dark cursor-pointer"
                  >
                    <span className="block font-medium text-text-primary dark:text-text-primary-dark">
                      {tInterpolate('compensations.applyToSameHall', { hallName })}
                    </span>
                    <span className="text-text-muted dark:text-text-muted-dark">
                      {tInterpolate('compensations.applyToSameHallCount', {
                        count: String(otherCompensationsAtSameHall.length),
                      })}
                    </span>
                  </label>
                </div>
              )}

            <div>
              <label
                htmlFor="reason"
                className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1"
              >
                {t('assignments.reason')}
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-border-strong dark:border-border-strong-dark rounded-md bg-surface-card dark:bg-surface-subtle-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder={t('assignments.reasonPlaceholder')}
              />
            </div>

            <ModalFooter>
              <Button variant="secondary" className="flex-1" onClick={onClose} disabled={isSaving}>
                {t('common.close')}
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                type="submit"
                disabled={isSaving}
                loading={isSaving}
              >
                {t('common.save')}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalErrorBoundary>
    </Modal>
  )
}

export const EditCompensationModal = memo(EditCompensationModalComponent)
