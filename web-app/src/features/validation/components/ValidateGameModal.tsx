import { memo } from "react";
import type { Assignment } from "@/api/client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { getTeamNames } from "@/features/assignments/utils/assignment-helpers";
import { useValidateGameWizard } from "@/features/validation/hooks/useValidateGameWizard";
import { Modal } from "@/shared/components/Modal";
import { ModalHeader } from "@/shared/components/ModalHeader";
import { WizardStepContainer } from "@/shared/components/WizardStepContainer";
import { WizardStepIndicator } from "@/shared/components/WizardStepIndicator";
import {
  UnsavedChangesDialog,
  RosterValidationWarningDialog,
  SafeValidationCompleteModal,
  ValidationSuccessToast,
  StepRenderer,
  ValidatedModeButtons,
  EditModeButtons,
} from ".";

interface ValidateGameModalProps {
  assignment: Assignment;
  isOpen: boolean;
  onClose: () => void;
}

function ValidateGameModalComponent({
  assignment,
  isOpen,
  onClose,
}: ValidateGameModalProps) {
  const { t, tInterpolate } = useTranslation();

  const wizard = useValidateGameWizard({
    assignment,
    isOpen,
    onClose,
  });

  const { homeTeam, awayTeam } = getTeamNames(assignment);
  const modalTitleId = "validate-game-title";
  const subtitle = `${homeTeam} ${t("common.vs")} ${awayTeam}`;

  const navigation = {
    isFirstStep: wizard.isFirstStep,
    isLastStep: wizard.isLastStep,
  };

  const editModeState = {
    isFinalizing: wizard.isFinalizing,
    isLoadingGameDetails: wizard.isLoadingGameDetails,
    hasGameDetailsError: !!wizard.gameDetailsError,
    canMarkCurrentStepDone: wizard.canMarkCurrentStepDone,
    allPreviousRequiredStepsDone: wizard.allPreviousRequiredStepsDone,
    currentStepIsOptional: wizard.currentStep.isOptional ?? false,
  };

  const loadingState = {
    isLoading: wizard.isLoadingGameDetails,
    error: wizard.gameDetailsError,
  };

  const validationInfo = {
    isValidated: wizard.isValidated,
    validatedInfo: wizard.validatedInfo,
    pendingScorer: wizard.pendingScorer,
    scoresheetNotRequired: wizard.scoresheetNotRequired,
    state: wizard.validationState,
    homeNominationList: wizard.homeNominationList,
    awayNominationList: wizard.awayNominationList,
  };

  const stepHandlers = {
    setHomeRosterModifications: wizard.setHomeRosterModifications,
    setAwayRosterModifications: wizard.setAwayRosterModifications,
    setScorer: wizard.setScorer,
    setScoresheet: wizard.setScoresheet,
    onAddPlayerSheetOpenChange: wizard.handleAddPlayerSheetOpenChange,
    onClose,
  };

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
          title={t("assignments.validateGame")}
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
              {t("validation.wizard.alreadyValidated")}
            </p>
            <p className="text-xs text-success-600 dark:text-success-500 mt-1">
              {tInterpolate("validation.wizard.validatedBy", {
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
            {tInterpolate("validation.wizard.stepOf", {
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
          swipeEnabled={wizard.isSwipeEnabled}
        >
          <div className="max-h-80 overflow-y-auto">
            <StepRenderer
              currentStepId={wizard.currentStepId}
              assignment={assignment}
              loading={loadingState}
              validation={validationInfo}
              handlers={stepHandlers}
            />
          </div>
        </WizardStepContainer>

        {wizard.saveError && (
          <div
            role="alert"
            className="mt-4 p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg"
          >
            <p className="text-sm text-danger-700 dark:text-danger-400">
              {wizard.saveError}
            </p>
            <div className="mt-2 flex gap-3">
              <button
                type="button"
                onClick={() => wizard.handleFinish()}
                className="text-sm font-medium text-danger-600 dark:text-danger-400 hover:text-danger-700 dark:hover:text-danger-300"
              >
                {t("common.retry")}
              </button>
              <button
                type="button"
                onClick={wizard.handleDiscardAndClose}
                className="text-sm font-medium text-text-muted dark:text-text-muted-dark hover:text-text-secondary dark:hover:text-text-secondary-dark"
              >
                {t("validation.state.discardAndClose")}
              </button>
            </div>
          </div>
        )}

        {wizard.isSaving && (
          <div className="mt-4 text-center text-sm text-text-muted dark:text-text-muted-dark">
            {t("validation.wizard.saving")}
          </div>
        )}

        <div className="flex justify-between gap-3 pt-4 border-t border-border-default dark:border-border-default-dark mt-4">
          {wizard.isValidated ? (
            <ValidatedModeButtons
              navigation={navigation}
              onBack={wizard.goBack}
              onNext={wizard.goNext}
              onClose={onClose}
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
    </>
  );
}

export const ValidateGameModal = memo(ValidateGameModalComponent);
