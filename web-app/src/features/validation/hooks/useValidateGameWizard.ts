import { useState, useCallback, useEffect, useRef, useMemo } from 'react'

import type { Assignment, NominationList } from '@/api/client'
import { useValidationState } from '@/features/validation/hooks/useValidationState'
import {
  validateBothRosters,
  type RosterValidationStatus,
} from '@/features/validation/utils/roster-validation'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { useWizardNavigation } from '@/shared/hooks/useWizardNavigation'
import { useAuthStore } from '@/shared/stores/auth'
import { useSettingsStore } from '@/shared/stores/settings'
import { logger } from '@/shared/utils/logger'

/** Duration to show success toast before auto-dismissing */
const SUCCESS_TOAST_DURATION_MS = 3000

export type ValidationStepId = 'home-roster' | 'away-roster' | 'scorer' | 'scoresheet'

export interface ValidationStep {
  id: ValidationStepId
  label: string
  isOptional?: boolean
  /** Whether the step has validation errors (e.g., insufficient players/coaches) */
  isInvalid?: boolean
}

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

  // Safe mode state
  /** True when safe mode is enabled and not in demo mode - modal is read-only */
  isInSafeMode: boolean

  // Validation state
  validationState: ReturnType<typeof useValidationState>['state']
  isDirty: boolean
  completionStatus: ReturnType<typeof useValidationState>['completionStatus']
  isValidated: boolean
  validatedInfo: ReturnType<typeof useValidationState>['validatedInfo']
  pendingScorer: ReturnType<typeof useValidationState>['pendingScorer']
  scoresheetNotRequired: boolean
  setHomeRosterModifications: ReturnType<typeof useValidationState>['setHomeRosterModifications']
  setAwayRosterModifications: ReturnType<typeof useValidationState>['setAwayRosterModifications']
  setScorer: ReturnType<typeof useValidationState>['setScorer']
  setScoresheet: ReturnType<typeof useValidationState>['setScoresheet']
  isSaving: boolean
  isFinalizing: boolean
  isLoadingGameDetails: boolean
  gameDetailsError: Error | null
  homeNominationList: NominationList | null
  awayNominationList: NominationList | null

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
 * Encapsulates:
 * - Wizard navigation and step management
 * - UI state (dialogs, toasts, errors)
 * - Close/save/finalize logic
 * - All navigation handlers
 */
