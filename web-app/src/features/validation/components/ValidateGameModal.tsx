import { memo, useState, useCallback, useMemo } from 'react'

import { getTeamNames } from '@volleykit/shared/utils'

import type { Assignment, IndoorPlayerNomination, NominationList } from '@/api/client'
import type { RosterPlayer } from '@/features/validation/hooks/useNominationList'
import { useValidateGameWizard } from '@/features/validation/hooks/useValidateGameWizard'
import { Eye, EyeOff } from '@/shared/components/icons'
import { Modal } from '@/shared/components/Modal'
import { ModalHeader } from '@/shared/components/ModalHeader'
import { WizardStepContainer } from '@/shared/components/WizardStepContainer'
import { WizardStepIndicator } from '@/shared/components/WizardStepIndicator'
import { features } from '@/shared/config/features'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { useSettingsStore } from '@/shared/stores/settings'

import {
  UnsavedChangesDialog,
  RosterValidationWarningDialog,
  SafeValidationCompleteModal,
  ValidationSuccessToast,
  StepRenderer,
  ValidatedModeButtons,
  ReadOnlyStepButtons,
  EditModeButtons,
  OCREntryModal,
} from '.'

import type { CoachForComparison } from './OCREntryModal'

interface ValidateGameModalProps {
  assignment: Assignment
  isOpen: boolean
  onClose: () => void
}

/** Transform nomination list players to RosterPlayer format for OCR comparison */
function transformNominationsToRosterPlayers(
  nominations: IndoorPlayerNomination[] | undefined
): RosterPlayer[] {
  if (!nominations) return []

  const players: RosterPlayer[] = []

  for (const nomination of nominations) {
    const id = nomination.__identity
    const person = nomination.indoorPlayer?.person
    const displayName =
      person?.displayName ?? [person?.firstName, person?.lastName].filter(Boolean).join(' ')

    if (!id || !displayName) continue

    players.push({
      id,
      displayName,
      firstName: person?.firstName,
      lastName: person?.lastName,
    })
  }

  return players.sort((a, b) => a.displayName.localeCompare(b.displayName))
}

/** Transform nomination list coaches to CoachForComparison format for OCR comparison */
function transformNominationListToCoaches(
  nominationList: NominationList | null
): CoachForComparison[] {
  if (!nominationList) return []

  const coaches: CoachForComparison[] = []

  // Head coach
  const headCoach = nominationList.coachPerson
  if (headCoach?.__identity && headCoach.displayName) {
    coaches.push({
      id: headCoach.__identity,
      displayName: headCoach.displayName,
      firstName: headCoach.firstName,
      lastName: headCoach.lastName,
      role: 'head',
    })
  }

  // First assistant coach
  const firstAssistant = nominationList.firstAssistantCoachPerson
  if (firstAssistant?.__identity && firstAssistant.displayName) {
    coaches.push({
      id: firstAssistant.__identity,
      displayName: firstAssistant.displayName,
      firstName: firstAssistant.firstName,
      lastName: firstAssistant.lastName,
      role: 'firstAssistant',
    })
  }

  // Second assistant coach
  const secondAssistant = nominationList.secondAssistantCoachPerson
  if (secondAssistant?.__identity && secondAssistant.displayName) {
    coaches.push({
      id: secondAssistant.__identity,
      displayName: secondAssistant.displayName,
      firstName: secondAssistant.firstName,
      lastName: secondAssistant.lastName,
      role: 'secondAssistant',
    })
  }

  return coaches
}

