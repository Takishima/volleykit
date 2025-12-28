import { useCallback, memo, useState, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useQueryClient } from "@tanstack/react-query";
import { useSettingsStore, getDefaultArrivalBuffer } from "@/stores/settings";
import { useAuthStore } from "@/stores/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { useTravelTimeAvailable } from "@/hooks/useTravelTime";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { queryKeys } from "@/api/queryKeys";
import {
  clearTravelTimeCache,
  getTravelTimeCacheStats,
} from "@/services/transport";

function TransportSectionComponent() {
  const { t, tInterpolate } = useTranslation();
  const isAvailable = useTravelTimeAvailable();
  const queryClient = useQueryClient();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [cacheVersion, setCacheVersion] = useState(0);

  const {
    homeLocation,
    transportEnabled,
    transportEnabledByAssociation,
    setTransportEnabledForAssociation,
    arrivalBufferByAssociation,
    setArrivalBufferForAssociation,
  } = useSettingsStore(
    useShallow((state) => ({
      homeLocation: state.homeLocation,
      transportEnabled: state.transportEnabled,
      transportEnabledByAssociation: state.transportEnabledByAssociation,
      setTransportEnabledForAssociation: state.setTransportEnabledForAssociation,
      arrivalBufferByAssociation: state.travelTimeFilter.arrivalBufferByAssociation,
      setArrivalBufferForAssociation: state.setArrivalBufferForAssociation,
    })),
  );

  // Get active occupation's association code
  const { user, activeOccupationId } = useAuthStore(
    useShallow((state) => ({
      user: state.user,
      activeOccupationId: state.activeOccupationId,
    })),
  );
  const activeOccupation = user?.occupations?.find((o) => o.id === activeOccupationId) ?? user?.occupations?.[0];
  const associationCode = activeOccupation?.associationCode;

  // Get current transport enabled state for this association
  // Handle migration: if per-association setting exists, use it; otherwise fall back to global
  const isTransportEnabled = useMemo(() => {
    const enabledMap = transportEnabledByAssociation ?? {};
    if (associationCode && enabledMap[associationCode] !== undefined) {
      return enabledMap[associationCode];
    }
    // Fall back to global setting for migration
    return transportEnabled;
  }, [associationCode, transportEnabledByAssociation, transportEnabled]);

  // Get current arrival buffer for this association
  // Handle case where arrivalBufferByAssociation might be undefined (old storage migration)
  const currentArrivalBuffer = associationCode && arrivalBufferByAssociation?.[associationCode] !== undefined
    ? arrivalBufferByAssociation[associationCode]
    : getDefaultArrivalBuffer(associationCode);

  // Calculate cache entry count - recalculates when cacheVersion changes
  const cacheEntryCount = useMemo(
    () => (isTransportEnabled ? getTravelTimeCacheStats().entryCount : 0),
    // cacheVersion triggers recalculation after clearing cache
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isTransportEnabled, cacheVersion],
  );

  const handleToggleTransport = useCallback(() => {
    if (!associationCode) return;
    setTransportEnabledForAssociation(associationCode, !isTransportEnabled);
  }, [associationCode, isTransportEnabled, setTransportEnabledForAssociation]);

  const handleClearCache = useCallback(() => {
    // Clear localStorage cache
    clearTravelTimeCache();
    // Invalidate TanStack Query cache
    queryClient.invalidateQueries({ queryKey: queryKeys.travelTime.all });
    // Trigger recalculation of cache stats
    setCacheVersion((v) => v + 1);
    setShowClearConfirm(false);
  }, [queryClient]);

  const handleArrivalBufferChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!associationCode) return;
      const value = parseInt(e.target.value, 10);
      if (!isNaN(value) && value >= 0) {
        setArrivalBufferForAssociation(associationCode, value);
      }
    },
    [associationCode, setArrivalBufferForAssociation],
  );

  const hasHomeLocation = Boolean(homeLocation);
  const hasAssociation = Boolean(associationCode);
  const canEnable = hasHomeLocation && isAvailable && hasAssociation;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-text-muted dark:text-text-muted-dark"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
          <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
            {t("settings.transport.title")}
          </h2>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-text-muted dark:text-text-muted-dark">
          {t("settings.transport.description")}
        </p>

        {/* Status messages */}
        {!hasHomeLocation && (
          <div className="flex items-center gap-2 p-3 bg-surface-subtle dark:bg-surface-subtle-dark rounded-lg">
            <svg
              className="w-5 h-5 flex-shrink-0 text-text-muted dark:text-text-muted-dark"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-text-muted dark:text-text-muted-dark">
              {t("settings.transport.requiresHomeLocation")}
            </span>
          </div>
        )}

        {hasHomeLocation && !isAvailable && (
          <div className="flex items-center gap-2 p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
            <svg
              className="w-5 h-5 flex-shrink-0 text-warning-600 dark:text-warning-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="text-sm text-warning-700 dark:text-warning-300">
              {t("settings.transport.apiNotConfigured")}
            </span>
          </div>
        )}

        {/* Enable toggle */}
        <div className="flex items-center justify-between py-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                {t("settings.transport.enableCalculations")}
              </span>
              {associationCode && (
                <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
                  {associationCode}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleTransport}
            disabled={!canEnable}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
              !canEnable
                ? "bg-surface-muted dark:bg-surface-subtle-dark cursor-not-allowed opacity-50"
                : isTransportEnabled
                  ? "bg-primary-600"
                  : "bg-surface-muted dark:bg-surface-subtle-dark"
            }`}
            role="switch"
            aria-checked={isTransportEnabled}
            aria-label={t("settings.transport.enableCalculations")}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isTransportEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Arrival time setting - only show when transport is enabled */}
        {isTransportEnabled && (
          <div className="pt-2 border-t border-border-subtle dark:border-border-subtle-dark" data-tour="arrival-time">
            <div className="flex items-center justify-between py-2">
              <div className="flex-1 pr-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                    {t("settings.transport.arrivalTime")}
                  </span>
                  {associationCode && (
                    <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
                      {associationCode}
                    </span>
                  )}
                </div>
                <div className="text-xs text-text-muted dark:text-text-muted-dark mt-0.5">
                  {t("settings.transport.arrivalTimeDescription")}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={currentArrivalBuffer}
                  onChange={handleArrivalBufferChange}
                  className="w-16 px-2 py-1 text-sm text-right border border-border-default dark:border-border-default-dark rounded-md bg-surface-card dark:bg-surface-card-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label={t("settings.transport.arrivalTime")}
                />
                <span className="text-sm text-text-muted dark:text-text-muted-dark">
                  {t("common.minutesUnit")}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Cache management - only show when transport is enabled */}
        {isTransportEnabled && (
          <div className="pt-2 border-t border-border-subtle dark:border-border-subtle-dark">
            <p className="text-xs text-text-muted dark:text-text-muted-dark mb-2">
              {t("settings.transport.cacheInfo")}
            </p>

            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary dark:text-text-secondary-dark">
                {tInterpolate("settings.transport.cacheEntries", {
                  count: cacheEntryCount,
                })}
              </span>

              {!showClearConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  disabled={cacheEntryCount === 0}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("settings.transport.refreshCache")}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="text-sm text-text-muted dark:text-text-muted-dark hover:text-text-secondary dark:hover:text-text-secondary-dark"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleClearCache}
                    className="text-sm text-error-600 dark:text-error-400 hover:text-error-700 dark:hover:text-error-300"
                  >
                    {t("common.confirm")}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const TransportSection = memo(TransportSectionComponent);
