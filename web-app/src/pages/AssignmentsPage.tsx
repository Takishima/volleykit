import { useState, useCallback, useMemo, lazy, Suspense, Fragment } from "react";
import {
  useUpcomingAssignments,
  useValidationClosedAssignments,
  useCalendarAssignments,
} from "@/hooks/useConvocations";
import { AssignmentCard } from "@/components/features/AssignmentCard";
import { SwipeableCard } from "@/components/ui/SwipeableCard";
import type { CalendarAssignment } from "@/hooks/useConvocations";
import { mapCalendarAssignmentToAssignment } from "@/utils/calendar-helpers";
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
import { useAuthStore } from "@/stores/auth";
import { useShallow } from "zustand/react/shallow";

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

type TranslationFn = ReturnType<typeof useTranslation>["t"];

/**
 * Get empty state content for assignments page.
 * Extracted to reduce cognitive complexity of main component.
 */
function getEmptyStateContent(
  isCalendarMode: boolean,
  activeTab: TabType,
  hasCalendarData: boolean,
  t: TranslationFn,
): { title: string; description: string } {
  if (isCalendarMode && activeTab === "upcoming") {
    return hasCalendarData
      ? {
          title: t("assignments.calendarNoUpcomingTitle"),
          description: t("assignments.calendarNoUpcomingDescription"),
        }
      : {
          title: t("assignments.calendarEmptyTitle"),
          description: t("assignments.calendarEmptyDescription"),
        };
  }
  if (activeTab === "upcoming") {
    return {
      title: t("assignments.noUpcomingTitle"),
      description: t("assignments.noUpcomingDescription"),
    };
  }
  return {
    title: t("assignments.noClosedTitle"),
    description: t("assignments.noClosedDescription"),
  };
}

