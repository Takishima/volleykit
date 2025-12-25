import { useState, useCallback, useMemo, lazy, Suspense } from "react";
import { useCompensations, useCompensationTotals } from "@/hooks/useConvocations";
import { CompensationCard } from "@/components/features/CompensationCard";
import { SwipeableCard } from "@/components/ui/SwipeableCard";
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

const EditCompensationModal = lazy(
  () =>
    import("@/components/features/EditCompensationModal").then((m) => ({
      default: m.EditCompensationModal,
    })),
);

type FilterType = "all" | "paid" | "unpaid";

// Convert tab filter to useCompensations parameter
function filterToPaidFilter(filter: FilterType): boolean | undefined {
  switch (filter) {
    case "paid":
      return true;
    case "unpaid":
      return false;
    default:
      return undefined;
  }
}

export function CompensationsPage() {
  const [filter, setFilter] = useState<FilterType>("unpaid");
  const { t } = useTranslation();
  const { editCompensationModal, handleGeneratePDF } = useCompensationActions();

  // Initialize tour for this page (triggers auto-start on first visit)
  useTour("compensations");

  // Single data fetch based on current filter (like ExchangePage pattern)
  const paidFilter = useMemo(() => filterToPaidFilter(filter), [filter]);
  const { data, isLoading, error, refetch } = useCompensations(paidFilter);

  const totals = useCompensationTotals();

  const tabs = [
    { id: "unpaid" as const, label: t("compensations.pending") },
    { id: "paid" as const, label: t("compensations.paid") },
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
      case "paid":
        return {
          title: t("compensations.noPaidTitle"),
          description: t("compensations.noPaidDescription"),
        };
      case "unpaid":
        return {
          title: t("compensations.noUnpaidTitle"),
          description: t("compensations.noUnpaidDescription"),
        };
      default:
        return {
          title: t("compensations.noCompensationsTitle"),
          description: t("compensations.noCompensationsDescription"),
        };
    }
  };

  const renderContent = () => {
    if (isLoading) {
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

    if (!data || data.length === 0) {
      const { title, description } = getEmptyStateContent();
      return <EmptyState icon="wallet" title={title} description={description} />;
    }

    return (
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((compensation, index) => (
          <SwipeableCard
            key={compensation.__identity}
            swipeConfig={getSwipeConfig(compensation)}
          >
            {({ isDrawerOpen }) => (
              <CompensationCard
                compensation={compensation}
                disableExpansion={isDrawerOpen}
                dataTour={index === 0 ? "compensation-card" : undefined}
              />
            )}
          </SwipeableCard>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Totals summary */}
      <div className="flex justify-end">
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-sm text-text-muted dark:text-text-muted-dark">
              {t("compensations.pending")}
            </div>
            <div className="text-lg font-bold text-warning-500 dark:text-warning-400">
              CHF {totals.unpaid.toFixed(2)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-text-muted dark:text-text-muted-dark">
              {t("compensations.received")}
            </div>
            <div className="text-lg font-bold text-success-500 dark:text-success-400">
              CHF {totals.paid.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

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
