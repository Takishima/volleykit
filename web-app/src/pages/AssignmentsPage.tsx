import { useState, useCallback, useMemo, lazy, Suspense, Fragment } from "react";
import {
  useUpcomingAssignments,
  useValidationClosedAssignments,
} from "@/hooks/useConvocations";
import { AssignmentCard } from "@/components/features/AssignmentCard";
import { SwipeableCard } from "@/components/ui/SwipeableCard";
import { WeekSeparator } from "@/components/ui/WeekSeparator";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/ui/LoadingSpinner";
import { useAssignmentActions } from "@/hooks/useAssignmentActions";
import { createAssignmentActions } from "@/utils/assignment-actions";
import {
  isGameReportEligible,
  isValidationEligible,
} from "@/utils/assignment-helpers";
import { isAssignmentCompensationEditable } from "@/utils/compensation-actions";
import { groupByWeek } from "@/utils/date-helpers";
import type { Assignment } from "@/api/client";
import { useTranslation } from "@/hooks/useTranslation";
import { useTour } from "@/hooks/useTour";
import { TOUR_DUMMY_ASSIGNMENT } from "@/components/tour/definitions/assignments";

const PdfLanguageModal = lazy(
  () =>
    import("@/components/features/PdfLanguageModal").then((m) => ({
      default: m.PdfLanguageModal,
    })),
);

const EditCompensationModal = lazy(
  () =>
    import("@/components/features/EditCompensationModal").then((m) => ({
      default: m.EditCompensationModal,
    })),
);

const ValidateGameModal = lazy(
  () =>
    import("@/components/features/ValidateGameModal").then((m) => ({
      default: m.ValidateGameModal,
    })),
);

type TabType = "upcoming" | "validationClosed";

