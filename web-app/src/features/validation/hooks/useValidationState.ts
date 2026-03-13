import { useState, useCallback, useMemo, useRef, useEffect } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { getApiClient } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { ValidatedPersonSearchResult } from '@/api/validation'
import type { RosterPanelModifications } from '@/features/validation/components/RosterVerificationPanel'
import { ASSIGNMENTS_STALE_TIME_MS } from '@/shared/hooks/usePaginatedQuery'
import { useAuthStore } from '@/shared/stores/auth'
import type { PendingScorerData } from '@/shared/stores/demo'
import { logger } from '@/shared/utils/logger'

import {
  type ValidationState,
  type PanelCompletionStatus,
  type ValidatedGameInfo,
  type UseValidationStateResult,
  createInitialState,
} from './types'
import {
  hasRosterModifications,
  saveRosterModifications,
  saveScorerSelection,
  finalizeRoster,
  finalizeScoresheetWithFile,
} from '../api/api-helpers'

// Re-export types for consumers
export type {
  RosterPanelState,
  ScorerPanelState,
  ScoresheetPanelState,
  ValidationState,
  PanelCompletionStatus,
  ValidatedGameInfo,
  UseValidationStateResult,
} from './types'

// Re-export for consumers of this hook
export type { PendingScorerData as PendingScorerInfo } from '@/shared/stores/demo'

/**
 * Hook to manage validation state across all panels in the ValidateGameModal.
 *
 * Tracks:
 * - Completion status for each panel
 * - Dirty state (whether any changes have been made)
 * - All panel data (rosters, scorer, scoresheet)
 *
 * Completion rules:
 * - Home/Away Roster: Complete when reviewed (even if unchanged)
 * - Scorer: Complete when a scorer is selected
 * - Scoresheet: Always complete (optional field)
 *
 * @param gameId - Optional game ID for API operations. Required for save/finalize.
 */
