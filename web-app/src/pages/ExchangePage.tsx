import { useState, useCallback } from "react";
import { useGameExchanges, type ExchangeStatus } from "@/hooks/useConvocations";
import { useExchangeActions } from "@/hooks/useExchangeActions";
import { createExchangeActions } from "@/utils/exchange-actions";
import { ExchangeCard } from "@/components/features/ExchangeCard";
import { SwipeableCard } from "@/components/ui/SwipeableCard";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/ui/LoadingSpinner";
import { TakeOverExchangeModal } from "@/components/features/TakeOverExchangeModal";
import { RemoveFromExchangeModal } from "@/components/features/RemoveFromExchangeModal";
import type { SwipeConfig } from "@/types/swipe";
import type { GameExchange } from "@/api/client";
import { useTranslation } from "@/hooks/useTranslation";

export function ExchangePage() {
  const [statusFilter, setStatusFilter] = useState<ExchangeStatus>("open");
  const { t } = useTranslation();

  const { data, isLoading, error, refetch } = useGameExchanges(statusFilter);

  const {
    takeOverModal,
    removeFromExchangeModal,
    handleTakeOver,
    handleRemoveFromExchange,
  } = useExchangeActions();

  const getSwipeConfig = useCallback(
    (exchange: GameExchange): SwipeConfig => {
      const actions = createExchangeActions(exchange, {
        onTakeOver: takeOverModal.open,
        onRemoveFromExchange: removeFromExchangeModal.open,
      });

      // Action array ordering: first item = furthest from card = full swipe default
      switch (exchange.status) {
        case "open":
          // Open exchanges: swipe left to take over
          // Swipe left reveals: [Take Over] <- card
          return { left: [actions.takeOver] };
        case "applied":
          // Applied exchanges: swipe right to remove
          // Swipe right reveals: card -> [Remove]
          return { right: [actions.removeFromExchange] };
        default:
          // No swipe actions for other statuses
          return {};
      }
    },
    [takeOverModal.open, removeFromExchangeModal.open],
  );

  const filterOptions: {
    value: ExchangeStatus;
    labelKey: "exchange.open" | "exchange.myApplications";
  }[] = [
    { value: "open", labelKey: "exchange.open" as const },
    { value: "applied", labelKey: "exchange.myApplications" as const },
  ];

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setStatusFilter(option.value)}
            className={`
              px-4 py-2 text-sm font-medium border-b-2 transition-colors
              ${
                statusFilter === option.value
                  ? "border-orange-500 text-orange-600 dark:text-orange-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }
            `}
          >
            {t(option.labelKey)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-3">
        {isLoading && <LoadingState message="Loading exchanges..." />}

        {error && (
          <ErrorState
            message={
              error instanceof Error
                ? error.message
                : "Failed to load exchanges"
            }
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !error && data && data.length === 0 && (
          <EmptyState
            icon="🔄"
            title={
              statusFilter === "open" ? "No open exchanges" : "No applications"
            }
            description={
              statusFilter === "open"
                ? "There are currently no referee positions available for exchange."
                : "You haven't applied for any exchanges yet."
            }
          />
        )}

        {!isLoading && !error && data && data.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((exchange) => (
              <SwipeableCard
                key={exchange.__identity}
                swipeConfig={getSwipeConfig(exchange)}
              >
                {({ isDrawerOpen }) => (
                  <ExchangeCard
                    exchange={exchange}
                    disableExpansion={isDrawerOpen}
                  />
                )}
              </SwipeableCard>
            ))}
          </div>
        )}
      </div>

      {/* Modals - exchange is guaranteed non-null by conditional render */}
      {takeOverModal.exchange && (
        <TakeOverExchangeModal
          exchange={takeOverModal.exchange}
          isOpen={takeOverModal.isOpen}
          onClose={takeOverModal.close}
          onConfirm={() => handleTakeOver(takeOverModal.exchange!)}
        />
      )}

      {removeFromExchangeModal.exchange && (
        <RemoveFromExchangeModal
          exchange={removeFromExchangeModal.exchange}
          isOpen={removeFromExchangeModal.isOpen}
          onClose={removeFromExchangeModal.close}
          onConfirm={() =>
            handleRemoveFromExchange(removeFromExchangeModal.exchange!)
          }
        />
      )}
    </div>
  );
}
