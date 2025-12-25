import { useState, useCallback, useMemo, lazy, Suspense } from "react";
import { useShallow } from "zustand/react/shallow";
import { useGameExchanges, type ExchangeStatus } from "@/hooks/useConvocations";
import { useExchangeActions } from "@/hooks/useExchangeActions";
import { useDemoStore } from "@/stores/demo";
import { useAuthStore } from "@/stores/auth";
import { useSettingsStore } from "@/stores/settings";
import { createExchangeActions } from "@/utils/exchange-actions";
import { calculateDistanceKm } from "@/utils/distance";
import { ExchangeCard } from "@/components/features/ExchangeCard";
import { SwipeableCard } from "@/components/ui/SwipeableCard";
import { LevelFilterToggle } from "@/components/features/LevelFilterToggle";
import { DistanceFilterToggle } from "@/components/features/DistanceFilterToggle";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/ui/LoadingSpinner";
import { Tabs, TabPanel } from "@/components/ui/Tabs";
import type { SwipeConfig } from "@/types/swipe";
import type { GameExchange } from "@/api/client";
import { useTranslation } from "@/hooks/useTranslation";
import { useTour } from "@/hooks/useTour";

const TakeOverExchangeModal = lazy(
  () =>
    import("@/components/features/TakeOverExchangeModal").then((m) => ({
      default: m.TakeOverExchangeModal,
    })),
);

const RemoveFromExchangeModal = lazy(
  () =>
    import("@/components/features/RemoveFromExchangeModal").then((m) => ({
      default: m.RemoveFromExchangeModal,
    })),
);

