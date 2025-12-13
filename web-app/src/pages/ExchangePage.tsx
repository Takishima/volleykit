import { useState, useCallback, useMemo } from "react";
import { useGameExchanges, type ExchangeStatus } from "@/hooks/useConvocations";
import { useExchangeActions } from "@/hooks/useExchangeActions";
import { useDemoStore } from "@/stores/demo";
import { useAuthStore } from "@/stores/auth";
import { createExchangeActions } from "@/utils/exchange-actions";
import { ExchangeCard } from "@/components/features/ExchangeCard";
import { SwipeableCard } from "@/components/ui/SwipeableCard";
import { LevelFilterToggle } from "@/components/features/LevelFilterToggle";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/ui/LoadingSpinner";
import { Tabs, TabPanel } from "@/components/ui/Tabs";
import { TakeOverExchangeModal } from "@/components/features/TakeOverExchangeModal";
import { RemoveFromExchangeModal } from "@/components/features/RemoveFromExchangeModal";
import type { SwipeConfig } from "@/types/swipe";
import type { GameExchange } from "@/api/client";
import { useTranslation } from "@/hooks/useTranslation";

export function ExchangePage() {
  const [statusFilter, setStatusFilter] = useState<ExchangeStatus>("open");
  const [filterByLevel, setFilterByLevel] = useState(false);
  const { t } = useTranslation();

  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const { userRefereeLevel, userRefereeLevelGradationValue } = useDemoStore();

  const { data, isLoading, error, refetch } = useGameExchanges(statusFilter);

  // Filter exchanges by user's referee level when filter is enabled
  // Gradation values: N1=1 (highest), N2=2, N3=3 (lowest)
  // Lower gradation = more qualified (can officiate more games)
  const filteredData = useMemo(() => {
    if (!data || !filterByLevel || statusFilter !== "open") {
      return data;
    }

    // Only filter in demo mode for now (production would need user level from API)
    if (!isDemoMode || userRefereeLevelGradationValue === null) {
      return data;
    }

    return data.filter((exchange) => {
      const requiredGradationStr = exchange.requiredRefereeLevelGradationValue;
      // If no gradation value, show the exchange (conservative approach)
      if (requiredGradationStr === undefined || requiredGradationStr === null) {
        return true;
      }
      // Parse string to number for comparison (API returns string)
      const requiredGradation = Number(requiredGradationStr);
      if (isNaN(requiredGradation)) {
        return true;
      }
      // User can officiate if their level meets or exceeds required level
      // Lower gradation = higher level, so user.gradation <= required.gradation
      return userRefereeLevelGradationValue <= requiredGradation;
    });
  }, [
    data,
    filterByLevel,
    statusFilter,
    isDemoMode,
    userRefereeLevelGradationValue,
  ]);

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

  const tabs = useMemo(
    () => [
      { id: "open" as const, label: t("exchange.open") },
      { id: "applied" as const, label: t("exchange.myApplications") },
    ],
    [t],
  );

  const handleTabChange = useCallback((tabId: string) => {
    setStatusFilter(tabId as ExchangeStatus);
  }, []);

  // Determine if filter is available (demo mode with level set)
  const isLevelFilterAvailable = isDemoMode && userRefereeLevel !== null;

  // Level filter toggle - only show on "Open" tab when available
  const levelFilterContent =
    statusFilter === "open" && isLevelFilterAvailable ? (
      <LevelFilterToggle
        checked={filterByLevel}
        onChange={setFilterByLevel}
        userLevel={userRefereeLevel}
      />
    ) : undefined;

  const renderContent = () => {
    if (isLoading) {
      return <LoadingState message="Loading exchanges..." />;
    }

    if (error) {
      return (
        <ErrorState
          message={
            error instanceof Error ? error.message : "Failed to load exchanges"
          }
          onRetry={() => refetch()}
        />
      );
    }

    if (!filteredData || filteredData.length === 0) {
      return (
        <EmptyState
          icon="🔄"
          title={
            statusFilter === "open"
              ? t("exchange.noOpenExchangesTitle")
              : t("exchange.noApplicationsTitle")
          }
          description={
            statusFilter === "open"
              ? filterByLevel
                ? t("exchange.noExchangesAtLevel")
                : t("exchange.noOpenExchangesDescription")
              : t("exchange.noApplicationsDescription")
          }
        />
      );
    }

    return (
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filteredData.map((exchange) => (
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
    );
  };

  return (
    <div className="space-y-3">
      {/* Filter tabs with optional level toggle */}
      <Tabs
        tabs={tabs}
        activeTab={statusFilter}
        onTabChange={handleTabChange}
        ariaLabel={t("exchange.title")}
        endContent={levelFilterContent}
      />

      {/* Content - using TabPanel for proper ARIA association */}
      <TabPanel tabId="open" activeTab={statusFilter}>
        {renderContent()}
      </TabPanel>
      <TabPanel tabId="applied" activeTab={statusFilter}>
        {renderContent()}
      </TabPanel>

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
