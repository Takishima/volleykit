import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { Assignment } from "@/api/client";
import { useTranslation } from "@/hooks/useTranslation";
import { logger } from "@/utils/logger";
import { getTeamNames } from "@/utils/assignment-helpers";
import { useWizardNavigation } from "@/hooks/useWizardNavigation";
import { WizardStepContainer } from "@/components/ui/WizardStepContainer";
import { WizardStepIndicator } from "@/components/ui/WizardStepIndicator";
import {
  HomeRosterPanel,
  AwayRosterPanel,
  ScorerPanel,
  ScoresheetPanel,
} from "@/components/features/validation";
import { useValidationState } from "@/hooks/useValidationState";

/** Z-index for the main modal backdrop and dialog */
const Z_INDEX_MODAL = 50;
/** Z-index for confirmation dialog (above main modal) */
const Z_INDEX_CONFIRMATION_DIALOG = 60;
/** Z-index for toast notification (above all dialogs) */
const Z_INDEX_TOAST = 70;
/** Simulated save operation duration in milliseconds */
const SIMULATED_SAVE_DELAY_MS = 500;
/** Duration to show success toast before auto-dismissing */
const SUCCESS_TOAST_DURATION_MS = 3000;

interface ValidateGameModalProps {
  assignment: Assignment;
  isOpen: boolean;
  onClose: () => void;
}

type ValidationStepId = "home-roster" | "away-roster" | "scorer" | "scoresheet";

/** Wizard step with typed id for validation panels */
interface ValidationStep {
  id: ValidationStepId;
  label: string;
  isOptional?: boolean;
}

