import { useState, useCallback, useEffect, useRef, useMemo } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import type { Assignment, NominationList } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { useTranslation } from '@/common/hooks/useTranslation'
import { useWizardNavigation } from '@/common/hooks/useWizardNavigation'
import { useAuthStore } from '@/common/stores/auth'
import { useSettingsStore } from '@/common/stores/settings'
import type { ValidatedGameInfo } from '@/features/validation/hooks/types'
import { useValidationState } from '@/features/validation/hooks/useValidationState'
import { useValidationSubmit } from '@/features/validation/hooks/useValidationSubmit'
import {
  validateBothRosters,
  type RosterValidationStatus,
} from '@/features/validation/utils/roster-validation'
import { isImageUrl } from '@/features/validation/utils/scoresheet'
import {
  type ValidationStep,
  type ValidationStepId,
  buildWizardSteps,
  canMarkStepDone,
  allPreviousRequiredDone,
  firstInvalidRosterStepIndex,
} from '@/features/validation/utils/wizard-steps'

// Re-export types so existing consumers continue to work
export type { ValidationStepId, ValidationStep } from '@/features/validation/utils/wizard-steps'

interface UseValidateGameWizardOptions {
  assignment: Assignment
  isOpen: boolean
  onClose: () => void
}

export interface UseValidateGameWizardResult {
  // Wizard navigation
  currentStepIndex: number
  currentStepId: ValidationStepId
  currentStep: ValidationStep
  totalSteps: number
  isFirstStep: boolean
  isLastStep: boolean
  stepsMarkedDone: ReadonlySet<number>
  goToStep: (index: number) => void
  wizardSteps: ValidationStep[]

  // Validation state
  validationState: ReturnType<typeof useValidationState>['state']
  isDirty: boolean
  completionStatus: ReturnType<typeof useValidationState>['completionStatus']
  isValidated: boolean
  /** Whether the current step is read-only due to its form being already finalized */
  isCurrentStepReadOnly: boolean
  validatedInfo: ReturnType<typeof useValidationState>['validatedInfo']
  pendingScorer: ReturnType<typeof useValidationState>['pendingScorer']
  scoresheetNotRequired: boolean
  referenceImageUrl: string | null
  setHomeRosterModifications: ReturnType<typeof useValidationState>['setHomeRosterModifications']
  setAwayRosterModifications: ReturnType<typeof useValidationState>['setAwayRosterModifications']
  setScorer: ReturnType<typeof useValidationState>['setScorer']
  setScorerNotFound: ReturnType<typeof useValidationState>['setScorerNotFound']
  setScoresheet: ReturnType<typeof useValidationState>['setScoresheet']
  isSaving: boolean
  isFinalizing: boolean
  isLoadingGameDetails: boolean
  gameDetailsError: Error | null
  homeNominationList: NominationList | null
  awayNominationList: NominationList | null
  existingScoresheetUrl: string | null

  // UI state
  showUnsavedDialog: boolean
  showRosterWarningDialog: boolean
  showSafeValidationComplete: boolean
  saveError: string | null
  successToast: string | null
  isAddPlayerSheetOpen: boolean

  // Roster validation
  rosterValidation: RosterValidationStatus

  // Computed values
  useSafeValidation: boolean
  canMarkCurrentStepDone: boolean
  allPreviousRequiredStepsDone: boolean
  isSwipeEnabled: boolean

  // Handlers
  attemptClose: () => void
  handleFinish: () => Promise<void>
  handleSaveAndClose: () => Promise<void>
  handleDiscardAndClose: () => void
  handleCancelClose: () => void
  goNext: () => void
  handleValidateAndNext: () => void
  goBack: () => void
  handleAddPlayerSheetOpenChange: (open: boolean) => void
  handleRosterWarningGoBack: () => void
  handleRosterWarningProceed: () => Promise<void>
  handleSafeValidationCompleteClose: () => void
}

/**
 * Hook to manage the validate game wizard state machine.
 *
 * Orchestrates:
 * - Wizard navigation and step management (via wizard-steps utils)
 * - Submission / save / finalize flows (via useValidationSubmit)
 * - Roster warning dialog
 * - Close-with-unsaved-changes flow
 */
