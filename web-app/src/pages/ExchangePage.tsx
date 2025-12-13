import { useState, useCallback, useMemo, useRef } from "react";
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
import { TabPanel } from "@/components/ui/Tabs";
import { TakeOverExchangeModal } from "@/components/features/TakeOverExchangeModal";
import { RemoveFromExchangeModal } from "@/components/features/RemoveFromExchangeModal";
import type { SwipeConfig } from "@/types/swipe";
import type { GameExchange } from "@/api/client";
import { useTranslation } from "@/hooks/useTranslation";

export function ExchangePage() {
  const [statusFilter, setStatusFilter] = useState<ExchangeStatus>("open");
  const [filterByLevel, setFilterByLevel] = useState(false);
  const { t } = useTranslation();
  const tabRefs = useRef<Map<ExchangeStatus, HTMLButtonElement>>(new Map());

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

  const filterOptions = useMemo(
    () => [
      { value: "open" as const, labelKey: "exchange.open" as const },
      {
        value: "applied" as const,
        labelKey: "exchange.myApplications" as const,
      },
    ],
    [],
  );

  // Determine if filter is available (demo mode with level set)
  const isLevelFilterAvailable = isDemoMode && userRefereeLevel !== null;

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      let nextIndex: number | null = null;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextIndex = (currentIndex + 1) % filterOptions.length;
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        nextIndex =
          (currentIndex - 1 + filterOptions.length) % filterOptions.length;
      }

      if (nextIndex !== null) {
        const nextOption = filterOptions[nextIndex];
        if (nextOption) {
          setStatusFilter(nextOption.value);
          tabRefs.current.get(nextOption.value)?.focus();
        }
      }
    },
    [filterOptions],
  );

  const setTabRef = useCallback(
    (value: ExchangeStatus) => (el: HTMLButtonElement | null) => {
      if (el) {
        tabRefs.current.set(value, el);
      } else {
        tabRefs.current.delete(value);
      }
    },
    [],
  );

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
      {/* Filter tabs and level toggle - WAI-ARIA tab pattern with keyboard navigation */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
        <div
          role="tablist"
          aria-label={t("exchange.title")}
          className="flex gap-2"
        >
          {filterOptions.map((option, index) => {
            const isActive = statusFilter === option.value;
            return (
              <button
                key={option.value}
                ref={setTabRef(option.value)}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${option.value}`}
                id={`tab-${option.value}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setStatusFilter(option.value)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
                className={`
                  px-4 py-2 text-sm font-medium border-b-2 transition-colors
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2
                  dark:focus-visible:ring-offset-gray-800
                  ${
                    isActive
                      ? "border-orange-500 text-orange-600 dark:text-orange-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }
                `}
              >
                {t(option.labelKey)}
              </button>
            );
          })}
        </div>

        {/* Level filter toggle - only show on "Open" tab when available */}
        {statusFilter === "open" && isLevelFilterAvailable && (
          <LevelFilterToggle
            checked={filterByLevel}
            onChange={setFilterByLevel}
            userLevel={userRefereeLevel}
          />
        )}
      </div>

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