export function useValidationState(gameId?: string): UseValidationStateResult {
  const [state, setState] = useState<ValidationState>(createInitialState)
  const [isSaving, setIsSaving] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const isSavingRef = useRef(false)
  const isFinalizingRef = useRef(false)
  const uploadedFileResourceIdRef = useRef<string | undefined>(undefined)

  const dataSource = useAuthStore((s) => s.dataSource)
  const apiClient = getApiClient(dataSource)
  const queryClient = useQueryClient()

  // Fetch game details (scoresheet and nomination list IDs)
  const gameDetailsQuery = useQuery({
    queryKey: queryKeys.validation.gameDetail(gameId ?? ''),
    queryFn: async () => {
      if (!gameId) return null
      return apiClient.getGameWithScoresheet(gameId)
    },
    enabled: !!gameId,
    staleTime: ASSIGNMENTS_STALE_TIME_MS,
  })

  const completionStatus = useMemo<PanelCompletionStatus>(
    () => ({
      homeRoster: state.homeRoster.reviewed,
      awayRoster: state.awayRoster.reviewed,
      scorer: state.scorer.selected !== null,
      scoresheet: true,
    }),
    [state.homeRoster.reviewed, state.awayRoster.reviewed, state.scorer.selected]
  )

  const isAllRequiredComplete = useMemo(
    () => completionStatus.homeRoster && completionStatus.awayRoster && completionStatus.scorer,
    [completionStatus]
  )

  // Whether the scoresheet is independently closed (scorer + scoresheet finalized)
  const isScoresheetClosed = useMemo(
    () => !!gameDetailsQuery.data?.scoresheet?.closedAt,
    [gameDetailsQuery.data]
  )

  // A game is fully validated when ALL forms are closed:
  // both nomination lists (rosters) + scoresheet
  const isValidated = useMemo(() => {
    const data = gameDetailsQuery.data
    return !!(
      data?.nominationListOfTeamHome?.closed &&
      data?.nominationListOfTeamAway?.closed &&
      data?.scoresheet?.closedAt
    )
  }, [gameDetailsQuery.data])

  const validatedInfo = useMemo<ValidatedGameInfo | null>(() => {
    if (!isValidated) return null
    const scoresheet = gameDetailsQuery.data?.scoresheet
    if (!scoresheet?.closedAt) return null
    // Cast to include birthday which is available in demo mode
    const writerPerson = scoresheet.writerPerson as
      | { displayName?: string; birthday?: string }
      | undefined
    return {
      validatedAt: scoresheet.closedAt,
      scorerName: writerPerson?.displayName ?? 'Unknown',
      scorerBirthday: writerPerson?.birthday,
      hasScoresheet: !!scoresheet.hasFile,
    }
  }, [gameDetailsQuery.data, isValidated])

  const pendingScorer = useMemo<PendingScorerData | null>(() => {
    if (isValidated) return null
    // Cast to include birthday which is available in demo mode
    const writerPerson = gameDetailsQuery.data?.scoresheet?.writerPerson as
      | { __identity?: string; displayName?: string; birthday?: string }
      | undefined
    if (!writerPerson?.__identity) return null
    return {
      __identity: writerPerson.__identity,
      displayName: writerPerson.displayName ?? 'Unknown',
      birthday: writerPerson.birthday,
    }
  }, [gameDetailsQuery.data, isValidated])

  const scoresheetNotRequired = useMemo(
    () => gameDetailsQuery.data?.group?.hasNoScoresheet ?? false,
    [gameDetailsQuery.data]
  )

  const homeNominationList = useMemo(
    () => gameDetailsQuery.data?.nominationListOfTeamHome ?? null,
    [gameDetailsQuery.data?.nominationListOfTeamHome]
  )

  const awayNominationList = useMemo(
    () => gameDetailsQuery.data?.nominationListOfTeamAway ?? null,
    [gameDetailsQuery.data?.nominationListOfTeamAway]
  )

  // Existing scoresheet file info (from a previous save/upload)
  const existingScoresheetUrl = useMemo(
    () => gameDetailsQuery.data?.scoresheet?.file?.publicResourceUri ?? null,
    [gameDetailsQuery.data]
  )

  const existingFileResourceId = useMemo(
    () => gameDetailsQuery.data?.scoresheet?.file?.__identity ?? null,
    [gameDetailsQuery.data]
  )

  // Pre-fill the uploaded file resource ID ref when an existing scoresheet file exists.
  // This ensures that save/finalize operations reuse the existing file reference
  // instead of requiring a new upload when the user hasn't changed the scoresheet.
  useEffect(() => {
    if (existingFileResourceId && !uploadedFileResourceIdRef.current) {
      uploadedFileResourceIdRef.current = existingFileResourceId
    }
  }, [existingFileResourceId])

  const isDirty = useMemo(() => {
    return (
      hasRosterModifications(state.homeRoster.playerModifications) ||
      hasRosterModifications(state.awayRoster.playerModifications) ||
      state.homeRoster.coachModifications.added.size > 0 ||
      state.homeRoster.coachModifications.removed.size > 0 ||
      state.awayRoster.coachModifications.added.size > 0 ||
      state.awayRoster.coachModifications.removed.size > 0 ||
      state.scorer.selected !== null ||
      state.scoresheet.file !== null
    )
  }, [state])

  const setHomeRosterModifications = useCallback((modifications: RosterPanelModifications) => {
    setState((prev) => ({
      ...prev,
      homeRoster: {
        ...prev.homeRoster,
        playerModifications: modifications.players,
        coachModifications: modifications.coaches,
        reviewed: true,
      },
    }))
  }, [])

  const setAwayRosterModifications = useCallback((modifications: RosterPanelModifications) => {
    setState((prev) => ({
      ...prev,
      awayRoster: {
        ...prev.awayRoster,
        playerModifications: modifications.players,
        coachModifications: modifications.coaches,
        reviewed: true,
      },
    }))
  }, [])

  const setScorer = useCallback((scorer: ValidatedPersonSearchResult | null) => {
    setState((prev) => ({ ...prev, scorer: { selected: scorer } }))
  }, [])

  const setScoresheet = useCallback((file: File | null, uploaded: boolean) => {
    setState((prev) => {
      // Revoke previous reference image URL only if it's an object URL (blob:)
      if (prev.referenceImageUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(prev.referenceImageUrl)
      }
      // Create new reference image URL for image files
      const referenceImageUrl =
        file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      return { ...prev, scoresheet: { file, uploaded }, referenceImageUrl }
    })
  }, [])

  const setReferenceImageUrl = useCallback((url: string | null) => {
    setState((prev) => {
      // Revoke previous reference image URL only if it's an object URL (blob:)
      if (prev.referenceImageUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(prev.referenceImageUrl)
      }
      return { ...prev, referenceImageUrl: url }
    })
  }, [])

  const reset = useCallback(() => {
    setState((prev) => {
      if (prev.referenceImageUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(prev.referenceImageUrl)
      }
      return createInitialState()
    })
  }, [])

  // Track latest reference image URL for cleanup on unmount
  const referenceImageUrlRef = useRef<string | null>(null)

  useEffect(() => {
    referenceImageUrlRef.current = state.referenceImageUrl
  }, [state.referenceImageUrl])

  // Cleanup reference image URL on unmount (only revoke blob URLs)
  useEffect(() => {
    return () => {
      if (referenceImageUrlRef.current?.startsWith('blob:')) {
        URL.revokeObjectURL(referenceImageUrlRef.current)
      }
    }
  }, [])

  const saveProgress = useCallback(async (): Promise<void> => {
    if (isSavingRef.current) {
      logger.debug('[VS] save skip: in progress')
      return
    }

    isSavingRef.current = true
    setIsSaving(true)

    try {
      const gameDetails = gameDetailsQuery.data
      if (!gameId || !gameDetails) {
        logger.warn('[VS] no game data for save')
        return
      }

      // DIAGNOSTIC: log scoresheet state to debug missing PUT/POST (see #924)
      logger.debug('[VS] saveProgress: scoresheet data from API', {
        hasScoresheet: !!gameDetails.scoresheet,
        scoresheetId: gameDetails.scoresheet?.__identity,
        scorerId: state.scorer.selected?.__identity,
        hasNoScoresheet: gameDetails.group?.hasNoScoresheet,
      })

      // Upload scoresheet file if present (cache the resource ID to avoid re-upload on finalize)
      // Skip upload and file reference entirely when scoresheet is not required for this group
      let fileResourceId: string | undefined
      if (!scoresheetNotRequired) {
        fileResourceId = uploadedFileResourceIdRef.current
        if (!fileResourceId && state.scoresheet.file) {
          const uploadResult = await apiClient.uploadResource(state.scoresheet.file)
          fileResourceId = uploadResult[0]?.__identity
          uploadedFileResourceIdRef.current = fileResourceId
          logger.debug('[VS] PDF uploaded:', fileResourceId)
        }
      }

      await saveRosterModifications(
        apiClient,
        gameId,
        gameDetails.nominationListOfTeamHome,
        state.homeRoster.playerModifications,
        state.homeRoster.coachModifications
      )
      await saveRosterModifications(
        apiClient,
        gameId,
        gameDetails.nominationListOfTeamAway,
        state.awayRoster.playerModifications,
        state.awayRoster.coachModifications
      )
      await saveScorerSelection(
        apiClient,
        gameId,
        gameDetails.scoresheet,
        state.scorer.selected?.__identity,
        fileResourceId
      )

      // Invalidate cache so reopening shows the saved data
      await queryClient.invalidateQueries({ queryKey: queryKeys.validation.gameDetail(gameId) })
      logger.debug('[VS] save done')
    } catch (error) {
      logger.error('[VS] save failed:', error)
      throw error
    } finally {
      isSavingRef.current = false
      setIsSaving(false)
    }
  }, [gameId, gameDetailsQuery.data, state, apiClient, queryClient, scoresheetNotRequired])

  const finalizeValidation = useCallback(async (): Promise<void> => {
    if (isFinalizingRef.current) {
      logger.debug('[VS] finalize skip: in progress')
      return
    }

    isFinalizingRef.current = true
    setIsFinalizing(true)

    try {
      const gameDetails = gameDetailsQuery.data
      if (!gameId || !gameDetails) {
        logger.warn('[VS] no game data for finalize')
        return
      }

      // Reuse cached file resource ID from saveProgress if available
      // Skip upload and file reference entirely when scoresheet is not required for this group
      let fileResourceId: string | undefined
      if (!scoresheetNotRequired) {
        fileResourceId = uploadedFileResourceIdRef.current
        if (!fileResourceId && state.scoresheet.file) {
          const uploadResult = await apiClient.uploadResource(state.scoresheet.file)
          fileResourceId = uploadResult[0]?.__identity
          uploadedFileResourceIdRef.current = fileResourceId
          logger.debug('[VS] PDF uploaded:', fileResourceId)
        }
      }

      await finalizeRoster(
        apiClient,
        gameId,
        gameDetails.nominationListOfTeamHome,
        state.homeRoster.playerModifications,
        state.homeRoster.coachModifications
      )
      await finalizeRoster(
        apiClient,
        gameId,
        gameDetails.nominationListOfTeamAway,
        state.awayRoster.playerModifications,
        state.awayRoster.coachModifications
      )

      // Save scorer/scoresheet first to ensure the scoresheet record exists on the
      // server. Without safe-mode, saveProgress() is never called so the scoresheet
      // may not have been created yet, causing finalizeScoresheetWithFile to silently
      // skip due to a missing scoresheet identity.
      await saveScorerSelection(
        apiClient,
        gameId,
        gameDetails.scoresheet,
        state.scorer.selected?.__identity,
        fileResourceId
      )

      // Re-fetch game details to pick up the scoresheet identity created by the save
      const freshGameDetails = await apiClient.getGameWithScoresheet(gameId)
      if (!freshGameDetails.scoresheet?.__identity) {
        throw new Error('Scoresheet was not created after save — cannot finalize')
      }

      await finalizeScoresheetWithFile(
        apiClient,
        gameId,
        freshGameDetails.scoresheet,
        state.scorer.selected?.__identity,
        fileResourceId
      )

      await queryClient.invalidateQueries({ queryKey: queryKeys.validation.gameDetail(gameId!) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.assignments.lists() })
      logger.debug('[VS] finalize done')
    } catch (error) {
      logger.error('[VS] finalize failed:', error)
      throw error
    } finally {
      isFinalizingRef.current = false
      setIsFinalizing(false)
    }
  }, [gameId, gameDetailsQuery.data, state, apiClient, queryClient, scoresheetNotRequired])

  return {
    state,
    isDirty,
    completionStatus,
    isAllRequiredComplete,
    isValidated,
    isScoresheetClosed,
    validatedInfo,
    pendingScorer,
    scoresheetNotRequired,
    setHomeRosterModifications,
    setAwayRosterModifications,
    setScorer,
    setScoresheet,
    setReferenceImageUrl,
    referenceImageUrl: state.referenceImageUrl,
    reset,
    saveProgress,
    finalizeValidation,
    isSaving,
    isFinalizing,
    isLoadingGameDetails: gameDetailsQuery.isLoading,
    gameDetailsError: gameDetailsQuery.error,
    homeNominationList,
    awayNominationList,
    existingScoresheetUrl,
    existingFileResourceId,
  }
}