export function useValidateGameWizard({
  assignment,
  isOpen,
  onClose,
}: UseValidateGameWizardOptions): UseValidateGameWizardResult {
  const { t } = useTranslation()

  // Local UI state not owned by sub-hooks
  const [showRosterWarningDialog, setShowRosterWarningDialog] = useState(false)
  const [isAddPlayerSheetOpen, setIsAddPlayerSheetOpen] = useState(false)

  // Check if safe mode is enabled (only applies when not in demo mode)
  // When safe mode is on, validation saves progress but does not finalize - user completes on VolleyManager
  const dataSource = useAuthStore((s) => s.dataSource)
  const isSafeModeEnabled = useSettingsStore((s) => s.isSafeModeEnabled)
  const useSafeValidation = dataSource !== 'demo' && isSafeModeEnabled

  const queryClient = useQueryClient()
  const gameId = assignment.refereeGame?.game?.__identity

  const {
    state: validationState,
    isDirty,
    completionStatus,
    isValidated: isValidatedFromQuery,
    isScoresheetClosed: isScoresheetClosedFromQuery,
    validatedInfo: validatedInfoFromQuery,
    pendingScorer,
    scoresheetNotRequired,
    setHomeRosterModifications,
    setAwayRosterModifications,
    setScorer,
    setScorerNotFound,
    setScoresheet,
    setReferenceImageUrl,
    referenceImageUrl,
    reset,
    saveProgress,
    finalizeValidation,
    isSaving,
    isFinalizing,
    isLoadingGameDetails,
    gameDetailsError,
    homeNominationList,
    awayNominationList,
    existingScoresheetUrl,
  } = useValidationState(gameId)

  // Submission / save / dialog logic
  const {
    showUnsavedDialog,
    showSafeValidationComplete,
    saveError,
    successToast,
    performFinalization,
    handleSaveAndClose,
    handleDiscardAndClose,
    handleCancelClose,
    handleSafeValidationCompleteClose,
    showUnsavedPrompt,
    resetUIState,
  } = useValidationSubmit({
    useSafeValidation,
    scorerNotFound: validationState.scorer.notFound,
    saveProgress,
    finalizeValidation,
    reset,
    onClose,
  })

  // The assignment list data may be fresher than the cached game details query.
  // When a game is validated externally on volleymanager, the assignment list
  // reflects closedAt immediately, but the game details query cache may still
  // have stale data. The assignment only carries scoresheet.closedAt — when
  // that's set, the game was fully validated externally (all forms closed).
  const assignmentClosedAt = assignment.refereeGame?.game?.scoresheet?.closedAt
  const isValidated = isValidatedFromQuery || !!assignmentClosedAt

  // Provide fallback validatedInfo from assignment data while game details refetch.
  // Once the game details query returns fresh data, validatedInfoFromQuery takes over.
  const validatedInfo: ValidatedGameInfo | null =
    validatedInfoFromQuery ??
    (assignmentClosedAt
      ? {
          validatedAt: assignmentClosedAt,
          scorerName: '—',
          scorerBirthday: undefined,
          hasScoresheet: false,
        }
      : null)

  // Compute roster validation status
  const rosterValidation = useMemo<RosterValidationStatus>(() => {
    return validateBothRosters(
      homeNominationList,
      validationState.homeRoster.playerModifications,
      validationState.homeRoster.coachModifications,
      awayNominationList,
      validationState.awayRoster.playerModifications,
      validationState.awayRoster.coachModifications
    )
  }, [
    homeNominationList,
    awayNominationList,
    validationState.homeRoster.playerModifications,
    validationState.homeRoster.coachModifications,
    validationState.awayRoster.playerModifications,
    validationState.awayRoster.coachModifications,
  ])

  // Per-step read-only detection based on individual form closure status.
  const isHomeRosterClosed = !!homeNominationList?.closed
  const isAwayRosterClosed = !!awayNominationList?.closed
  const isScoresheetClosed = isScoresheetClosedFromQuery || !!assignmentClosedAt

  const wizardSteps = useMemo<ValidationStep[]>(
    () =>
      buildWizardSteps(
        {
          scoresheet: t('validation.scoresheet'),
          homeRoster: t('validation.homeRoster'),
          awayRoster: t('validation.awayRoster'),
          scorer: t('validation.scorer'),
        },
        rosterValidation,
        { isHomeRosterClosed, isAwayRosterClosed, isScoresheetClosed }
      ),
    [t, rosterValidation, isHomeRosterClosed, isAwayRosterClosed, isScoresheetClosed]
  )

  const {
    currentStepIndex,
    currentStep,
    totalSteps,
    isFirstStep,
    isLastStep,
    goNext,
    goBack,
    goToStep,
    resetToStart,
    stepsMarkedDone,
    setStepDone,
  } = useWizardNavigation<ValidationStep>({
    steps: wizardSteps,
  })

  // Auto-mark read-only (already finalized) steps as done
  useEffect(() => {
    wizardSteps.forEach((step, index) => {
      if (step.isReadOnly) {
        setStepDone(index, true)
      }
    })
  }, [wizardSteps, setStepDone])

  const isCurrentStepReadOnly = currentStep.isReadOnly ?? false

  // Ref for dirty check in attemptClose (avoids re-render dependency)
  const isDirtyRef = useRef(isDirty)
  useEffect(() => {
    isDirtyRef.current = isDirty
  }, [isDirty])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      // Invalidate game details cache so we fetch fresh data.
      if (gameId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.validation.gameDetail(gameId) })
      }
      // Reset all transient UI state for a fresh wizard session.
      // These setState calls are intentional — they reset dialog/error/toast state
      // when the modal opens, matching the pattern from before the hook extraction.
      resetUIState()
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting UI on modal open
      setShowRosterWarningDialog(false)
      reset()
      resetToStart()
    }
  }, [isOpen, reset, resetToStart, gameId, queryClient, resetUIState])

  // Set reference image from existing scoresheet when game details load
  useEffect(() => {
    if (isOpen && existingScoresheetUrl && !referenceImageUrl) {
      if (isImageUrl(existingScoresheetUrl)) {
        setReferenceImageUrl(existingScoresheetUrl)
      }
    }
  }, [isOpen, existingScoresheetUrl, referenceImageUrl, setReferenceImageUrl])

  // Computed values (delegated to pure functions)
  const canMarkCurrentStepDone = useMemo(
    () => canMarkStepDone(wizardSteps[currentStepIndex]?.id, completionStatus.scorer),
    [currentStepIndex, wizardSteps, completionStatus.scorer]
  )

  const allPreviousRequiredStepsDone = useMemo(
    () => allPreviousRequiredDone(wizardSteps, currentStepIndex, stepsMarkedDone),
    [wizardSteps, currentStepIndex, stepsMarkedDone]
  )

  const isSwipeEnabled = !isFinalizing && !isLoadingGameDetails && !isAddPlayerSheetOpen

  // --- Handlers ---

  const attemptClose = useCallback(() => {
    if (isValidated) {
      onClose()
    } else if (isDirtyRef.current) {
      showUnsavedPrompt()
    } else {
      onClose()
    }
  }, [onClose, isValidated, showUnsavedPrompt])

  const handleFinish = useCallback(async () => {
    if (isFinalizing) return

    const lastStep = wizardSteps[wizardSteps.length - 1]
    if (!lastStep?.isOptional && !canMarkCurrentStepDone) return
    if (!allPreviousRequiredStepsDone) return

    // Check roster validation - show warning if invalid
    if (!rosterValidation.allValid) {
      setShowRosterWarningDialog(true)
      return
    }

    if (!lastStep?.isOptional) {
      setStepDone(currentStepIndex, true)
    }

    await performFinalization()
  }, [
    isFinalizing,
    wizardSteps,
    canMarkCurrentStepDone,
    allPreviousRequiredStepsDone,
    rosterValidation.allValid,
    currentStepIndex,
    setStepDone,
    performFinalization,
  ])

  const handleValidateAndNext = useCallback(() => {
    if (!canMarkCurrentStepDone) return
    setStepDone(currentStepIndex, true)
    goNext()
  }, [canMarkCurrentStepDone, setStepDone, currentStepIndex, goNext])

  const handleAddPlayerSheetOpenChange = useCallback((open: boolean) => {
    setIsAddPlayerSheetOpen(open)
  }, [])

  // Roster warning dialog handlers
  const handleRosterWarningGoBack = useCallback(() => {
    setShowRosterWarningDialog(false)
    const target = firstInvalidRosterStepIndex(rosterValidation)
    if (target !== null) {
      goToStep(target)
    }
  }, [rosterValidation, goToStep])

  const handleRosterWarningProceed = useCallback(async () => {
    setShowRosterWarningDialog(false)

    const lastStep = wizardSteps[wizardSteps.length - 1]
    if (!lastStep?.isOptional) {
      setStepDone(currentStepIndex, true)
    }

    await performFinalization()
  }, [wizardSteps, currentStepIndex, setStepDone, performFinalization])

  return {
    // Wizard navigation
    currentStepIndex,
    currentStepId: currentStep.id,
    currentStep,
    totalSteps,
    isFirstStep,
    isLastStep,
    stepsMarkedDone,
    goToStep,
    wizardSteps,

    // Validation state
    validationState,
    isDirty,
    completionStatus,
    isValidated,
    isCurrentStepReadOnly,
    validatedInfo,
    pendingScorer,
    scoresheetNotRequired,
    referenceImageUrl,
    setHomeRosterModifications,
    setAwayRosterModifications,
    setScorer,
    setScorerNotFound,
    setScoresheet,
    isSaving,
    isFinalizing,
    isLoadingGameDetails,
    gameDetailsError,
    homeNominationList,
    awayNominationList,
    existingScoresheetUrl,

    // UI state
    showUnsavedDialog,
    showRosterWarningDialog,
    showSafeValidationComplete,
    saveError,
    successToast,
    isAddPlayerSheetOpen,

    // Roster validation
    rosterValidation,

    // Computed values
    useSafeValidation,
    canMarkCurrentStepDone,
    allPreviousRequiredStepsDone,
    isSwipeEnabled,

    // Handlers
    attemptClose,
    handleFinish,
    handleSaveAndClose,
    handleDiscardAndClose,
    handleCancelClose,
    goNext,
    handleValidateAndNext,
    goBack,
    handleAddPlayerSheetOpenChange,
    handleRosterWarningGoBack,
    handleRosterWarningProceed,
    handleSafeValidationCompleteClose,
  }
}
