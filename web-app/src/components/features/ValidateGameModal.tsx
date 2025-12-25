import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { Assignment } from "@/api/client";
import { useTranslation } from "@/hooks/useTranslation";
import { useModalDismissal } from "@/hooks/useModalDismissal";
import { logger } from "@/utils/logger";
import { getTeamNames } from "@/utils/assignment-helpers";
import { useWizardNavigation } from "@/hooks/useWizardNavigation";
import { WizardStepContainer } from "@/components/ui/WizardStepContainer";
import { WizardStepIndicator } from "@/components/ui/WizardStepIndicator";
import { ModalErrorBoundary } from "@/components/ui/ModalErrorBoundary";
import { ModalButton } from "@/components/ui/ModalButton";
import {
  HomeRosterPanel,
  AwayRosterPanel,
  ScorerPanel,
  ScoresheetPanel,
  UnsavedChangesDialog,
  ValidationSuccessToast,
} from "@/components/features/validation";
import { useValidationState } from "@/hooks/useValidationState";

/** Z-index for the main modal backdrop and dialog */
const Z_INDEX_MODAL = 50;
/** Duration to show success toast before auto-dismissing */
const SUCCESS_TOAST_DURATION_MS = 3000;

interface ValidateGameModalProps {
  assignment: Assignment;
  isOpen: boolean;
  onClose: () => void;
}

type ValidationStepId = "home-roster" | "away-roster" | "scorer" | "scoresheet";

interface ValidationStep {
  id: ValidationStepId;
  label: string;
  isOptional?: boolean;
}

