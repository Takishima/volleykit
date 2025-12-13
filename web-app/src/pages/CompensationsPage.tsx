import { useState, useCallback } from "react";
import {
  useCompensations,
  usePaidCompensations,
  useUnpaidCompensations,
  useCompensationTotals,
} from "@/hooks/useConvocations";
import { CompensationCard } from "@/components/features/CompensationCard";
import { EditCompensationModal } from "@/components/features/EditCompensationModal";
import { SwipeableCard } from "@/components/ui/SwipeableCard";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/ui/LoadingSpinner";
import { Tabs, TabPanel } from "@/components/ui/Tabs";
import { useCompensationActions } from "@/hooks/useCompensationActions";
import { createCompensationActions } from "@/utils/compensation-actions";
import type { CompensationRecord } from "@/api/client";
import type { SwipeConfig } from "@/types/swipe";
import { useTranslation } from "@/hooks/useTranslation";

type FilterType = "all" | "paid" | "unpaid";

export function CompensationsPage() {
  const [filter, setFilter] = useState<FilterType>("all");
  const { t } = useTranslation();
  const { editCompensationModal, handleGeneratePDF } = useCompensationActions();

  const {
    data: allData,
    isLoading: allLoading,
    error: allError,
    refetch: refetchAll,
  } = useCompensations();
  const {
    data: paidData,
    isLoading: paidLoading,
    error: paidError,
    refetch: refetchPaid,
  } = usePaidCompensations();
  const {
    data: unpaidData,
    isLoading: unpaidLoading,
    error: unpaidError,
    refetch: refetchUnpaid,
  } = useUnpaidCompensations();

  const totals = useCompensationTotals();

  const dataMap = { all: allData, paid: paidData, unpaid: unpaidData };
  const loadingMap = {
    all: allLoading,
    paid: paidLoading,
    unpaid: unpaidLoading,
  };
  const errorMap = { all: allError, paid: paidError, unpaid: unpaidError };
  const refetchMap = {
    all: refetchAll,
    paid: refetchPaid,
    unpaid: refetchUnpaid,
  };

  const data = dataMap[filter];
  const isLoading = loadingMap[filter];
  const error = errorMap[filter];
  const refetch = refetchMap[filter];

  const tabs = [
    { id: "all", label: t("compensations.all") },
    { id: "unpaid", label: t("compensations.pending") },
    { id: "paid", label: t("compensations.paid") },
  ];

  const handleTabChange = useCallback((tabId: string) => {
    setFilter(tabId as FilterType);
  }, []);

  const getSwipeConfig = (compensation: CompensationRecord): SwipeConfig => {
    const actions = createCompensationActions(compensation, {
      onEditCompensation: editCompensationModal.open,
      onGeneratePDF: handleGeneratePDF,
    });

    const isPaid = compensation.convocationCompensation?.paymentDone;

    return {
      left: isPaid
        ? [actions.generatePDF]
        : [actions.editCompensation, actions.generatePDF],
    };
  };

  const renderContent = () => {
    if (isLoading) {
      return <LoadingState message="Loading compensations..." />;
    }

    if (error) {
      return (
        <ErrorState
          message={
            error instanceof Error
              ? error.message
              : "Failed to load compensations"
          }
          onRetry={() => refetch()}
        />
      );
    }

    if (!data || data.length === 0) {
      return (
        <EmptyState
          icon="💰"
          title="No compensations"
          description={
            filter === "all"
              ? "You have no compensation records yet."
              : filter === "paid"
                ? "No paid compensations found."
                : "No pending compensations. All caught up!"
          }
        />
      );
    }

    return (
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((compensation) => (
          <SwipeableCard
            key={compensation.__identity}
            swipeConfig={getSwipeConfig(compensation)}
          >
            {({ isDrawerOpen }) => (
              <CompensationCard
                compensation={compensation}
                disableExpansion={isDrawerOpen}
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
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {t("compensations.pending")}
            </div>
            <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
              CHF {totals.unpaid.toFixed(2)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {t("compensations.received")}
            </div>
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
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

      {/* Content - using TabPanel for proper ARIA association */}
      <TabPanel tabId="all" activeTab={filter}>
        {renderContent()}
      </TabPanel>
      <TabPanel tabId="unpaid" activeTab={filter}>
        {renderContent()}
      </TabPanel>
      <TabPanel tabId="paid" activeTab={filter}>
        {renderContent()}
      </TabPanel>

      {/* Edit Compensation Modal */}
      {editCompensationModal.isOpen && editCompensationModal.compensation && (
        <EditCompensationModal
          isOpen={editCompensationModal.isOpen}
          onClose={editCompensationModal.close}
          compensation={editCompensationModal.compensation}
        />
      )}
    </div>
  );
}