export function AssignmentsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("upcoming");
  const { t } = useTranslation();

  // Initialize tour for this page (triggers auto-start on first visit)
  const { isTourMode } = useTour("assignments");

  const {
    editCompensationModal,
    validateGameModal,
    pdfReportModal,
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

  const rawData = activeTab === "upcoming" ? upcomingData : validationClosedData;
  const isLoading =
    activeTab === "upcoming" ? upcomingLoading : validationClosedLoading;
  const error =
    activeTab === "upcoming" ? upcomingError : validationClosedError;
  const refetch =
    activeTab === "upcoming" ? refetchUpcoming : refetchValidationClosed;

  // When tour is active, prepend a dummy assignment to demonstrate all action buttons
  const data = useMemo(() => {
    if (!isTourMode || activeTab !== "upcoming") {
      return rawData;
    }
    // Safe cast: TourDummyAssignment provides all fields used by AssignmentCard and
    // eligibility checks (refereePosition, refereeGame, convocationCompensation)
    const tourAssignment = TOUR_DUMMY_ASSIGNMENT as unknown as Assignment;
    return rawData ? [tourAssignment, ...rawData] : [tourAssignment];
  }, [isTourMode, activeTab, rawData]);

  // Group assignments by week for visual separation
  const groupedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return groupByWeek(data, (a) => a.refereeGame?.game?.startingDateTime);
  }, [data]);

  const getSwipeConfig = useCallback(
    (assignment: Assignment) => {
      const actions = createAssignmentActions(assignment, {
        onEditCompensation: editCompensationModal.open,
        onValidateGame: validateGameModal.open,
        onGenerateReport: handleGenerateReport,
        onAddToExchange: handleAddToExchange,
      });

      const isGameInFuture = assignment.refereeGame?.isGameInFuture === "1";
      const canValidateGame = isValidationEligible(assignment);
      const canGenerateReport = isGameReportEligible(assignment);
      const canEditCompensation = isAssignmentCompensationEditable(assignment);

      // Action array ordering: first item = furthest from card = full swipe default
      // When swiping left, actions appear right-to-left from the card edge
      // Validate action only shown for first referee (head-one position)
      // Report action only shown for NLA/NLB games where user is first referee
      // Edit compensation action only shown if compensation is editable
      const leftActions = canValidateGame ? [actions.validateGame] : [];
      if (canEditCompensation) {
        leftActions.push(actions.editCompensation);
      }
      if (canGenerateReport) {
        leftActions.push(actions.generateReport);
      }

      return {
        // Swipe left reveals: [Report?] [Edit] [Validate] <- card
        // Full swipe left triggers: validateGame (first in array = leftmost)
        left: leftActions,
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
        className="flex gap-2 border-b border-border-default dark:border-border-default-dark"
      >
        <button
          role="tab"
          aria-selected={activeTab === "upcoming"}
          aria-controls="tabpanel-upcoming"
          id="tab-upcoming"
          onClick={() => setActiveTab("upcoming")}
          className={`
            px-4 py-2 text-sm font-medium border-b-2 transition-colors
            ${
              activeTab === "upcoming"
                ? "border-primary-500 text-primary-600 dark:text-primary-400"
                : "border-transparent text-text-muted dark:text-text-muted-dark hover:text-text-secondary dark:hover:text-text-secondary-dark"
            }
          `}
        >
          {t("assignments.upcoming")}
          {upcomingData && upcomingData.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 text-xs">
              {upcomingData.length}
            </span>
          )}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "validationClosed"}
          aria-controls="tabpanel-validationClosed"
          id="tab-validationClosed"
          onClick={() => setActiveTab("validationClosed")}
          className={`
            px-4 py-2 text-sm font-medium border-b-2 transition-colors
            ${
              activeTab === "validationClosed"
                ? "border-primary-500 text-primary-600 dark:text-primary-400"
                : "border-transparent text-text-muted dark:text-text-muted-dark hover:text-text-secondary dark:hover:text-text-secondary-dark"
            }
          `}
        >
          {t("assignments.validationClosed")}
          {validationClosedData && validationClosedData.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-surface-subtle dark:bg-surface-card-dark text-text-secondary dark:text-text-muted-dark text-xs">
              {validationClosedData.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div
        role="tabpanel"
        id={
          activeTab === "upcoming"
            ? "tabpanel-upcoming"
            : "tabpanel-validationClosed"
        }
        aria-labelledby={
          activeTab === "upcoming" ? "tab-upcoming" : "tab-validationClosed"
        }
        className="space-y-3"
      >
        {isLoading && <LoadingState message={t("assignments.loading")} />}

        {error && (
          <ErrorState
            message={
              error instanceof Error
                ? error.message
                : t("assignments.failedToLoadData")
            }
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !error && data && data.length === 0 && (
          <EmptyState
            icon={activeTab === "upcoming" ? "calendar" : "lock"}
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

        {!isLoading && !error && groupedData.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {groupedData.map((group, groupIndex) => {
              // Track global item index for tour data attribute
              const itemsBeforeThisGroup = groupedData
                .slice(0, groupIndex)
                .reduce((sum, g) => sum + g.items.length, 0);

              return (
                <Fragment key={group.week.key}>
                  {/* Only show separator if there's more than one week */}
                  {groupedData.length > 1 && (
                    <WeekSeparator week={group.week} />
                  )}
                  {group.items.map((assignment, itemIndex) => (
                    <SwipeableCard
                      key={assignment.__identity}
                      swipeConfig={getSwipeConfig(assignment)}
                    >
                      {({ isDrawerOpen }) => (
                        <AssignmentCard
                          assignment={assignment}
                          disableExpansion={isDrawerOpen}
                          dataTour={
                            itemsBeforeThisGroup + itemIndex === 0
                              ? "assignment-card"
                              : undefined
                          }
                        />
                      )}
                    </SwipeableCard>
                  ))}
                </Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {editCompensationModal.assignment && (
        <Suspense fallback={null}>
          <EditCompensationModal
            assignment={editCompensationModal.assignment}
            isOpen={editCompensationModal.isOpen}
            onClose={editCompensationModal.close}
          />
        </Suspense>
      )}

      {validateGameModal.assignment && (
        <Suspense fallback={null}>
          <ValidateGameModal
            key={validateGameModal.assignment.__identity}
            assignment={validateGameModal.assignment}
            isOpen={validateGameModal.isOpen}
            onClose={validateGameModal.close}
          />
        </Suspense>
      )}

      {pdfReportModal.isOpen && (
        <Suspense fallback={null}>
          <PdfLanguageModal
            isOpen={pdfReportModal.isOpen}
            onClose={pdfReportModal.close}
            onConfirm={pdfReportModal.onConfirm}
            isLoading={pdfReportModal.isLoading}
            defaultLanguage={pdfReportModal.defaultLanguage}
          />
        </Suspense>
      )}
    </div>
  );
}
