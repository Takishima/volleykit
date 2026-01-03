import { useState, useCallback, useMemo, lazy, Suspense, Fragment } from "react";
import { parseISO } from "date-fns";
import { useCompensations } from "@/hooks/useConvocations";
import { CompensationCard } from "@/components/features/CompensationCard";
import { SwipeableCard } from "@/components/ui/SwipeableCard";
import { WeekSeparator } from "@/components/ui/WeekSeparator";
import { groupByWeek, getSeasonDateRange } from "@/utils/date-helpers";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/ui/LoadingSpinner";
import { Tabs, TabPanel } from "@/components/ui/Tabs";
import { useCompensationActions } from "@/hooks/useCompensationActions";
import {
  createCompensationActions,
  isCompensationEditable,
} from "@/utils/compensation-actions";
import type { CompensationRecord } from "@/api/client";
import type { SwipeConfig } from "@/types/swipe";
import { useTranslation } from "@/hooks/useTranslation";
import { useTour } from "@/hooks/useTour";
import { TOUR_DUMMY_COMPENSATION } from "@/components/tour/definitions/compensations";
import { useAuthStore } from "@/stores/auth";

const EditCompensationModal = lazy(
  () =>
    import("@/components/features/EditCompensationModal").then((m) => ({
      default: m.EditCompensationModal,
    })),
);

type FilterType = "pendingPast" | "pendingFuture" | "closed" | "all";

// Convert tab filter to useCompensations parameter (paid status only)
function filterToPaidFilter(filter: FilterType): boolean | undefined {
  switch (filter) {
    case "closed":
      return true;
    case "pendingPast":
    case "pendingFuture":
      return false;
    default:
      return undefined;
  }
}

export function CompensationsPage() {
  const [filter, setFilter] = useState<FilterType>("pendingPast");
  const { t } = useTranslation();
  const { editCompensationModal, handleGeneratePDF } = useCompensationActions();
  const isAssociationSwitching = useAuthStore(
    (state) => state.isAssociationSwitching,
  );

  // Initialize tour for this page (triggers auto-start on first visit)
  // Use showDummyData to show dummy data immediately, avoiding race condition with empty states
  const { showDummyData } = useTour("compensations");

  // Single data fetch based on current filter (like ExchangePage pattern)
  const paidFilter = useMemo(() => filterToPaidFilter(filter), [filter]);
  const { data: rawData, isLoading: queryLoading, error, refetch } = useCompensations(paidFilter);
  // Show loading when switching associations or when query is loading
  const isLoading = isAssociationSwitching || queryLoading;

  // Calculate season date range for filtering
  const seasonRange = useMemo(() => getSeasonDateRange(), []);

  // Memoize current date to avoid recreating on every render.
  // Note: This value is fixed for the component's lifetime. If a user keeps the page open
  // past midnight, past/future classification won't update until they refresh or navigate away.
  const now = useMemo(() => new Date(), []);

  // When tour is active (or about to auto-start), show ONLY the dummy compensation
  // to ensure tour works regardless of whether tabs have real data
  const data = useMemo(() => {
    if (showDummyData) {
      // Safe cast: TourDummyCompensation provides all fields used by CompensationCard
      const tourCompensation = TOUR_DUMMY_COMPENSATION as unknown as CompensationRecord;
      return [tourCompensation];
    }

    if (!rawData) return rawData;

    // Apply filters - always filter to current season since the app is only useful for current season
    return rawData.filter((record) => {
      const dateString = record.refereeGame?.game?.startingDateTime;
      if (!dateString) return true; // Keep items without dates

      const gameDate = parseISO(dateString);

      // Always filter by current season (Sept 1 - May 31)
      if (gameDate < seasonRange.from || gameDate > seasonRange.to) {
        return false;
      }

      // Filter by past/future based on selected tab
      if (filter === "pendingPast" && gameDate > now) {
        return false; // Only show past items for pendingPast tab
      }
      if (filter === "pendingFuture" && gameDate <= now) {
        return false; // Only show future items for pendingFuture tab
      }

      return true;
    });
  }, [showDummyData, rawData, filter, seasonRange, now]);

  // Group compensations by week for visual separation
  const groupedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return groupByWeek(data, (c) => c.refereeGame?.game?.startingDateTime);
  }, [data]);

  const tabs = [
    { id: "pendingPast" as const, label: t("compensations.pendingPast") },
    { id: "pendingFuture" as const, label: t("compensations.pendingFuture") },
    { id: "closed" as const, label: t("compensations.closed") },
    { id: "all" as const, label: t("compensations.all") },
  ];

  const handleTabChange = useCallback((tabId: string) => {
    setFilter(tabId as FilterType);
  }, []);

  const getSwipeConfig = useCallback(
    (compensation: CompensationRecord): SwipeConfig => {
      const actions = createCompensationActions(compensation, {
        onEditCompensation: editCompensationModal.open,
        onGeneratePDF: handleGeneratePDF,
      });

      const canEdit = isCompensationEditable(compensation);

      return {
        left: canEdit
          ? [actions.editCompensation, actions.generatePDF]
          : [actions.generatePDF],
      };
    },
    [editCompensationModal.open, handleGeneratePDF],
  );

  const getEmptyStateContent = () => {
    switch (filter) {
      case "pendingPast":
        return {
          title: t("compensations.noPendingPastTitle"),
          description: t("compensations.noPendingPastDescription"),
        };
      case "pendingFuture":
        return {
          title: t("compensations.noPendingFutureTitle"),
          description: t("compensations.noPendingFutureDescription"),
        };
      case "closed":
        return {
          title: t("compensations.noClosedTitle"),
          description: t("compensations.noClosedDescription"),
        };
      default:
        return {
          title: t("compensations.noCompensationsTitle"),
          description: t("compensations.noCompensationsDescription"),
        };
    }
  };

  const renderContent = () => {
    // Skip loading state when showing dummy tour data (we already have data to show)
    if (isLoading && !showDummyData) {
      return <LoadingState message={t("compensations.loading")} />;
    }

    if (error) {
      return (
        <ErrorState
          message={
            error instanceof Error
              ? error.message
              : t("compensations.errorLoading")
          }
          onRetry={() => refetch()}
        />
      );
    }

    if (groupedData.length === 0) {
      const { title, description } = getEmptyStateContent();
      return <EmptyState icon="wallet" title={title} description={description} />;
    }

    return (
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
              {group.items.map((compensation, itemIndex) => (
                <SwipeableCard
                  key={compensation.__identity}
                  swipeConfig={getSwipeConfig(compensation)}
                >
                  {({ isDrawerOpen }) => (
                    <CompensationCard
                      compensation={compensation}
                      disableExpansion={isDrawerOpen}
                      dataTour={
                        itemsBeforeThisGroup + itemIndex === 0
                          ? "compensation-card"
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
    );
  };

  return (
    <div className="space-y-3">
      {/* Filter tabs with keyboard navigation */}
      <Tabs
        tabs={tabs}
        activeTab={filter}
        onTabChange={handleTabChange}
        ariaLabel={t("compensations.title")}
      />

      {/* Content - single TabPanel since all tabs show same component with different data */}
      <TabPanel tabId={filter} activeTab={filter}>
        {renderContent()}
      </TabPanel>

      {/* Edit Compensation Modal - compensation is guaranteed non-null by conditional render */}
      {editCompensationModal.compensation && (
        <Suspense fallback={null}>
          <EditCompensationModal
            isOpen={editCompensationModal.isOpen}
            onClose={editCompensationModal.close}
            compensation={editCompensationModal.compensation}
          />
        </Suspense>
      )}
    </div>
  );
}
