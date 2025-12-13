import { useState } from "react";
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

  const getSwipeConfig = (compensation: CompensationRecord): SwipeConfig => {
    const actions = createCompensationActions(compensation, {
      onEditCompensation: editCompensationModal.open,
      onGeneratePDF: handleGeneratePDF,
    });

    return {
      left: [actions.editCompensation, actions.generatePDF],
    };
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

      {/* Filter buttons */}
      <div className="flex gap-2">
        {(["all", "unpaid", "paid"] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium transition-colors
              ${
                filter === f
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }
            `}
          >
            {f === "all"
              ? t("compensations.all")
              : f === "paid"
                ? t("compensations.paid")
                : t("compensations.pending")}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-3">
        {isLoading && <LoadingState message="Loading compensations..." />}

        {error && (
          <ErrorState
            message={
              error instanceof Error
                ? error.message
                : "Failed to load compensations"
            }
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !error && data && data.length === 0 && (
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
        )}

        {!isLoading && !error && data && data.length > 0 && (
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
        )}
      </div>

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
