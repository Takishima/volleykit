import { useState, useCallback, useMemo, useRef, useEffect } from 'react'

import { useQuery } from '@tanstack/react-query'

import { getApiClient } from '@/api/client'
import { gameDetailOptions } from '@/api/queryOptions'
import type { ValidatedPersonSearchResult } from '@/api/validation'
import type { RosterPanelModifications } from '@/features/validation/components/RosterVerificationPanel'
import { useAuthStore } from '@/shared/stores/auth'
import type { PendingScorerData } from '@/shared/stores/demo'

import {
  type ValidationState,
  type PanelCompletionStatus,
  type ValidatedGameInfo,
  type UseValidationStateResult,
  createInitialState,
} from './types'
import { useValidationActions } from './useValidationActions'
import { hasRosterModifications } from '../api/api-helpers'

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

  const dataSource = useAuthStore((s) => s.dataSource)
  const apiClient = getApiClient(dataSource)

  // Fetch game details (scoresheet and nomination list IDs)
  const gameDetailsQuery = useQuery({
    ...gameDetailOptions(apiClient, gameId ?? ''),
    enabled: !!gameId,
  })

  const completionStatus = useMemo<PanelCompletionStatus>(
    () => ({
      homeRoster: state.homeRoster.reviewed,
      awayRoster: state.awayRoster.reviewed,
      scorer: state.scorer.selected !== null || state.scorer.notFound,
      scoresheet: true,
    }),
    [
      state.homeRoster.reviewed,
      state.awayRoster.reviewed,
      state.scorer.selected,
      state.scorer.notFound,
    ]
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
    [gameDetailsQuery.data?.scoresheet?.file]
  )

  const existingFileResourceId = useMemo(
    () => gameDetailsQuery.data?.scoresheet?.file?.__identity ?? null,
    [gameDetailsQuery.data?.scoresheet?.file]
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
    setState((prev) => ({ ...prev, scorer: { ...prev.scorer, selected: scorer, notFound: false } }))
  }, [])

  const setScorerNotFound = useCallback((notFound: boolean) => {
    setState((prev) => ({
      ...prev,
      scorer: { selected: notFound ? null : prev.scorer.selected, notFound },
    }))
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

  // Delegate API operations to the actions hook
  const { saveProgress, finalizeValidation, isSaving, isFinalizing } = useValidationActions({
    gameId,
    state,
    scoresheetNotRequired,
    gameDetails: gameDetailsQuery.data,
    existingFileResourceId,
  })

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
    setScorerNotFound,
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