export function ExchangePage() {
  const [statusFilter, setStatusFilter] = useState<ExchangeStatus>("open");
  const [filterByLevel, setFilterByLevel] = useState(false);
  const { t } = useTranslation();

  // Initialize tour for this page (triggers auto-start on first visit)
  useTour("exchange");

  const isDemoMode = useAuthStore((state) => state.isDemoMode);
  const { userRefereeLevel, userRefereeLevelGradationValue } = useDemoStore(
    useShallow((state) => ({
      userRefereeLevel: state.userRefereeLevel,
      userRefereeLevelGradationValue: state.userRefereeLevelGradationValue,
    })),
  );
  const { homeLocation, distanceFilter, setDistanceFilterEnabled } =
    useSettingsStore(
      useShallow((state) => ({
        homeLocation: state.homeLocation,
        distanceFilter: state.distanceFilter,
        setDistanceFilterEnabled: state.setDistanceFilterEnabled,
      })),
    );

  const { data, isLoading, error, refetch } = useGameExchanges(statusFilter);

  // Calculate distance for each exchange from user's home location
  const exchangesWithDistance = useMemo(() => {
    if (!data) return null;
    if (!homeLocation) return data.map((e) => ({ exchange: e, distanceKm: null }));

    return data.map((exchange) => {
      const geoLocation =
        exchange.refereeGame?.game?.hall?.primaryPostalAddress?.geographicalLocation;
      const lat = geoLocation?.latitude;
      const lon = geoLocation?.longitude;

      if (lat == null || lon == null) {
        return { exchange, distanceKm: null };
      }

      const distanceKm = calculateDistanceKm(
        { latitude: homeLocation.latitude, longitude: homeLocation.longitude },
        { latitude: lat, longitude: lon },
      );

      return { exchange, distanceKm };
    });
  }, [data, homeLocation]);

  // Filter exchanges by user's referee level and distance when filters are enabled
  const filteredData = useMemo(() => {
    if (!exchangesWithDistance) return null;

    let result = exchangesWithDistance;

    // Apply level filter (only on "open" tab in demo mode)
    if (
      filterByLevel &&
      statusFilter === "open" &&
      isDemoMode &&
      userRefereeLevelGradationValue !== null
    ) {
      result = result.filter(({ exchange }) => {
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
    }

    // Apply distance filter (only on "open" tab when home location is set)
    if (
      distanceFilter.enabled &&
      statusFilter === "open" &&
      homeLocation
    ) {
      result = result.filter(({ distanceKm }) => {
        // If no distance available, include the exchange (conservative)
        if (distanceKm === null) return true;
        return distanceKm <= distanceFilter.maxDistanceKm;
      });
    }

    return result;
  }, [
    exchangesWithDistance,
    filterByLevel,
    statusFilter,
    isDemoMode,
    userRefereeLevelGradationValue,
    distanceFilter.enabled,
    distanceFilter.maxDistanceKm,
    homeLocation,
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

  const tabs = [
    { id: "open" as const, label: t("exchange.open") },
    { id: "applied" as const, label: t("exchange.myApplications") },
  ];

  const handleTabChange = useCallback((tabId: string) => {
    setStatusFilter(tabId as ExchangeStatus);
  }, []);

  const handleTakeOverConfirm = useCallback(() => {
    if (takeOverModal.exchange) {
      handleTakeOver(takeOverModal.exchange);
    }
  }, [takeOverModal.exchange, handleTakeOver]);

  const handleRemoveConfirm = useCallback(() => {
    if (removeFromExchangeModal.exchange) {
      handleRemoveFromExchange(removeFromExchangeModal.exchange);
    }
  }, [removeFromExchangeModal.exchange, handleRemoveFromExchange]);

  // Determine if filters are available
  const isLevelFilterAvailable = isDemoMode && userRefereeLevel !== null;
  const isDistanceFilterAvailable = homeLocation !== null;

  // Filter toggles - only show on "Open" tab when available
  const filterContent =
    statusFilter === "open" &&
    (isLevelFilterAvailable || isDistanceFilterAvailable) ? (
      <div className="flex items-center gap-3">
        {isDistanceFilterAvailable && (
          <DistanceFilterToggle
            checked={distanceFilter.enabled}
            onChange={setDistanceFilterEnabled}
            maxDistanceKm={distanceFilter.maxDistanceKm}
            dataTour="exchange-distance-filter"
          />
        )}
        {isLevelFilterAvailable && (
          <LevelFilterToggle
            checked={filterByLevel}
            onChange={setFilterByLevel}
            userLevel={userRefereeLevel}
            dataTour="exchange-filter"
          />
        )}
      </div>
    ) : undefined;

  const renderContent = () => {
    if (isLoading) {
      return <LoadingState message={t("exchange.loading")} />;
    }

    if (error) {
      return (
        <ErrorState
          message={
            error instanceof Error ? error.message : t("exchange.errorLoading")
          }
          onRetry={() => refetch()}
        />
      );
    }

    if (!filteredData || filteredData.length === 0) {
      const hasActiveFilters = filterByLevel || distanceFilter.enabled;
      return (
        <EmptyState
          icon="exchange"
          title={
            statusFilter === "open"
              ? t("exchange.noOpenExchangesTitle")
              : t("exchange.noApplicationsTitle")
          }
          description={
            statusFilter === "open"
              ? hasActiveFilters
                ? t("exchange.noExchangesWithFilters")
                : t("exchange.noOpenExchangesDescription")
              : t("exchange.noApplicationsDescription")
          }
        />
      );
    }

    return (
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filteredData.map(({ exchange, distanceKm }, index) => (
          <SwipeableCard
            key={exchange.__identity}
            swipeConfig={getSwipeConfig(exchange)}
          >
            {({ isDrawerOpen }) => (
              <ExchangeCard
                exchange={exchange}
                disableExpansion={isDrawerOpen}
                dataTour={index === 0 ? "exchange-card" : undefined}
                distanceKm={homeLocation ? distanceKm : null}
              />
            )}
          </SwipeableCard>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Filter tabs with optional filters */}
      <Tabs
        tabs={tabs}
        activeTab={statusFilter}
        onTabChange={handleTabChange}
        ariaLabel={t("exchange.title")}
        endContent={filterContent}
      />

      {/* Content - single TabPanel since all tabs show same component with different data */}
      <TabPanel tabId={statusFilter} activeTab={statusFilter}>
        {renderContent()}
      </TabPanel>

      {/* Modals - exchange is guaranteed non-null by conditional render */}
      {takeOverModal.exchange && (
        <Suspense fallback={null}>
          <TakeOverExchangeModal
            exchange={takeOverModal.exchange}
            isOpen={takeOverModal.isOpen}
            onClose={takeOverModal.close}
            onConfirm={handleTakeOverConfirm}
          />
        </Suspense>
      )}

      {removeFromExchangeModal.exchange && (
        <Suspense fallback={null}>
          <RemoveFromExchangeModal
            exchange={removeFromExchangeModal.exchange}
            isOpen={removeFromExchangeModal.isOpen}
            onClose={removeFromExchangeModal.close}
            onConfirm={handleRemoveConfirm}
          />
        </Suspense>
      )}
    </div>
  );
}
