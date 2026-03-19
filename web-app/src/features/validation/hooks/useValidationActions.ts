import { useState, useCallback, useRef, useEffect } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { getApiClient } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { useAuthStore } from '@/shared/stores/auth'
import { logger } from '@/shared/utils/logger'

import {
  saveRosterModifications,
  saveScorerSelection,
  finalizeRoster,
  finalizeScoresheetWithFile,
} from '../api/api-helpers'

import type { ValidationState } from './types'

interface UseValidationActionsParams {
  gameId?: string
  state: ValidationState
  scoresheetNotRequired: boolean
  gameDetails:
    | {
        nominationListOfTeamHome?: {
          __identity?: string
          team?: { __identity?: string }
          indoorPlayerNominations?: { __identity?: string }[]
          nominationListValidation?: { __identity?: string }
          coachPerson?: { __identity?: string }
          firstAssistantCoachPerson?: { __identity?: string }
          secondAssistantCoachPerson?: { __identity?: string }
          closed?: boolean
        }
        nominationListOfTeamAway?: {
          __identity?: string
          team?: { __identity?: string }
          indoorPlayerNominations?: { __identity?: string }[]
          nominationListValidation?: { __identity?: string }
          coachPerson?: { __identity?: string }
          firstAssistantCoachPerson?: { __identity?: string }
          secondAssistantCoachPerson?: { __identity?: string }
          closed?: boolean
        }
        scoresheet?: {
          __identity?: string
          isSimpleScoresheet?: boolean
          scoresheetValidation?: { __identity?: string }
          closedAt?: string | null
          file?: { __identity?: string; publicResourceUri?: string }
        }
        group?: { hasNoScoresheet?: boolean }
      }
    | undefined
  existingFileResourceId: string | null
}

export interface UseValidationActionsResult {
  saveProgress: () => Promise<void>
  finalizeValidation: () => Promise<void>
  isSaving: boolean
  isFinalizing: boolean
}

export function useValidationActions({
  gameId,
  state,
  scoresheetNotRequired,
  gameDetails,
  existingFileResourceId,
}: UseValidationActionsParams): UseValidationActionsResult {
  const [isSaving, setIsSaving] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const isSavingRef = useRef(false)
  const isFinalizingRef = useRef(false)
  const uploadedFileResourceIdRef = useRef<string | undefined>(undefined)

  const dataSource = useAuthStore((s) => s.dataSource)
  const apiClient = getApiClient(dataSource)
  const queryClient = useQueryClient()

  // Pre-fill the uploaded file resource ID ref when an existing scoresheet file exists.
  // This ensures that save/finalize operations reuse the existing file reference
  // instead of requiring a new upload when the user hasn't changed the scoresheet.
  // Skip when scoresheet is not required — file references should never be sent for those games.
  useEffect(() => {
    if (existingFileResourceId && !uploadedFileResourceIdRef.current && !scoresheetNotRequired) {
      uploadedFileResourceIdRef.current = existingFileResourceId
    }
  }, [existingFileResourceId, scoresheetNotRequired])

  const saveProgress = useCallback(async (): Promise<void> => {
    if (isSavingRef.current) {
      logger.debug('[VS] save skip: in progress')
      return
    }

    isSavingRef.current = true
    setIsSaving(true)

    try {
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
  }, [gameId, gameDetails, state, apiClient, queryClient, scoresheetNotRequired])

  const finalizeValidation = useCallback(async (): Promise<void> => {
    if (isFinalizingRef.current) {
      logger.debug('[VS] finalize skip: in progress')
      return
    }

    isFinalizingRef.current = true
    setIsFinalizing(true)

    try {
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
  }, [gameId, gameDetails, state, apiClient, queryClient, scoresheetNotRequired])

  return {
    saveProgress,
    finalizeValidation,
    isSaving,
    isFinalizing,
  }
}