function ValidateGameModalComponent({ assignment, isOpen, onClose }: ValidateGameModalProps) {
  const { t, tInterpolate } = useTranslation()
  const isOCREnabled = useSettingsStore((s) => s.isOCREnabled)

  // OCR entry modal state - track whether user dismissed OCR entry for this assignment
  // Use assignment ID as key to reset when switching assignments
  const [ocrDismissedForAssignment, setOCRDismissedForAssignment] = useState<string | null>(null)
  const assignmentId = assignment.__identity

  // OCR is dismissed if user explicitly dismissed it for this assignment
  const ocrDismissed = ocrDismissedForAssignment === assignmentId

  const wizard = useValidateGameWizard({
    assignment,
    isOpen,
    onClose,
  })

  const { homeTeam, awayTeam } = getTeamNames(assignment)
  const modalTitleId = 'validate-game-title'
  const subtitle = `${homeTeam} ${t('common.vs')} ${awayTeam}`

  // Transform nomination lists to RosterPlayer format for OCR comparison
  const homeRosterPlayers = useMemo(
    () => transformNominationsToRosterPlayers(wizard.homeNominationList?.indoorPlayerNominations),
    [wizard.homeNominationList]
  )

  const awayRosterPlayers = useMemo(
    () => transformNominationsToRosterPlayers(wizard.awayNominationList?.indoorPlayerNominations),
    [wizard.awayNominationList]
  )

  // Transform nomination lists to coaches for OCR comparison
  const homeRosterCoaches = useMemo(
    () => transformNominationListToCoaches(wizard.homeNominationList),
    [wizard.homeNominationList]
  )

  const awayRosterCoaches = useMemo(
    () => transformNominationListToCoaches(wizard.awayNominationList),
    [wizard.awayNominationList]
  )

  const handleOCRSkip = useCallback(() => {
    setOCRDismissedForAssignment(assignmentId)
  }, [assignmentId])

  const handleOCRComplete = useCallback(
    (capturedImageBlob?: Blob) => {
      setOCRDismissedForAssignment(assignmentId)
      // If OCR captured an image, feed it into the validation state as the scoresheet reference
      if (capturedImageBlob) {
        const file = new File([capturedImageBlob], 'scoresheet-ocr.jpg', {
          type: capturedImageBlob.type || 'image/jpeg',
        })
        wizard.setScoresheet(file, false)
      }
    },
    [assignmentId, wizard]
  )

  const handleOCRClose = useCallback(() => {
    setOCRDismissedForAssignment(assignmentId)
  }, [assignmentId])

  // Determine if OCR entry should be shown (features.ocr)
  // Note: OCR is available for validated games too (for debugging/re-verification purposes)
  const shouldShowOCREntry =
    features.ocr && isOpen && isOCREnabled && !ocrDismissed && !wizard.isLoadingGameDetails

  const navigation = {
    isFirstStep: wizard.isFirstStep,
    isLastStep: wizard.isLastStep,
  }

  const editModeState = {
    isFinalizing: wizard.isFinalizing,
    isLoadingGameDetails: wizard.isLoadingGameDetails,
    hasGameDetailsError: !!wizard.gameDetailsError,
    canMarkCurrentStepDone: wizard.canMarkCurrentStepDone,
    allPreviousRequiredStepsDone: wizard.allPreviousRequiredStepsDone,
    currentStepIsOptional: wizard.currentStep.isOptional ?? false,
  }

  const [showingReference, setShowingReference] = useState(false)
  const [prevStepId, setPrevStepId] = useState(wizard.currentStepId)

  // Reset reference view when navigating between steps
  if (prevStepId !== wizard.currentStepId) {
    setPrevStepId(wizard.currentStepId)
    setShowingReference(false)
  }

  const isNonScoresheetStep = wizard.currentStepId !== 'scoresheet'
  const canShowReference = !!wizard.referenceImageUrl && isNonScoresheetStep

  const handleToggleReference = useCallback(() => {
    setShowingReference((prev) => !prev)
  }, [])

  const loadingState = {
    isLoading: wizard.isLoadingGameDetails,
    error: wizard.gameDetailsError,
  }

  const validationInfo = {
    isValidated: wizard.isValidated,
    isCurrentStepReadOnly: wizard.isCurrentStepReadOnly,
    validatedInfo: wizard.validatedInfo,
    pendingScorer: wizard.pendingScorer,
    scoresheetNotRequired: wizard.scoresheetNotRequired,
    state: wizard.validationState,
    homeNominationList: wizard.homeNominationList,
    awayNominationList: wizard.awayNominationList,
  }

  const stepHandlers = {
    setHomeRosterModifications: wizard.setHomeRosterModifications,
    setAwayRosterModifications: wizard.setAwayRosterModifications,
    setScorer: wizard.setScorer,
    setScoresheet: wizard.setScoresheet,
    onAddPlayerSheetOpenChange: wizard.handleAddPlayerSheetOpenChange,
    onClose,
  }

  return (
    <>
      {wizard.successToast && <ValidationSuccessToast message={wizard.successToast} />}

      <Modal
        isOpen={isOpen}
        onClose={wizard.attemptClose}
        titleId={modalTitleId}
        size="lg"
        isLoading={wizard.showUnsavedDialog || wizard.showRosterWarningDialog}
      >
        <ModalHeader
          title={t('assignments.validateGame')}
          titleId={modalTitleId}
          subtitle={subtitle}
          onClose={wizard.attemptClose}
        />

        {wizard.isValidated && wizard.validatedInfo && (
          <div
            role="status"
            className="mb-4 p-3 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg"
          >
            <p className="text-sm font-medium text-success-700 dark:text-success-400">
              {t('validation.wizard.alreadyValidated')}
            </p>
            <p className="text-xs text-success-600 dark:text-success-500 mt-1">
              {tInterpolate('validation.wizard.validatedBy', {
                scorer: wizard.validatedInfo.scorerName,
              })}
            </p>
          </div>
        )}

        <div className="mb-4">
          <WizardStepIndicator
            steps={wizard.wizardSteps}
            currentStepIndex={wizard.currentStepIndex}
            stepsMarkedDone={wizard.stepsMarkedDone}
            clickable={!wizard.isFinalizing}
            onStepClick={wizard.goToStep}
          />
          <p className="text-center text-xs text-text-muted dark:text-text-muted-dark mt-2">
            {tInterpolate('validation.wizard.stepOf', {
              current: wizard.currentStepIndex + 1,
              total: wizard.totalSteps,
            })}
          </p>
        </div>

        <WizardStepContainer
          currentStep={wizard.currentStepIndex}
          totalSteps={wizard.totalSteps}
          onSwipeNext={wizard.goNext}
          onSwipePrevious={wizard.goBack}
          swipeEnabled={wizard.isSwipeEnabled && !showingReference}
        >
          <div className="max-h-80 overflow-y-auto">
            <StepRenderer
              currentStepId={wizard.currentStepId}
              assignment={assignment}
              loading={loadingState}
              validation={validationInfo}
              handlers={stepHandlers}
              referenceImageUrl={wizard.referenceImageUrl}
              showingReference={showingReference}
              onShowingReferenceChange={setShowingReference}
            />
          </div>
        </WizardStepContainer>

        {wizard.saveError && (
          <div
            role="alert"
            className="mt-4 p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg"
          >
            <p className="text-sm text-danger-700 dark:text-danger-400">{wizard.saveError}</p>
            <div className="mt-2 flex gap-3">
              <button
                type="button"
                onClick={() => wizard.handleFinish()}
                className="text-sm font-medium text-danger-600 dark:text-danger-400 hover:text-danger-700 dark:hover:text-danger-300"
              >
                {t('common.retry')}
              </button>
              <button
                type="button"
                onClick={wizard.handleDiscardAndClose}
                className="text-sm font-medium text-text-muted dark:text-text-muted-dark hover:text-text-secondary dark:hover:text-text-secondary-dark"
              >
                {t('validation.state.discardAndClose')}
              </button>
            </div>
          </div>
        )}

        {wizard.isSaving && (
          <div className="mt-4 text-center text-sm text-text-muted dark:text-text-muted-dark">
            {t('validation.wizard.saving')}
          </div>
        )}

        {!wizard.isValidated && wizard.isLastStep && !wizard.allPreviousRequiredStepsDone && (
          <div
            role="status"
            className="mt-4 p-3 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg"
          >
            <p className="text-sm text-warning-700 dark:text-warning-400">
              {t('validation.wizard.stepsIncomplete')}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-4 border-t border-border-default dark:border-border-default-dark mt-4">
          {wizard.isValidated ? (
            <ValidatedModeButtons
              navigation={navigation}
              onBack={wizard.goBack}
              onNext={wizard.goNext}
              onClose={onClose}
            />
          ) : wizard.isCurrentStepReadOnly ? (
            <ReadOnlyStepButtons
              navigation={navigation}
              onBack={wizard.goBack}
              onNext={wizard.goNext}
              onFinish={wizard.handleFinish}
              finishDisabled={
                wizard.isFinalizing ||
                wizard.isLoadingGameDetails ||
                !!wizard.gameDetailsError ||
                !wizard.allPreviousRequiredStepsDone
              }
              isFinalizing={wizard.isFinalizing}
            />
          ) : (
            <EditModeButtons
              navigation={navigation}
              state={editModeState}
              onAttemptClose={wizard.attemptClose}
              onBack={wizard.goBack}
              onValidateAndNext={wizard.handleValidateAndNext}
              onFinish={wizard.handleFinish}
            />
          )}
          {/* Quick-compare toggle — between Previous and Validate, always visible */}
          {canShowReference && (
            <div className="order-1">
              <button
                type="button"
                onClick={handleToggleReference}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-text-secondary dark:text-text-secondary-dark bg-surface-subtle dark:bg-surface-subtle-dark hover:bg-surface-muted dark:hover:bg-surface-muted-dark rounded-lg border border-border-default dark:border-border-default-dark transition-colors"
                aria-pressed={showingReference}
              >
                {showingReference ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
                {showingReference
                  ? t('validation.referenceImage.hideScoresheet')
                  : t('validation.referenceImage.showScoresheet')}
              </button>
            </div>
          )}
        </div>
      </Modal>

      <UnsavedChangesDialog
        isOpen={wizard.showUnsavedDialog}
        onSaveAndClose={wizard.handleSaveAndClose}
        onDiscard={wizard.handleDiscardAndClose}
        onCancel={wizard.handleCancelClose}
        isSaving={wizard.isSaving}
      />

      <RosterValidationWarningDialog
        isOpen={wizard.showRosterWarningDialog}
        rosterValidation={wizard.rosterValidation}
        homeTeamName={homeTeam}
        awayTeamName={awayTeam}
        onGoBack={wizard.handleRosterWarningGoBack}
        onProceedAnyway={wizard.handleRosterWarningProceed}
        isProceedingAnyway={wizard.isFinalizing}
      />

      <SafeValidationCompleteModal
        isOpen={wizard.showSafeValidationComplete}
        onClose={wizard.handleSafeValidationCompleteClose}
      />

      {/* OCR Entry Modal - shown before validation wizard when OCR is enabled */}
      <OCREntryModal
        isOpen={shouldShowOCREntry}
        homeTeamName={homeTeam}
        awayTeamName={awayTeam}
        homeRosterPlayers={homeRosterPlayers}
        awayRosterPlayers={awayRosterPlayers}
        homeRosterCoaches={homeRosterCoaches}
        awayRosterCoaches={awayRosterCoaches}
        onSkip={handleOCRSkip}
        onComplete={handleOCRComplete}
        onClose={handleOCRClose}
      />
    </>
  )
}

export const ValidateGameModal = memo(ValidateGameModalComponent)
