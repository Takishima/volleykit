import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { Assignment, NominationList } from "@/api/client";
import { useTranslation } from "@/hooks/useTranslation";
import { logger } from "@/utils/logger";
import { useWizardNavigation } from "@/hooks/useWizardNavigation";
import { useValidationState } from "@/hooks/useValidationState";

/** Duration to show success toast before auto-dismissing */
const SUCCESS_TOAST_DURATION_MS = 3000;

export type ValidationStepId = "home-roster" | "away-roster" | "scorer" | "scoresheet";

export interface ValidationStep {
  id: ValidationStepId;
  label: string;
  isOptional?: boolean;
}

interface UseValidateGameWizardOptions {
  assignment: Assignment;
  isOpen: boolean;
  onClose: () => void;
}

export interface UseValidateGameWizardResult {
  // Wizard navigation
  currentStepIndex: number;
  currentStepId: ValidationStepId;
  currentStep: ValidationStep;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  stepsMarkedDone: ReadonlySet<number>;
  goToStep: (index: number) => void;
  wizardSteps: ValidationStep[];

  // Validation state
  validationState: ReturnType<typeof useValidationState>["state"];
  isDirty: boolean;
  completionStatus: ReturnType<typeof useValidationState>["completionStatus"];
  isValidated: boolean;
  validatedInfo: ReturnType<typeof useValidationState>["validatedInfo"];
  pendingScorer: ReturnType<typeof useValidationState>["pendingScorer"];
  scoresheetNotRequired: boolean;
  setHomeRosterModifications: ReturnType<typeof useValidationState>["setHomeRosterModifications"];
  setAwayRosterModifications: ReturnType<typeof useValidationState>["setAwayRosterModifications"];
  setScorer: ReturnType<typeof useValidationState>["setScorer"];
  setScoresheet: ReturnType<typeof useValidationState>["setScoresheet"];
  isSaving: boolean;
  isFinalizing: boolean;
  isLoadingGameDetails: boolean;
  gameDetailsError: Error | null;
  homeNominationList: NominationList | null;
  awayNominationList: NominationList | null;

  // UI state
  showUnsavedDialog: boolean;
  saveError: string | null;
  successToast: string | null;
  isAddPlayerSheetOpen: boolean;

  // Computed values
  canMarkCurrentStepDone: boolean;
  allPreviousRequiredStepsDone: boolean;
  isSwipeEnabled: boolean;

  // Handlers
  attemptClose: () => void;
  handleFinish: () => Promise<void>;
  handleSaveAndClose: () => Promise<void>;
  handleDiscardAndClose: () => void;
  handleCancelClose: () => void;
  goNext: () => void;
  handleValidateAndNext: () => void;
  goBack: () => void;
  handleAddPlayerSheetOpenChange: (open: boolean) => void;
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
  const { t } = useTranslation();

  // UI state
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
    homeNominationList,
    awayNominationList,
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

  // Refs for tracking state without re-renders
  const isDirtyRef = useRef(isDirty);
  const isFinalizingRef = useRef(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep dirty ref in sync
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // Cleanup toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }
    };
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSaveError(null);
      setSuccessToast(null);
      reset();
      resetToStart();
    }
  }, [isOpen, reset, resetToStart]);

  // Computed values
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

  const isSwipeEnabled = !isFinalizing && !isLoadingGameDetails && !isAddPlayerSheetOpen;

  // Handlers
  const attemptClose = useCallback(() => {
    if (isValidated) {
      onClose();
    } else if (isDirtyRef.current) {
      setShowUnsavedDialog(true);
    } else {
      onClose();
    }
  }, [onClose, isValidated]);

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

  const handleValidateAndNext = useCallback(() => {
    if (!canMarkCurrentStepDone) return;
    setStepDone(currentStepIndex, true);
    goNext();
  }, [canMarkCurrentStepDone, setStepDone, currentStepIndex, goNext]);

  const handleAddPlayerSheetOpenChange = useCallback((open: boolean) => {
    setIsAddPlayerSheetOpen(open);
  }, []);

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
    saveError,
    successToast,
    isAddPlayerSheetOpen,

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
  };
}
