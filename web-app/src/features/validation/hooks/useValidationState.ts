import { useState, useCallback, useMemo, useRef } from 'react'

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

  const isValidated = useMemo(
    () => !!gameDetailsQuery.data?.scoresheet?.closedAt,
    [gameDetailsQuery.data]
  )

  const validatedInfo = useMemo<ValidatedGameInfo | null>(() => {
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
  }, [gameDetailsQuery.data])

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
    setState((prev) => ({ ...prev, scoresheet: { file, uploaded } }))
  }, [])

  const reset = useCallback(() => {
    setState(createInitialState())
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
      let fileResourceId = uploadedFileResourceIdRef.current
      if (!fileResourceId && state.scoresheet.file) {
        const uploadResult = await apiClient.uploadResource(state.scoresheet.file)
        fileResourceId = uploadResult[0]?.__identity
        uploadedFileResourceIdRef.current = fileResourceId
        logger.debug('[VS] PDF uploaded:', fileResourceId)
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
  }, [gameId, gameDetailsQuery.data, state, apiClient, queryClient])

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
      let fileResourceId = uploadedFileResourceIdRef.current
      if (!fileResourceId && state.scoresheet.file) {
        const uploadResult = await apiClient.uploadResource(state.scoresheet.file)
        fileResourceId = uploadResult[0]?.__identity
        uploadedFileResourceIdRef.current = fileResourceId
        logger.debug('[VS] PDF uploaded:', fileResourceId)
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
      await finalizeScoresheetWithFile(
        apiClient,
        gameId,
        gameDetails.scoresheet,
        state.scorer.selected?.__identity,
        fileResourceId
      )

      await queryClient.invalidateQueries({ queryKey: queryKeys.validation.gameDetail(gameId!) })
      logger.debug('[VS] finalize done')
    } catch (error) {
      logger.error('[VS] finalize failed:', error)
      throw error
    } finally {
      isFinalizingRef.current = false
      setIsFinalizing(false)
    }
  }, [gameId, gameDetailsQuery.data, state, apiClient, queryClient])

  return {
    state,
    isDirty,
    completionStatus,
    isAllRequiredComplete,
    isValidated,
    validatedInfo,
    pendingScorer,
    scoresheetNotRequired,
    setHomeRosterModifications,
    setAwayRosterModifications,
    setScorer,
    setScoresheet,
    reset,
    saveProgress,
    finalizeValidation,
    isSaving,
    isFinalizing,
    isLoadingGameDetails: gameDetailsQuery.isLoading,
    gameDetailsError: gameDetailsQuery.error,
    homeNominationList,
    awayNominationList,
  }
}