export function useValidateGameWizard({
  assignment,
  isOpen,
  onClose,
}: UseValidateGameWizardOptions): UseValidateGameWizardResult {
  const { t } = useTranslation()

  // UI state
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [showRosterWarningDialog, setShowRosterWarningDialog] = useState(false)
  const [showSafeValidationComplete, setShowSafeValidationComplete] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [isAddPlayerSheetOpen, setIsAddPlayerSheetOpen] = useState(false)

  // Check if safe mode or safe validation mode is enabled (only applies when not in demo mode)
  const dataSource = useAuthStore((s) => s.dataSource)
  const isSafeModeEnabled = useSettingsStore((s) => s.isSafeModeEnabled)
  const isSafeValidationEnabled = useSettingsStore((s) => s.isSafeValidationEnabled)
  const isInSafeMode = dataSource !== 'demo' && isSafeModeEnabled
  const useSafeValidation = dataSource !== 'demo' && isSafeValidationEnabled

  const gameId = assignment.refereeGame?.game?.__identity

  const {
    state: validationState,
    isDirty,
    completionStatus,
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
    isLoadingGameDetails,
    gameDetailsError,
    homeNominationList,
    awayNominationList,
  } = useValidationState(gameId)

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

  const wizardSteps = useMemo<ValidationStep[]>(
    () => [
      {
        id: 'home-roster',
        label: t('validation.homeRoster'),
        isInvalid: !rosterValidation.home.isValid,
      },
      {
        id: 'away-roster',
        label: t('validation.awayRoster'),
        isInvalid: !rosterValidation.away.isValid,
      },
      { id: 'scorer', label: t('validation.scorer') },
      { id: 'scoresheet', label: t('validation.scoresheet'), isOptional: true },
    ],
    [t, rosterValidation.home.isValid, rosterValidation.away.isValid]
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

  // Refs for tracking state without re-renders
  const isDirtyRef = useRef(isDirty)
  const isFinalizingRef = useRef(false)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep dirty ref in sync
  useEffect(() => {
    isDirtyRef.current = isDirty
  }, [isDirty])

  // Cleanup toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current)
        toastTimeoutRef.current = null
      }
    }
  }, [])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSaveError(null)
      setSuccessToast(null)
      setShowRosterWarningDialog(false)
      setShowSafeValidationComplete(false)
      reset()
      resetToStart()
    }
  }, [isOpen, reset, resetToStart])

  // Computed values
  const canMarkCurrentStepDone = useMemo(() => {
    const stepId = wizardSteps[currentStepIndex]?.id
    if (stepId === 'scorer') return completionStatus.scorer
    return true
  }, [currentStepIndex, wizardSteps, completionStatus.scorer])

  const allPreviousRequiredStepsDone = useMemo(() => {
    for (let i = 0; i < currentStepIndex; i++) {
      const step = wizardSteps[i]
      if (!step?.isOptional && !stepsMarkedDone.has(i)) {
        return false
      }
    }
    return true
  }, [wizardSteps, currentStepIndex, stepsMarkedDone])

  const isSwipeEnabled = !isFinalizing && !isLoadingGameDetails && !isAddPlayerSheetOpen

  // Handlers
  const attemptClose = useCallback(() => {
    if (isValidated) {
      onClose()
    } else if (isDirtyRef.current) {
      setShowUnsavedDialog(true)
    } else {
      onClose()
    }
  }, [onClose, isValidated])

  // Shared finalization logic used by both handleFinish and handleRosterWarningProceed
  const performFinalization = useCallback(async () => {
    isFinalizingRef.current = true
    setSaveError(null)

    try {
      if (useSafeValidation) {
        // Safe validation mode: save only, don't finalize
        await saveProgress()
        setShowSafeValidationComplete(true)
      } else {
        // Normal mode: finalize the validation
        await finalizeValidation()
        setSuccessToast(t('validation.state.saveSuccess'))
        toastTimeoutRef.current = setTimeout(() => {
          setSuccessToast(null)
        }, SUCCESS_TOAST_DURATION_MS)
        onClose()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('validation.state.saveError')
      setSaveError(message)
    } finally {
      isFinalizingRef.current = false
    }
  }, [useSafeValidation, saveProgress, finalizeValidation, t, onClose])

  const handleFinish = useCallback(async () => {
    if (isFinalizingRef.current) return

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
    wizardSteps,
    canMarkCurrentStepDone,
    allPreviousRequiredStepsDone,
    rosterValidation.allValid,
    currentStepIndex,
    setStepDone,
    performFinalization,
  ])

  const handleSaveAndClose = useCallback(async () => {
    try {
      await saveProgress()
      setShowUnsavedDialog(false)
      onClose()
    } catch (error) {
      logger.error('[ValidateGameModal] Save failed during close:', error)
      setSaveError(t('validation.state.saveError'))
      setShowUnsavedDialog(false)
    }
  }, [saveProgress, onClose, t])

  const handleDiscardAndClose = useCallback(() => {
    setShowUnsavedDialog(false)
    reset()
    onClose()
  }, [reset, onClose])

  const handleCancelClose = useCallback(() => {
    setShowUnsavedDialog(false)
  }, [])

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
    // Navigate to the first invalid roster step
    if (!rosterValidation.home.isValid) {
      goToStep(0) // Home roster
    } else if (!rosterValidation.away.isValid) {
      goToStep(1) // Away roster
    }
  }, [rosterValidation.home.isValid, rosterValidation.away.isValid, goToStep])

  const handleRosterWarningProceed = useCallback(async () => {
    // User chose to proceed despite invalid rosters (game will be forfeited)
    setShowRosterWarningDialog(false)

    const lastStep = wizardSteps[wizardSteps.length - 1]
    if (!lastStep?.isOptional) {
      setStepDone(currentStepIndex, true)
    }

    await performFinalization()
  }, [wizardSteps, currentStepIndex, setStepDone, performFinalization])

  const handleSafeValidationCompleteClose = useCallback(() => {
    setShowSafeValidationComplete(false)
    onClose()
  }, [onClose])

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

    // Safe mode state
    isInSafeMode,

    // Validation state
    validationState,
    isDirty,
    completionStatus,
    isValidated,
    validatedInfo,
    pendingScorer,
    scoresheetNotRequired,
    setHomeRosterModifications,
    setAwayRosterModifications,
    setScorer,
    setScoresheet,
    isSaving,
    isFinalizing,
    isLoadingGameDetails,
    gameDetailsError,
    homeNominationList,
    awayNominationList,

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