export function ValidateGameModal({
  assignment,
  isOpen,
  onClose,
}: ValidateGameModalProps) {
  const { t, tInterpolate } = useTranslation();
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isAddPlayerSheetOpen, setIsAddPlayerSheetOpen] = useState(false);

  const gameId = assignment.refereeGame?.game?.__identity;

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
  } = useValidationState(gameId);

  const wizardSteps = useMemo<ValidationStep[]>(
    () => [
      { id: "home-roster", label: t("validation.homeRoster") },
      { id: "away-roster", label: t("validation.awayRoster") },
      { id: "scorer", label: t("validation.scorer") },
      { id: "scoresheet", label: t("validation.scoresheet"), isOptional: true },
    ],
    [t],
  );

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
  });

  const isDirtyRef = useRef(isDirty);
  const isFinalizingRef = useRef(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }
    };
  }, []);

  const canMarkCurrentStepDone = useMemo(() => {
    const stepId = wizardSteps[currentStepIndex]?.id;
    if (stepId === "scorer") return completionStatus.scorer;
    return true;
  }, [currentStepIndex, wizardSteps, completionStatus.scorer]);

  const allPreviousRequiredStepsDone = useMemo(() => {
    for (let i = 0; i < currentStepIndex; i++) {
      const step = wizardSteps[i];
      if (!step?.isOptional && !stepsMarkedDone.has(i)) {
        return false;
      }
    }
    return true;
  }, [wizardSteps, currentStepIndex, stepsMarkedDone]);

  useEffect(() => {
    if (isOpen) {
      setSaveError(null);
      setSuccessToast(null);
      reset();
      resetToStart();
    }
  }, [isOpen, reset, resetToStart]);

  const attemptClose = useCallback(() => {
    if (isValidated) {
      onClose();
    } else if (isDirtyRef.current) {
      setShowUnsavedDialog(true);
    } else {
      onClose();
    }
  }, [onClose, isValidated]);

  // Handle Escape key and backdrop click dismissals
  // Use showUnsavedDialog as isLoading to prevent dismissal when dialog is showing
  const { handleBackdropClick } = useModalDismissal({
    isOpen,
    onClose: attemptClose,
    isLoading: showUnsavedDialog,
  });

  const handleFinish = useCallback(async () => {
    if (isFinalizingRef.current) return;

    const lastStep = wizardSteps[wizardSteps.length - 1];
    if (!lastStep?.isOptional && !canMarkCurrentStepDone) return;
    if (!allPreviousRequiredStepsDone) return;

    if (!lastStep?.isOptional) {
      setStepDone(currentStepIndex, true);
    }

    isFinalizingRef.current = true;
    setSaveError(null);

    try {
      await finalizeValidation();
      setSuccessToast(t("validation.state.saveSuccess"));
      toastTimeoutRef.current = setTimeout(() => {
        setSuccessToast(null);
      }, SUCCESS_TOAST_DURATION_MS);
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("validation.state.saveError");
      setSaveError(message);
    } finally {
      isFinalizingRef.current = false;
    }
  }, [
    wizardSteps,
    canMarkCurrentStepDone,
    allPreviousRequiredStepsDone,
    currentStepIndex,
    setStepDone,
    finalizeValidation,
    t,
    onClose,
  ]);

  const handleSaveAndClose = useCallback(async () => {
    try {
      await saveProgress();
      setShowUnsavedDialog(false);
      onClose();
    } catch (error) {
      logger.error("[ValidateGameModal] Save failed during close:", error);
      setSaveError(t("validation.state.saveError"));
      setShowUnsavedDialog(false);
    }
  }, [saveProgress, onClose, t]);

  const handleDiscardAndClose = useCallback(() => {
    setShowUnsavedDialog(false);
    reset();
    onClose();
  }, [reset, onClose]);

  const handleCancelClose = useCallback(() => {
    setShowUnsavedDialog(false);
  }, []);

  const handleNext = useCallback(() => {
    goNext();
  }, [goNext]);

  const handleValidateAndNext = useCallback(() => {
    if (!canMarkCurrentStepDone) return;
    setStepDone(currentStepIndex, true);
    goNext();
  }, [canMarkCurrentStepDone, setStepDone, currentStepIndex, goNext]);

  const handleBack = useCallback(() => {
    goBack();
  }, [goBack]);

  const handleAddPlayerSheetOpenChange = useCallback((open: boolean) => {
    setIsAddPlayerSheetOpen(open);
  }, []);

  if (!isOpen) return null;

  const { homeTeam, awayTeam } = getTeamNames(assignment);
  const currentStepId = currentStep.id;

  return (
    <>
      {successToast && <ValidationSuccessToast message={successToast} />}

      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
        style={{ zIndex: Z_INDEX_MODAL }}
        onClick={handleBackdropClick}
      >
        <div
          className="bg-surface-card dark:bg-surface-card-dark rounded-lg shadow-xl max-w-lg w-full p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="validate-game-title"
        >
          <h2
            id="validate-game-title"
            className="text-xl font-semibold text-text-primary dark:text-text-primary-dark mb-2"
          >
            {t("assignments.validateGame")}
          </h2>

          <div className="mb-4 text-sm text-text-muted dark:text-text-muted-dark">
            <div className="font-medium text-text-primary dark:text-text-primary-dark">
              {homeTeam} {t("common.vs")} {awayTeam}
            </div>
          </div>

          {isValidated && validatedInfo && (
            <div
              role="status"
              className="mb-4 p-3 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg"
            >
              <p className="text-sm font-medium text-success-700 dark:text-success-400">
                {t("validation.wizard.alreadyValidated")}
              </p>
              <p className="text-xs text-success-600 dark:text-success-500 mt-1">
                {tInterpolate("validation.wizard.validatedBy", {
                  scorer: validatedInfo.scorerName,
                })}
              </p>
            </div>
          )}

          <div className="mb-4">
            <WizardStepIndicator
              steps={wizardSteps}
              currentStepIndex={currentStepIndex}
              stepsMarkedDone={stepsMarkedDone}
              clickable={!isFinalizing}
              onStepClick={goToStep}
            />
            <p className="text-center text-xs text-text-muted dark:text-text-muted-dark mt-2">
              {tInterpolate("validation.wizard.stepOf", {
                current: currentStepIndex + 1,
                total: totalSteps,
              })}
            </p>
          </div>

          <WizardStepContainer
            currentStep={currentStepIndex}
            totalSteps={totalSteps}
            onSwipeNext={handleNext}
            onSwipePrevious={handleBack}
            swipeEnabled={!isFinalizing && !isLoadingGameDetails && !isAddPlayerSheetOpen}
          >
            <div className="max-h-80 overflow-y-auto">
              {isLoadingGameDetails && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-text-muted dark:text-text-muted-dark">
                    {t("common.loading")}
                  </div>
                </div>
              )}

              {gameDetailsError && !isLoadingGameDetails && (
                <div
                  role="alert"
                  className="p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg"
                >
                  <p className="text-sm text-danger-700 dark:text-danger-400">
                    {gameDetailsError.message}
                  </p>
                </div>
              )}

              {!isLoadingGameDetails && !gameDetailsError && (
                <ModalErrorBoundary modalName="ValidateGameModal" onClose={onClose}>
                  {currentStepId === "home-roster" && (
                    <HomeRosterPanel
                      assignment={assignment}
                      onModificationsChange={setHomeRosterModifications}
                      onAddPlayerSheetOpenChange={handleAddPlayerSheetOpenChange}
                      readOnly={isValidated}
                      initialModifications={validationState.homeRoster.modifications}
                    />
                  )}

                  {currentStepId === "away-roster" && (
                    <AwayRosterPanel
                      assignment={assignment}
                      onModificationsChange={setAwayRosterModifications}
                      onAddPlayerSheetOpenChange={handleAddPlayerSheetOpenChange}
                      readOnly={isValidated}
                      initialModifications={validationState.awayRoster.modifications}
                    />
                  )}

                  {currentStepId === "scorer" && (
                    <ScorerPanel
                      key={pendingScorer?.__identity ?? "no-pending-scorer"}
                      onScorerChange={setScorer}
                      readOnly={isValidated}
                      readOnlyScorerName={validatedInfo?.scorerName}
                      initialScorer={
                        pendingScorer
                          ? {
                              __identity: pendingScorer.__identity,
                              displayName: pendingScorer.displayName,
                              birthday: "",
                            }
                          : null
                      }
                    />
                  )}

                  {currentStepId === "scoresheet" && (
                    <ScoresheetPanel
                      onScoresheetChange={setScoresheet}
                      readOnly={isValidated}
                      hasScoresheet={validatedInfo?.hasScoresheet}
                      scoresheetNotRequired={scoresheetNotRequired}
                    />
                  )}
                </ModalErrorBoundary>
              )}
            </div>
          </WizardStepContainer>

          {saveError && (
            <div
              role="alert"
              className="mt-4 p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg"
            >
              <p className="text-sm text-danger-700 dark:text-danger-400">
                {saveError}
              </p>
              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => handleFinish()}
                  className="text-sm font-medium text-danger-600 dark:text-danger-400 hover:text-danger-700 dark:hover:text-danger-300"
                >
                  {t("common.retry")}
                </button>
                <button
                  type="button"
                  onClick={handleDiscardAndClose}
                  className="text-sm font-medium text-text-muted dark:text-text-muted-dark hover:text-text-secondary dark:hover:text-text-secondary-dark"
                >
                  {t("validation.state.discardAndClose")}
                </button>
              </div>
            </div>
          )}

          {isSaving && (
            <div className="mt-4 text-center text-sm text-text-muted dark:text-text-muted-dark">
              {t("validation.wizard.saving")}
            </div>
          )}

          <div className="flex justify-between gap-3 pt-4 border-t border-border-default dark:border-border-default-dark mt-4">
            {isValidated ? (
              <>
                <div>
                  {!isFirstStep && (
                    <ModalButton variant="secondary" onClick={handleBack}>
                      {t("validation.wizard.previous")}
                    </ModalButton>
                  )}
                </div>
                <div>
                  {isLastStep ? (
                    <ModalButton variant="primary" onClick={onClose}>
                      {t("common.close")}
                    </ModalButton>
                  ) : (
                    <ModalButton variant="primary" onClick={handleNext}>
                      {t("validation.wizard.next")}
                    </ModalButton>
                  )}
                </div>
              </>
            ) : (
              <>
                <div>
                  {isFirstStep ? (
                    <ModalButton
                      variant="secondary"
                      onClick={() => attemptClose()}
                      disabled={isFinalizing}
                    >
                      {t("common.cancel")}
                    </ModalButton>
                  ) : (
                    <ModalButton
                      variant="secondary"
                      onClick={handleBack}
                      disabled={isFinalizing}
                    >
                      {t("validation.wizard.previous")}
                    </ModalButton>
                  )}
                </div>

                <div>
                  {isLastStep ? (
                    <ModalButton
                      variant="success"
                      onClick={() => handleFinish()}
                      disabled={
                        isFinalizing ||
                        isLoadingGameDetails ||
                        !!gameDetailsError ||
                        !allPreviousRequiredStepsDone ||
                        (!currentStep.isOptional && !canMarkCurrentStepDone)
                      }
                      title={
                        !allPreviousRequiredStepsDone
                          ? t("validation.state.markAllStepsTooltip")
                          : undefined
                      }
                    >
                      {isFinalizing
                        ? t("common.loading")
                        : t("validation.wizard.finish")}
                    </ModalButton>
                  ) : (
                    <ModalButton
                      variant="success"
                      onClick={handleValidateAndNext}
                      disabled={
                        isFinalizing ||
                        isLoadingGameDetails ||
                        !!gameDetailsError ||
                        !canMarkCurrentStepDone
                      }
                    >
                      {t("validation.wizard.validate")}
                    </ModalButton>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onSaveAndClose={handleSaveAndClose}
        onDiscard={handleDiscardAndClose}
        onCancel={handleCancelClose}
        isSaving={isSaving}
      />
    </>
  );
}
