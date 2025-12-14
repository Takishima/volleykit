import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { Assignment } from "@/api/client";
import { useTranslation } from "@/hooks/useTranslation";
import { getTeamNames } from "@/utils/assignment-helpers";
import { Tabs, TabPanel, type TabStatus } from "@/components/ui/Tabs";
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

type ValidationTabId = "home-roster" | "away-roster" | "scorer" | "scoresheet";

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
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ValidationTabId>("home-roster");
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
  } = useValidationState();

  // Refs to prevent race conditions and enable cleanup
  const isDirtyRef = useRef(isDirty);
  const isSavingRef = useRef(false);
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

  // Determine tab status based on completion
  const getTabStatus = useCallback(
    (tabId: ValidationTabId): TabStatus | undefined => {
      switch (tabId) {
        case "home-roster":
          return completionStatus.homeRoster ? "complete" : "incomplete";
        case "away-roster":
          return completionStatus.awayRoster ? "complete" : "incomplete";
        case "scorer":
          return completionStatus.scorer ? "complete" : "incomplete";
        case "scoresheet":
          // Scoresheet is optional, so no indicator needed
          return undefined;
        default:
          return undefined;
      }
    },
    [completionStatus],
  );

  const tabs = useMemo(
    () => [
      {
        id: "home-roster",
        label: t("validation.homeRoster"),
        status: getTabStatus("home-roster"),
      },
      {
        id: "away-roster",
        label: t("validation.awayRoster"),
        status: getTabStatus("away-roster"),
      },
      {
        id: "scorer",
        label: t("validation.scorer"),
        status: getTabStatus("scorer"),
      },
      {
        id: "scoresheet",
        label: t("validation.scoresheet"),
        badge: t("common.optional"),
        status: getTabStatus("scoresheet"),
      },
    ],
    [t, getTabStatus],
  );

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab("home-roster");
      setSaveError(null);
      setSuccessToast(null);
      reset();
    }
  }, [isOpen, reset]);

  // Attempt to close - show dialog if dirty
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

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId as ValidationTabId);
  }, []);

  // Handle save action with race condition protection
  const handleSave = useCallback(async () => {
    // Guard against concurrent save operations
    if (!isAllRequiredComplete || isSavingRef.current) return;

    isSavingRef.current = true;
    setIsSaving(true);
    setSaveError(null);

    try {
      // TODO(#40): Implement actual API call for saving validation data
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
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [isAllRequiredComplete, t, onClose]);

  // Confirm discard changes
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
        attemptClose();
      }
    },
    [attemptClose],
  );

  if (!isOpen) return null;

  const { homeTeam, awayTeam } = getTeamNames(assignment);

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

          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            ariaLabel={t("assignments.validateGame")}
          />

          <TabPanel tabId="home-roster" activeTab={activeTab}>
            <HomeRosterPanel
              assignment={assignment}
              onModificationsChange={setHomeRosterModifications}
            />
          </TabPanel>

          <TabPanel tabId="away-roster" activeTab={activeTab}>
            <AwayRosterPanel
              assignment={assignment}
              onModificationsChange={setAwayRosterModifications}
            />
          </TabPanel>

          <TabPanel tabId="scorer" activeTab={activeTab}>
            <ScorerPanel onScorerChange={setScorer} />
          </TabPanel>

          <TabPanel tabId="scoresheet" activeTab={activeTab}>
            <ScoresheetPanel onScoresheetChange={setScoresheet} />
          </TabPanel>

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
                onClick={handleSave}
                className="mt-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
              >
                {t("common.retry")}
              </button>
            </div>
          )}

          {/* Footer with Cancel and Save buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
            <button
              type="button"
              onClick={attemptClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isAllRequiredComplete || isSaving}
              title={
                !isAllRequiredComplete
                  ? t("validation.state.saveDisabledTooltip")
                  : undefined
              }
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? t("common.loading") : t("common.save")}
            </button>
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
