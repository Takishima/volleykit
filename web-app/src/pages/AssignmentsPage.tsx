import { useState, useCallback } from "react";
import {
  useUpcomingAssignments,
  useValidationClosedAssignments,
} from "@/hooks/useConvocations";
import { AssignmentCard } from "@/components/features/AssignmentCard";
import { SwipeableCard } from "@/components/ui/SwipeableCard";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/ui/LoadingSpinner";
import { useAssignmentActions } from "@/hooks/useAssignmentActions";
import { createAssignmentActions } from "@/utils/assignment-actions";
import { EditCompensationModal } from "@/components/features/EditCompensationModal";
import { ValidateGameModal } from "@/components/features/ValidateGameModal";
import type { Assignment } from "@/api/client";
import { useTranslation } from "@/hooks/useTranslation";

type TabType = "upcoming" | "validationClosed";

export function AssignmentsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("upcoming");
  const { t } = useTranslation();

  const {
    editCompensationModal,
    validateGameModal,
    handleGenerateReport,
    handleAddToExchange,
  } = useAssignmentActions();

  const {
    data: upcomingData,
    isLoading: upcomingLoading,
    error: upcomingError,
    refetch: refetchUpcoming,
  } = useUpcomingAssignments();

  const {
    data: validationClosedData,
    isLoading: validationClosedLoading,
    error: validationClosedError,
    refetch: refetchValidationClosed,
  } = useValidationClosedAssignments();

  const data = activeTab === "upcoming" ? upcomingData : validationClosedData;
  const isLoading = activeTab === "upcoming" ? upcomingLoading : validationClosedLoading;
  const error = activeTab === "upcoming" ? upcomingError : validationClosedError;
  const refetch = activeTab === "upcoming" ? refetchUpcoming : refetchValidationClosed;

  const getSwipeConfig = useCallback(
    (assignment: Assignment) => {
      const actions = createAssignmentActions(assignment, {
        onEditCompensation: editCompensationModal.open,
        onValidateGame: validateGameModal.open,
        onGenerateReport: handleGenerateReport,
        onAddToExchange: handleAddToExchange,
      });

      const isGameInFuture = assignment.refereeGame?.isGameInFuture === "1";

      // Action array ordering: first item = furthest from card = full swipe default
      // When swiping left, actions appear right-to-left from the card edge
      return {
        // Swipe left reveals: [Report] [Edit] [Validate] <- card
        // Full swipe left triggers: validateGame (first in array = leftmost)
        left: [
          actions.validateGame,
          actions.editCompensation,
          actions.generateReport,
        ],
        // Swipe right reveals: card -> [Exchange]
        // Full swipe right triggers: addToExchange
        // Only show exchange action for upcoming assignments
        right: isGameInFuture ? [actions.addToExchange] : [],
      };
    },
    [
      editCompensationModal,
      validateGameModal,
      handleGenerateReport,
      handleAddToExchange,
    ],
  );

  return (
    <div className="space-y-3">
      {/* Tabs - WAI-ARIA tab pattern */}
      <div
        role="tablist"
        aria-label={t("assignments.title")}
        className="flex gap-2 border-b border-gray-200 dark:border-gray-700"
      >
        <button
          role="tab"
          aria-selected={activeTab === "upcoming"}
          aria-controls="upcoming-tabpanel"
          id="upcoming-tab"
          onClick={() => setActiveTab("upcoming")}
          className={`
            px-4 py-2 text-sm font-medium border-b-2 transition-colors
            ${
              activeTab === "upcoming"
                ? "border-orange-500 text-orange-600 dark:text-orange-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }
          `}
        >
          {t("assignments.upcoming")}
          {upcomingData && upcomingData.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 text-xs">
              {upcomingData.length}
            </span>
          )}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "validationClosed"}
          aria-controls="validation-closed-tabpanel"
          id="validation-closed-tab"
          onClick={() => setActiveTab("validationClosed")}
          className={`
            px-4 py-2 text-sm font-medium border-b-2 transition-colors
            ${
              activeTab === "validationClosed"
                ? "border-orange-500 text-orange-600 dark:text-orange-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }
          `}
        >
          {t("assignments.validationClosed")}
          {validationClosedData && validationClosedData.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs">
              {validationClosedData.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div
        role="tabpanel"
        id={activeTab === "upcoming" ? "upcoming-tabpanel" : "validation-closed-tabpanel"}
        aria-labelledby={activeTab === "upcoming" ? "upcoming-tab" : "validation-closed-tab"}
        className="space-y-3"
      >
        {isLoading && <LoadingState message="Loading assignments..." />}

        {error && (
          <ErrorState
            message={
              error instanceof Error
                ? error.message
                : "Failed to load assignments"
            }
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !error && data && data.length === 0 && (
          <EmptyState
            icon={activeTab === "upcoming" ? "📅" : "🔒"}
            title={
              activeTab === "upcoming"
                ? t("assignments.noUpcomingTitle")
                : t("assignments.noClosedTitle")
            }
            description={
              activeTab === "upcoming"
                ? t("assignments.noUpcomingDescription")
                : t("assignments.noClosedDescription")
            }
          />
        )}

        {!isLoading && !error && data && data.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((assignment) => (
              <SwipeableCard
                key={assignment.__identity}
                swipeConfig={getSwipeConfig(assignment)}
              >
                {({ isDrawerOpen }) => (
                  <AssignmentCard
                    assignment={assignment}
                    disableExpansion={isDrawerOpen}
                  />
                )}
              </SwipeableCard>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {editCompensationModal.assignment && (
        <EditCompensationModal
          assignment={editCompensationModal.assignment}
          isOpen={editCompensationModal.isOpen}
          onClose={editCompensationModal.close}
        />
      )}

      {validateGameModal.assignment && (
        <ValidateGameModal
          assignment={validateGameModal.assignment}
          isOpen={validateGameModal.isOpen}
          onClose={validateGameModal.close}
        />
      )}
    </div>
  );
}
