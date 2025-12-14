import { useState, useCallback, useEffect, useRef } from "react";
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
import { useAuthStore } from "@/stores/auth";

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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
      aria-hidden="true"
    >
      <div
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
  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const [activeTab, setActiveTab] = useState<ValidationTabId>("home-roster");
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  // Use refs to avoid stale closures in callbacks
  const isDirtyRef = useRef(isDirty);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

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

  const tabs = [
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
  ];

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab("home-roster");
      setSaveError(null);
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

  // Handle save action
  const handleSave = useCallback(async () => {
    if (!isAllRequiredComplete) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      // TODO(#40): Implement actual API call for saving validation data
      // For now, simulate a save operation
      if (isDemoMode) {
        // In demo mode, just simulate success after a brief delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        // Show success feedback
        alert(t("validation.state.saveSuccess"));
        onClose();
      } else {
        // In real mode, this would call the API
        // For now, simulate success
        await new Promise((resolve) => setTimeout(resolve, 500));
        alert(t("validation.state.saveSuccess"));
        onClose();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save";
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  }, [isAllRequiredComplete, isDemoMode, t, onClose]);

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
      {/* Backdrop - click handled via event target check */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
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