/** Dialog for confirming close with unsaved changes */
function UnsavedChangesDialog({
  isOpen,
  onSaveAndClose,
  onDiscard,
  onCancel,
  isSaving,
}: {
  isOpen: boolean;
  onSaveAndClose: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus first button when dialog opens for accessibility
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      const firstButton = dialogRef.current.querySelector("button");
      firstButton?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
      style={{ zIndex: Z_INDEX_CONFIRMATION_DIALOG }}
      aria-hidden="true"
    >
      <div
        ref={dialogRef}
        className="bg-surface-card dark:bg-surface-card-dark rounded-lg shadow-xl max-w-sm w-full p-6"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-changes-title"
        aria-describedby="unsaved-changes-description"
      >
        <h3
          id="unsaved-changes-title"
          className="text-lg font-semibold text-text-primary dark:text-text-primary-dark mb-2"
        >
          {t("validation.state.unsavedChangesTitle")}
        </h3>
        <p
          id="unsaved-changes-description"
          className="text-sm text-text-muted dark:text-text-muted-dark mb-4"
        >
          {t("validation.state.unsavedChangesMessage")}
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-text-secondary dark:text-text-secondary-dark bg-surface-subtle dark:bg-surface-subtle-dark rounded-md hover:bg-surface-muted dark:hover:bg-surface-muted-dark focus:outline-none focus:ring-2 focus:ring-border-strong disabled:opacity-50"
          >
            {t("validation.state.continueEditing")}
          </button>
          <button
            type="button"
            onClick={onDiscard}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
          >
            {t("validation.state.discardChanges")}
          </button>
          <button
            type="button"
            onClick={onSaveAndClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {isSaving ? t("common.loading") : t("validation.state.saveAndClose")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ValidateGameModal({
  assignment,
  isOpen,
  onClose,
}: ValidateGameModalProps) {
  const { t, tInterpolate } = useTranslation();
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const {
    isDirty,
    completionStatus,
    setHomeRosterModifications,
    setAwayRosterModifications,
    setScorer,
    setScoresheet,
    reset,
    saveProgress,
    isSaving,
  } = useValidationState();

  // Define wizard steps with typed ids for type-safe panel switching
  const wizardSteps = useMemo<ValidationStep[]>(
    () => [
      { id: "home-roster", label: t("validation.homeRoster") },
      { id: "away-roster", label: t("validation.awayRoster") },
      { id: "scorer", label: t("validation.scorer") },
      { id: "scoresheet", label: t("validation.scoresheet"), isOptional: true },
    ],
    [t],
  );

  // Note: Step navigation doesn't auto-save. Data is saved on close/finish.
  // This avoids race conditions since useWizardNavigation doesn't support async callbacks.
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

  // Refs to prevent race conditions and enable cleanup
  const isDirtyRef = useRef(isDirty);
  const isFinalizingRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }
    };
  }, []);

  // Scorer panel requires a scorer to be selected before marking as done
  const canMarkCurrentStepDone = useMemo(() => {
    const stepId = wizardSteps[currentStepIndex]?.id;
    if (stepId === "scorer") return completionStatus.scorer;
    return true;
  }, [currentStepIndex, wizardSteps, completionStatus.scorer]);

  // Check if all steps BEFORE the current one are done (for enabling Finish button)
  const allPreviousRequiredStepsDone = useMemo(() => {
    for (let i = 0; i < currentStepIndex; i++) {
      const step = wizardSteps[i];
      if (!step?.isOptional && !stepsMarkedDone.has(i)) {
        return false;
      }
    }
    return true;
  }, [wizardSteps, currentStepIndex, stepsMarkedDone]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSaveError(null);
      setSuccessToast(null);
      reset();
      resetToStart();
    }
  }, [isOpen, reset, resetToStart]);

  // Attempt to close - show confirmation dialog if there are unsaved changes
  const attemptClose = useCallback(() => {
    if (isDirtyRef.current) {
      setShowUnsavedDialog(true);
    } else {
      onClose();
    }
  }, [onClose]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      // Don't close if unsaved dialog is showing
      if (showUnsavedDialog) return;
      if (e.key === "Escape") {
        attemptClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, attemptClose, showUnsavedDialog]);

  // Handle finish action (finalize validation)
  // If the last step is not optional, it marks the last step as done before finalizing
  const handleFinish = useCallback(async () => {
    // Guard against concurrent operations
    if (isFinalizingRef.current) return;

    // If last step is not optional, we need to be able to mark it as done
    const lastStep = wizardSteps[wizardSteps.length - 1];
    if (!lastStep?.isOptional && !canMarkCurrentStepDone) return;

    // Check all previous steps are done
    if (!allPreviousRequiredStepsDone) return;

    // Mark last step as done if it's not optional
    if (!lastStep?.isOptional) {
      setStepDone(currentStepIndex, true);
    }

    isFinalizingRef.current = true;
    setIsFinalizing(true);
    setSaveError(null);

    try {
      // TODO(#40): Implement actual API call for finalizing validation
      // For now, simulate a save operation
      await new Promise<void>((resolve) => {
        saveTimeoutRef.current = setTimeout(resolve, SIMULATED_SAVE_DELAY_MS);
      });

      // Show success toast notification
      setSuccessToast(t("validation.state.saveSuccess"));

      // Auto-dismiss toast after delay
      toastTimeoutRef.current = setTimeout(() => {
        setSuccessToast(null);
      }, SUCCESS_TOAST_DURATION_MS);

      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save";
      setSaveError(message);
    } finally {
      isFinalizingRef.current = false;
      setIsFinalizing(false);
    }
  }, [
    wizardSteps,
    canMarkCurrentStepDone,
    allPreviousRequiredStepsDone,
    currentStepIndex,
    setStepDone,
    t,
    onClose,
  ]);

  // Save and close (for unsaved dialog)
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

  // Discard changes and close (for unsaved dialog)
  const handleDiscardAndClose = useCallback(() => {
    setShowUnsavedDialog(false);
    reset();
    onClose();
  }, [reset, onClose]);

  // Cancel close and continue editing
  const handleCancelClose = useCallback(() => {
    setShowUnsavedDialog(false);
  }, []);

  // Handle backdrop click (only close if clicking the backdrop itself, not the dialog)
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        attemptClose();
      }
    },
    [attemptClose],
  );

  const handleNext = useCallback(() => {
    goNext();
  }, [goNext]);

  // Handler for Validate button: marks step as done and advances
  const handleValidateAndNext = useCallback(() => {
    if (!canMarkCurrentStepDone) return;
    setStepDone(currentStepIndex, true);
    goNext();
  }, [canMarkCurrentStepDone, setStepDone, currentStepIndex, goNext]);

  const handleBack = useCallback(() => {
    goBack();
  }, [goBack]);

  if (!isOpen) return null;

  const { homeTeam, awayTeam } = getTeamNames(assignment);
  const currentStepId = currentStep.id;

  return (
    <>
      {/* Success toast notification */}
      {successToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2"
          style={{ zIndex: Z_INDEX_TOAST }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
            aria-hidden="true"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22,4 12,14.01 9,11.01" />
          </svg>
          <span className="text-sm font-medium">{successToast}</span>
        </div>
      )}

      {/* Backdrop click-to-close is intentional UX pattern. Keyboard close is handled via Escape key in useEffect. */}
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
              {homeTeam} vs {awayTeam}
            </div>
          </div>

          {/* Step indicator */}
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

          {/* Step content with swipe support */}
          <WizardStepContainer
            currentStep={currentStepIndex}
            totalSteps={totalSteps}
            onSwipeNext={handleNext}
            onSwipePrevious={handleBack}
            swipeEnabled={!isFinalizing}
          >
            <div className="max-h-80 overflow-y-auto">
              {currentStepId === "home-roster" && (
                <HomeRosterPanel
                  assignment={assignment}
                  onModificationsChange={setHomeRosterModifications}
                />
              )}

              {currentStepId === "away-roster" && (
                <AwayRosterPanel
                  assignment={assignment}
                  onModificationsChange={setAwayRosterModifications}
                />
              )}

              {currentStepId === "scorer" && (
                <ScorerPanel onScorerChange={setScorer} />
              )}

              {currentStepId === "scoresheet" && (
                <ScoresheetPanel onScoresheetChange={setScoresheet} />
              )}
            </div>
          </WizardStepContainer>


          {/* Error display with recovery options */}
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

          {/* Saving indicator */}
          {isSaving && (
            <div className="mt-4 text-center text-sm text-text-muted dark:text-text-muted-dark">
              {t("validation.wizard.saving")}
            </div>
          )}

          {/* Footer with navigation buttons */}
          <div className="flex justify-between gap-3 pt-4 border-t border-border-default dark:border-border-default-dark mt-4">
            {/* Left side: Back button or Cancel on first step */}
            <div>
              {isFirstStep ? (
                <button
                  type="button"
                  onClick={() => attemptClose()}
                  disabled={isFinalizing}
                  className="px-4 py-2 text-sm font-medium text-text-secondary dark:text-text-secondary-dark bg-surface-subtle dark:bg-surface-subtle-dark rounded-md hover:bg-surface-muted dark:hover:bg-surface-muted-dark focus:outline-none focus:ring-2 focus:ring-border-strong disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("common.cancel")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isFinalizing}
                  className="px-4 py-2 text-sm font-medium text-text-secondary dark:text-text-secondary-dark bg-surface-subtle dark:bg-surface-subtle-dark rounded-md hover:bg-surface-muted dark:hover:bg-surface-muted-dark focus:outline-none focus:ring-2 focus:ring-border-strong disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("validation.wizard.previous")}
                </button>
              )}
            </div>

            {/* Right side: Validate button (marks done + advances) or Finish on last step */}
            <div>
              {isLastStep ? (
                <button
                  type="button"
                  onClick={() => handleFinish()}
                  disabled={
                    isFinalizing ||
                    !allPreviousRequiredStepsDone ||
                    (!currentStep.isOptional && !canMarkCurrentStepDone)
                  }
                  title={
                    !allPreviousRequiredStepsDone
                      ? t("validation.state.markAllStepsTooltip")
                      : undefined
                  }
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isFinalizing
                    ? t("common.loading")
                    : t("validation.wizard.finish")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleValidateAndNext}
                  disabled={isFinalizing || !canMarkCurrentStepDone}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("validation.wizard.validate")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved changes confirmation dialog */}
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
