import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { Assignment } from "@/api/client";
import { useTranslation } from "@/hooks/useTranslation";
import { getTeamNames } from "@/utils/assignment-helpers";
import {
  useWizardNavigation,
  type WizardStep,
} from "@/hooks/useWizardNavigation";
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

/** Dialog for confirming close with unsaved changes */
function UnsavedChangesDialog({
  isOpen,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
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
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full p-6"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-changes-title"
        aria-describedby="unsaved-changes-description"
      >
        <h3
          id="unsaved-changes-title"
          className="text-lg font-semibold text-gray-900 dark:text-white mb-2"
        >
          {t("validation.state.unsavedChangesTitle")}
        </h3>
        <p
          id="unsaved-changes-description"
          className="text-sm text-gray-600 dark:text-gray-400 mb-4"
        >
          {t("validation.state.unsavedChangesMessage")}
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            {t("validation.state.continueEditing")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {t("validation.state.discardChanges")}
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
    isAllRequiredComplete,
    setHomeRosterModifications,
    setAwayRosterModifications,
    setScorer,
    setScoresheet,
    reset,
    saveProgress,
    isSaving,
  } = useValidationState();

  // Define wizard steps
  const wizardSteps = useMemo<WizardStep[]>(
    () => [
      { id: "home-roster", label: t("validation.homeRoster") },
      { id: "away-roster", label: t("validation.awayRoster") },
      { id: "scorer", label: t("validation.scorer") },
      { id: "scoresheet", label: t("validation.scoresheet"), isOptional: true },
    ],
    [t],
  );

  // Handle step change - save progress
  const handleStepChange = useCallback(async () => {
    await saveProgress();
  }, [saveProgress]);

  const {
    currentStepIndex,
    currentStep,
    totalSteps,
    isFirstStep,
    isLastStep,
    goNext,
    goBack,
    goToStep,
  } = useWizardNavigation({
    steps: wizardSteps,
    onStepChange: handleStepChange,
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
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Build completion status map for step indicator
  const stepCompletionStatus = useMemo(
    () => ({
      "home-roster": completionStatus.homeRoster,
      "away-roster": completionStatus.awayRoster,
      scorer: completionStatus.scorer,
      scoresheet: completionStatus.scoresheet,
    }),
    [completionStatus],
  );

  // Reset state when modal opens - use a separate state to track step reset
  // to avoid infinite loop from goToStep dependency changes
  const [stepResetKey, setStepResetKey] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setSaveError(null);
      setSuccessToast(null);
      reset();
      // Trigger step reset by incrementing key
      setStepResetKey((k) => k + 1);
    }
  }, [isOpen, reset]);

  // Reset to step 0 when stepResetKey changes (modal reopened)
  useEffect(() => {
    if (stepResetKey > 0) {
      goToStep(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepResetKey]);

  // Attempt to close - save progress first
  const attemptClose = useCallback(async () => {
    if (isDirtyRef.current) {
      // Save progress before asking about discard
      await saveProgress();
    }
    onClose();
  }, [onClose, saveProgress]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      // Don't close if unsaved dialog is showing
      if (showUnsavedDialog) return;
      if (e.key === "Escape") {
        void attemptClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, attemptClose, showUnsavedDialog]);

  // Handle finish action (finalize validation)
  const handleFinish = useCallback(async () => {
    // Guard against concurrent operations
    if (!isAllRequiredComplete || isFinalizingRef.current) return;

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
  }, [isAllRequiredComplete, t, onClose]);

  // Confirm discard changes (for unsaved dialog)
  const handleConfirmDiscard = useCallback(() => {
    setShowUnsavedDialog(false);
    reset();
    onClose();
  }, [reset, onClose]);

  // Cancel discard
  const handleCancelDiscard = useCallback(() => {
    setShowUnsavedDialog(false);
  }, []);

  // Handle backdrop click (only close if clicking the backdrop itself, not the dialog)
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        void attemptClose();
      }
    },
    [attemptClose],
  );

  // Handle next button - save and advance
  // Note: saveProgress is called via onStepChange callback, no need to await
  const handleNext = useCallback(() => {
    goNext();
  }, [goNext]);

  // Handle back button - save and go back
  // Note: saveProgress is called via onStepChange callback, no need to await
  const handleBack = useCallback(() => {
    goBack();
  }, [goBack]);

  if (!isOpen) return null;

  const { homeTeam, awayTeam } = getTeamNames(assignment);
  const currentStepId = currentStep.id as ValidationStepId;

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
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="validate-game-title"
        >
          <h2
            id="validate-game-title"
            className="text-xl font-semibold text-gray-900 dark:text-white mb-2"
          >
            {t("assignments.validateGame")}
          </h2>

          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="font-medium text-gray-900 dark:text-white">
              {homeTeam} vs {awayTeam}
            </div>
          </div>

          {/* Step indicator */}
          <div className="mb-4">
            <WizardStepIndicator
              steps={wizardSteps}
              currentStepIndex={currentStepIndex}
              completionStatus={stepCompletionStatus}
            />
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
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
          </WizardStepContainer>

          {/* Error display */}
          {saveError && (
            <div
              role="alert"
              className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
            >
              <p className="text-sm text-red-700 dark:text-red-400">
                {saveError}
              </p>
              <button
                type="button"
                onClick={() => void handleFinish()}
                className="mt-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
              >
                {t("common.retry")}
              </button>
            </div>
          )}

          {/* Saving indicator */}
          {isSaving && (
            <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
              {t("validation.wizard.saving")}
            </div>
          )}

          {/* Footer with navigation buttons */}
          <div className="flex justify-between gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
            {/* Left side: Back button or Cancel on first step */}
            <div>
              {isFirstStep ? (
                <button
                  type="button"
                  onClick={() => void attemptClose()}
                  disabled={isFinalizing}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("common.cancel")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isFinalizing}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("validation.wizard.previous")}
                </button>
              )}
            </div>

            {/* Right side: Next button or Finish on last step */}
            <div>
              {isLastStep ? (
                <button
                  type="button"
                  onClick={() => void handleFinish()}
                  disabled={!isAllRequiredComplete || isFinalizing}
                  title={
                    !isAllRequiredComplete
                      ? t("validation.state.saveDisabledTooltip")
                      : undefined
                  }
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isFinalizing
                    ? t("common.loading")
                    : t("validation.wizard.finish")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={isFinalizing}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("validation.wizard.next")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved changes confirmation dialog */}
      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onConfirm={handleConfirmDiscard}
        onCancel={handleCancelDiscard}
      />
    </>
  );
}