export function AssignmentsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("upcoming");
  const { t } = useTranslation();
  const { isAssociationSwitching, isCalendarMode } = useAuthStore(
    useShallow((state) => ({
      isAssociationSwitching: state.isAssociationSwitching,
      isCalendarMode: state.isCalendarMode(),
    })),
  );

  // Initialize tour for this page (triggers auto-start on first visit)
  // Use showDummyData to show dummy data immediately, avoiding race condition with empty states
  const { showDummyData } = useTour("assignments");

  const {
    editCompensationModal,
    validateGameModal,
    pdfReportModal,
    handleGenerateReport,
    handleAddToExchange,
  } = useAssignmentActions();

  // Fetch regular assignments (only enabled when not in calendar mode)
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

  // Fetch calendar assignments (only enabled in calendar mode)
  const {
    data: calendarData,
    isLoading: calendarLoading,
    error: calendarError,
    refetch: refetchCalendar,
  } = useCalendarAssignments();

  // Compute calendar-specific data (filter by upcoming/past based on current date)
  const calendarUpcoming = useMemo(() => {
    if (!isCalendarMode || !calendarData) return [];
    const now = new Date();
    return calendarData.filter((a) => new Date(a.startTime) >= now);
  }, [isCalendarMode, calendarData]);

  const calendarPast = useMemo(() => {
    if (!isCalendarMode || !calendarData) return [];
    const now = new Date();
    return calendarData.filter((a) => new Date(a.startTime) < now);
  }, [isCalendarMode, calendarData]);

  // Select the appropriate data source based on mode and tab
  const rawData = useMemo(() => {
    if (isCalendarMode) {
      // Calendar mode: return calendar data filtered by tab
      // Note: Calendar assignments are displayed as limited info since they don't have full Assignment structure
      return activeTab === "upcoming" ? calendarUpcoming : calendarPast;
    }
    return activeTab === "upcoming" ? upcomingData : validationClosedData;
  }, [isCalendarMode, activeTab, calendarUpcoming, calendarPast, upcomingData, validationClosedData]);

  // Show loading when switching associations or when query is loading
  const isLoading = useMemo(() => {
    if (isAssociationSwitching) return true;
    if (isCalendarMode) return calendarLoading;
    return activeTab === "upcoming" ? upcomingLoading : validationClosedLoading;
  }, [isAssociationSwitching, isCalendarMode, calendarLoading, activeTab, upcomingLoading, validationClosedLoading]);

  const error = useMemo(() => {
    if (isCalendarMode) return calendarError;
    return activeTab === "upcoming" ? upcomingError : validationClosedError;
  }, [isCalendarMode, calendarError, activeTab, upcomingError, validationClosedError]);

  const refetch = useCallback(() => {
    if (isCalendarMode) {
      return refetchCalendar();
    }
    return activeTab === "upcoming" ? refetchUpcoming() : refetchValidationClosed();
  }, [isCalendarMode, activeTab, refetchCalendar, refetchUpcoming, refetchValidationClosed]);

  // When tour is active (or about to auto-start), show ONLY the dummy assignment
  // to ensure tour works regardless of whether tabs have real data
  const data = useMemo(() => {
    if (showDummyData) {
      // Safe cast: TourDummyAssignment provides all fields used by AssignmentCard and
      // eligibility checks (refereePosition, refereeGame, convocationCompensation)
      const tourAssignment = TOUR_DUMMY_ASSIGNMENT as unknown as Assignment;
      return [tourAssignment];
    }
    return rawData;
  }, [showDummyData, rawData]);

  // Group assignments by week for visual separation
  // Handle both regular Assignment and CalendarAssignment types
  const groupedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    // For calendar mode, CalendarAssignment has startTime, regular Assignment has refereeGame?.game?.startingDateTime
    const getDate = isCalendarMode
      ? (a: { startTime?: string }) => a.startTime
      : (a: { refereeGame?: { game?: { startingDateTime?: string } } }) =>
          a.refereeGame?.game?.startingDateTime;
    return groupByWeek(data, getDate as (item: unknown) => string | undefined);
  }, [data, isCalendarMode]);

  const getSwipeConfig = useCallback(
    (assignment: Assignment) => {
      const actions = createAssignmentActions(
        assignment,
        {
          onEditCompensation: editCompensationModal.open,
          onValidateGame: validateGameModal.open,
          onGenerateReport: handleGenerateReport,
          onAddToExchange: handleAddToExchange,
        },
        t,
      );

      const canGenerateReport = isGameReportEligible(assignment);

      // In calendar mode, only allow report generation for NLA/NLB games
      // Other actions require full API access
      if (isCalendarMode) {
        return {
          left: canGenerateReport ? [actions.generateReport] : [],
          right: [],
        };
      }

      const isGameInFuture = assignment.refereeGame?.isGameInFuture === "1";
      const canValidateGame = isValidationEligible(assignment);
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
      isCalendarMode,
      editCompensationModal,
      validateGameModal,
      handleGenerateReport,
      handleAddToExchange,
      t,
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
          {((isCalendarMode ? calendarUpcoming : upcomingData) ?? []).length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 text-xs">
              {(isCalendarMode ? calendarUpcoming : upcomingData)?.length}
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
          {isCalendarMode ? t("assignments.past") : t("assignments.validationClosed")}
          {((isCalendarMode ? calendarPast : validationClosedData) ?? []).length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-surface-subtle dark:bg-surface-card-dark text-text-secondary dark:text-text-muted-dark text-xs">
              {(isCalendarMode ? calendarPast : validationClosedData)?.length}
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
        {/* Skip loading state when showing dummy tour data (we already have data to show) */}
        {isLoading && !showDummyData && <LoadingState message={t("assignments.loading")} />}

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

        {(!isLoading || showDummyData) && !error && data && data.length === 0 && (
          <EmptyState
            icon={activeTab === "upcoming" ? "calendar" : "lock"}
            {...getEmptyStateContent(
              isCalendarMode,
              activeTab,
              (calendarData?.length ?? 0) > 0,
              t,
            )}
          />
        )}

        {(!isLoading || showDummyData) && !error && groupedData.length > 0 && (
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
                  {isCalendarMode
                    ? // Calendar mode: same card component, no swipe actions
                      (group.items as CalendarAssignment[]).map(
                        (calendarAssignment, itemIndex) => {
                          const assignment = mapCalendarAssignmentToAssignment(calendarAssignment);
                          return (
                            <SwipeableCard
                              key={calendarAssignment.gameId}
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
                          );
                        },
                      )
                    : // Regular mode: render full cards with swipe actions
                      (group.items as Assignment[]).map(
                        (assignment, itemIndex) => (
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
                        ),
                      )}
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
