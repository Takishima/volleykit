import { useCallback, memo, useState, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useQueryClient } from "@tanstack/react-query";
import { useSettingsStore } from "@/stores/settings";
import { useTranslation } from "@/hooks/useTranslation";
import { useTravelTimeAvailable } from "@/hooks/useTravelTime";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { queryKeys } from "@/api/queryKeys";
import {
  clearTravelTimeCache,
  getTravelTimeCacheStats,
} from "@/services/transport";

/** Travel time presets for the slider (in minutes) */
const TRAVEL_TIME_PRESETS = [30, 45, 60, 90, 120] as const;
const MIN_TRAVEL_TIME = TRAVEL_TIME_PRESETS[0];
const MAX_TRAVEL_TIME = TRAVEL_TIME_PRESETS[4];

function TransportSectionComponent() {
  const { t, tInterpolate } = useTranslation();
  const isAvailable = useTravelTimeAvailable();
  const queryClient = useQueryClient();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [cacheVersion, setCacheVersion] = useState(0);

  const {
    homeLocation,
    transportEnabled,
    setTransportEnabled,
    travelTimeFilter,
    setMaxTravelTimeMinutes,
  } = useSettingsStore(
    useShallow((state) => ({
      homeLocation: state.homeLocation,
      transportEnabled: state.transportEnabled,
      setTransportEnabled: state.setTransportEnabled,
      travelTimeFilter: state.travelTimeFilter,
      setMaxTravelTimeMinutes: state.setMaxTravelTimeMinutes,
    })),
  );

  // Calculate cache entry count - recalculates when cacheVersion changes
  const cacheEntryCount = useMemo(
    () => (transportEnabled ? getTravelTimeCacheStats().entryCount : 0),
    // cacheVersion triggers recalculation after clearing cache
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transportEnabled, cacheVersion],
  );

  const handleToggleTransport = useCallback(() => {
    setTransportEnabled(!transportEnabled);
  }, [transportEnabled, setTransportEnabled]);

  const handleTravelTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMaxTravelTimeMinutes(Number(e.target.value));
    },
    [setMaxTravelTimeMinutes],
  );

  const handleClearCache = useCallback(() => {
    // Clear localStorage cache
    clearTravelTimeCache();
    // Invalidate TanStack Query cache
    queryClient.invalidateQueries({ queryKey: queryKeys.travelTime.all });
    // Trigger recalculation of cache stats
    setCacheVersion((v) => v + 1);
    setShowClearConfirm(false);
  }, [queryClient]);

  const hasHomeLocation = Boolean(homeLocation);
  const canEnable = hasHomeLocation && isAvailable;

  // Format time for display
  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} ${t("common.minutesUnit")}`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} ${t("common.hoursUnit")}`;
    }
    return `${hours} ${t("common.hoursUnit")} ${remainingMinutes} ${t("common.minutesUnit")}`;
  };

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
            <div className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
              {t("settings.transport.enableCalculations")}
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleTransport}
            disabled={!canEnable}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
              !canEnable
                ? "bg-surface-muted dark:bg-surface-subtle-dark cursor-not-allowed opacity-50"
                : transportEnabled
                  ? "bg-primary-600"
                  : "bg-surface-muted dark:bg-surface-subtle-dark"
            }`}
            role="switch"
            aria-checked={transportEnabled}
            aria-label={t("settings.transport.enableCalculations")}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                transportEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Travel time slider */}
        {transportEnabled && (
          <div className="space-y-3 pt-2 border-t border-border-subtle dark:border-border-subtle-dark">
            <div className="flex items-center justify-between">
              <label
                htmlFor="max-travel-time"
                className="text-sm font-medium text-text-primary dark:text-text-primary-dark"
              >
                {t("settings.transport.maxTravelTime")}
              </label>
              <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                {formatTime(travelTimeFilter.maxTravelTimeMinutes)}
              </span>
            </div>

            <input
              id="max-travel-time"
              type="range"
              min={MIN_TRAVEL_TIME}
              max={MAX_TRAVEL_TIME}
              step={15}
              value={travelTimeFilter.maxTravelTimeMinutes}
              onChange={handleTravelTimeChange}
              className="w-full h-2 bg-surface-muted dark:bg-surface-subtle-dark rounded-lg appearance-none cursor-pointer accent-primary-600"
            />

            {/* Preset labels - positioned at their actual percentage in the range */}
            <div className="relative h-4 text-xs text-text-muted dark:text-text-muted-dark">
              {TRAVEL_TIME_PRESETS.map((preset, index) => {
                const percentage =
                  ((preset - MIN_TRAVEL_TIME) / (MAX_TRAVEL_TIME - MIN_TRAVEL_TIME)) * 100;
                const isFirst = index === 0;
                const isLast = index === TRAVEL_TIME_PRESETS.length - 1;
                return (
                  <span
                    key={preset}
                    className={`absolute ${isFirst ? "" : isLast ? "-translate-x-full" : "-translate-x-1/2"}`}
                    style={{ left: `${percentage}%` }}
                  >
                    {preset < 60 ? `${preset}m` : `${preset / 60}h`}
                  </span>
                );
              })}
            </div>

            {/* Cache management */}
            <div className="mt-4 pt-3 border-t border-border-subtle dark:border-border-subtle-dark">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const TransportSection = memo(TransportSectionComponent);
