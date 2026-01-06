import { useState, useEffect, useCallback, memo, useRef, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useQueryClient } from "@tanstack/react-query";
import {
  useSettingsStore,
  getDefaultArrivalBuffer,
  MIN_ARRIVAL_BUFFER_MINUTES,
  MAX_ARRIVAL_BUFFER_MINUTES,
  type UserLocation,
} from "@/shared/stores/settings";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useGeolocation } from "@/shared/hooks/useGeolocation";
import { useCombinedGeocode } from "@/shared/hooks/useCombinedGeocode";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useActiveAssociationCode } from "@/features/auth/hooks/useActiveAssociation";
import { useTravelTimeAvailable } from "@/shared/hooks/useTravelTime";
import { CALENDAR_ASSOCIATION } from "@/shared/stores/auth";
import { Card, CardContent, CardHeader } from "@/shared/components/Card";
import { Button } from "@/shared/components/Button";
import { queryKeys } from "@/api/queryKeys";
import {
  clearTravelTimeCache,
  getTravelTimeCacheStats,
} from "@/shared/services/transport";

const GEOCODE_DEBOUNCE_MS = 500;
const MIN_SEARCH_LENGTH = 3;
const ARRIVAL_BUFFER_DEBOUNCE_MS = 300;

/** Badge showing the current association code */
function AssociationBadge({ code }: { code: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
      {code}
    </span>
  );
}

function LocationTravelSectionComponent() {
  const { t, tInterpolate } = useTranslation();
  const queryClient = useQueryClient();
  const isTransportAvailable = useTravelTimeAvailable();

  const {
    homeLocation,
    setHomeLocation,
    transportEnabled,
    transportEnabledByAssociation,
    setTransportEnabledForAssociation,
    arrivalBufferByAssociation,
    setArrivalBufferForAssociation,
  } = useSettingsStore(
    useShallow((state) => ({
      homeLocation: state.homeLocation,
      setHomeLocation: state.setHomeLocation,
      transportEnabled: state.transportEnabled,
      transportEnabledByAssociation: state.transportEnabledByAssociation,
      setTransportEnabledForAssociation: state.setTransportEnabledForAssociation,
      arrivalBufferByAssociation: state.travelTimeFilter.arrivalBufferByAssociation,
      setArrivalBufferForAssociation: state.setArrivalBufferForAssociation,
    })),
  );

  // Home location state
  const [addressQuery, setAddressQuery] = useState("");
  const debouncedQuery = useDebouncedValue(addressQuery, GEOCODE_DEBOUNCE_MS);

  const {
    results: geocodeResults,
    isLoading: geocodeLoading,
    error: geocodeError,
    search: geocodeSearch,
    clear: geocodeClear,
  } = useCombinedGeocode();

  // Transport state
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [cacheVersion, setCacheVersion] = useState(0);
  const associationCode = useActiveAssociationCode();

  // Keep refs in sync with latest values for use in geolocation callback
  const setAddressQueryRef = useRef(setAddressQuery);
  const geocodeClearRef = useRef(geocodeClear);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Refs should sync on every render
  useEffect(() => {
    setAddressQueryRef.current = setAddressQuery;
    geocodeClearRef.current = geocodeClear;
  });

  // Handle geolocation success via callback
  const handleGeolocationSuccess = useCallback(
    (position: { latitude: number; longitude: number }) => {
      const location: UserLocation = {
        latitude: position.latitude,
        longitude: position.longitude,
        label: t("settings.homeLocation.currentLocation"),
        source: "geolocation",
      };
      setHomeLocation(location);
      setAddressQueryRef.current("");
      geocodeClearRef.current();
    },
    [setHomeLocation, t],
  );

  const {
    isLoading: geoLoading,
    error: geoError,
    isSupported: geoSupported,
    requestLocation,
  } = useGeolocation({
    onSuccess: handleGeolocationSuccess,
  });

  // Get current transport enabled state for this association
  const isTransportEnabled = useMemo(() => {
    const enabledMap = transportEnabledByAssociation ?? {};
    if (associationCode && enabledMap[associationCode] !== undefined) {
      return enabledMap[associationCode];
    }
    return transportEnabled;
  }, [associationCode, transportEnabledByAssociation, transportEnabled]);

  // Get current arrival buffer for this association from store
  const storeArrivalBuffer = useMemo(() => {
    if (associationCode && arrivalBufferByAssociation?.[associationCode] !== undefined) {
      return arrivalBufferByAssociation[associationCode];
    }
    return getDefaultArrivalBuffer(associationCode);
  }, [associationCode, arrivalBufferByAssociation]);

  // Local state for immediate input feedback
  const [localArrivalBuffer, setLocalArrivalBuffer] = useState(storeArrivalBuffer);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when store value changes externally
  useEffect(() => {
    setLocalArrivalBuffer((prev) => (prev !== storeArrivalBuffer ? storeArrivalBuffer : prev));
  }, [storeArrivalBuffer]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Calculate cache entry count
  const cacheEntryCount = useMemo(
    () => (isTransportEnabled ? getTravelTimeCacheStats().entryCount : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isTransportEnabled, cacheVersion],
  );

  // Trigger geocoding when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length >= MIN_SEARCH_LENGTH) {
      geocodeSearch(debouncedQuery);
    } else {
      geocodeClear();
    }
  }, [debouncedQuery, geocodeSearch, geocodeClear]);

  const handleSelectGeocodedLocation = useCallback(
    (result: { latitude: number; longitude: number; displayName: string }) => {
      const location: UserLocation = {
        latitude: result.latitude,
        longitude: result.longitude,
        label: result.displayName,
        source: "geocoded",
      };
      setHomeLocation(location);
      setAddressQuery("");
      geocodeClear();
    },
    [setHomeLocation, geocodeClear],
  );

  const handleClearLocation = useCallback(() => {
    setHomeLocation(null);
    setAddressQuery("");
  }, [setHomeLocation]);

  const handleAddressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAddressQuery(e.target.value);
    },
    [],
  );

  const handleToggleTransport = useCallback(() => {
    if (!associationCode) return;
    setTransportEnabledForAssociation(associationCode, !isTransportEnabled);
  }, [associationCode, isTransportEnabled, setTransportEnabledForAssociation]);

  const handleClearCache = useCallback(() => {
    clearTravelTimeCache();
    queryClient.invalidateQueries({ queryKey: queryKeys.travelTime.all });
    setCacheVersion((v) => v + 1);
    setShowClearConfirm(false);
  }, [queryClient]);

  const handleArrivalBufferChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!associationCode) return;
      const value = parseInt(e.target.value, 10);
      if (!isNaN(value) && value >= MIN_ARRIVAL_BUFFER_MINUTES) {
        setLocalArrivalBuffer(value);
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
          setArrivalBufferForAssociation(associationCode, value);
        }, ARRIVAL_BUFFER_DEBOUNCE_MS);
      }
    },
    [associationCode, setArrivalBufferForAssociation],
  );

  const getGeolocationErrorMessage = (error: string): string => {
    switch (error) {
      case "permission_denied":
        return t("settings.homeLocation.errorPermissionDenied");
      case "position_unavailable":
        return t("settings.homeLocation.errorPositionUnavailable");
      case "timeout":
        return t("settings.homeLocation.errorTimeout");
      default:
        return t("settings.homeLocation.errorUnknown");
    }
  };

  const hasHomeLocation = Boolean(homeLocation);
  const hasAssociation = Boolean(associationCode);
  const canEnableTransport = hasHomeLocation && isTransportAvailable && hasAssociation;

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
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
            {t("settings.locationTravel.title")}
          </h2>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Home Location Section */}
        <div className="space-y-4" data-tour="home-location">
          <div className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
            {t("settings.homeLocation.title")}
          </div>
          <p className="text-sm text-text-muted dark:text-text-muted-dark">
            {t("settings.homeLocation.description")}
          </p>

          {/* Current location display */}
          {homeLocation && (
            <div className="flex items-center justify-between p-3 bg-surface-subtle dark:bg-surface-subtle-dark rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                <svg
                  className="w-5 h-5 flex-shrink-0 text-primary-600 dark:text-primary-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="text-sm text-text-primary dark:text-text-primary-dark truncate">
                  {homeLocation.label}
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearLocation}
                className="ml-2 p-1 text-text-muted hover:text-text-primary dark:text-text-muted-dark dark:hover:text-text-primary-dark rounded transition-colors"
                aria-label={t("settings.homeLocation.clear")}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}

          {/* Use current location button */}
          {geoSupported && (
            <Button
              variant="secondary"
              onClick={requestLocation}
              loading={geoLoading}
              fullWidth
              iconLeft={
                !geoLoading && (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )
              }
            >
              {geoLoading
                ? t("settings.homeLocation.locating")
                : t("settings.homeLocation.useCurrentLocation")}
            </Button>
          )}

          {/* Geolocation error */}
          {geoError && (
            <p className="text-sm text-error-600 dark:text-error-400">
              {getGeolocationErrorMessage(geoError)}
            </p>
          )}

          {/* Address search */}
          <div className="space-y-2">
            <label
              htmlFor="address-search"
              className="block text-sm font-medium text-text-primary dark:text-text-primary-dark"
            >
              {t("settings.homeLocation.searchLabel")}
            </label>
            <div className="relative">
              <input
                id="address-search"
                type="text"
                value={addressQuery}
                onChange={handleAddressChange}
                placeholder={t("settings.homeLocation.searchPlaceholder")}
                className="w-full px-4 py-2 text-sm border border-border-default dark:border-border-default-dark rounded-lg bg-surface-card dark:bg-surface-card-dark text-text-primary dark:text-text-primary-dark placeholder:text-text-muted dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {geocodeLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <span className="w-4 h-4 block border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Geocoding error */}
            {geocodeError && (
              <p className="text-sm text-error-600 dark:text-error-400">
                {t("settings.homeLocation.searchError")}
              </p>
            )}

            {/* Geocoding results */}
            {geocodeResults.length > 0 && (
              <ul className="border border-border-default dark:border-border-default-dark rounded-lg overflow-hidden divide-y divide-border-subtle dark:divide-border-subtle-dark">
                {geocodeResults.map((result) => (
                  <li key={result.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectGeocodedLocation(result)}
                      className="w-full px-4 py-3 text-left text-sm text-text-primary dark:text-text-primary-dark hover:bg-surface-subtle dark:hover:bg-surface-subtle-dark transition-colors"
                    >
                      {result.displayName}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* No results message */}
            {debouncedQuery.length >= MIN_SEARCH_LENGTH &&
              !geocodeLoading &&
              geocodeResults.length === 0 &&
              !geocodeError && (
                <p className="text-sm text-text-muted dark:text-text-muted-dark">
                  {t("settings.homeLocation.noResults")}
                </p>
              )}
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-border-subtle dark:border-border-subtle-dark" />

        {/* Transport Section */}
        <div className="space-y-4">
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
            <div className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
              {t("settings.transport.title")}
            </div>
          </div>
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

          {hasHomeLocation && !isTransportAvailable && (
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
          <div className="py-2">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                    {t("settings.transport.enableCalculations")}
                  </span>
                  {associationCode && associationCode !== CALENDAR_ASSOCIATION && (
                    <AssociationBadge code={associationCode} />
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleTransport}
                disabled={!canEnableTransport}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  !canEnableTransport
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
            {!canEnableTransport && (
              <p className="text-xs text-text-muted dark:text-text-muted-dark mt-1">
                {!hasHomeLocation
                  ? t("settings.transport.requiresHomeLocation")
                  : !isTransportAvailable
                    ? t("settings.transport.apiNotConfigured")
                    : t("settings.transport.disabledHint")}
              </p>
            )}
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
                    {associationCode && associationCode !== CALENDAR_ASSOCIATION && (
                      <AssociationBadge code={associationCode} />
                    )}
                  </div>
                  <div className="text-xs text-text-muted dark:text-text-muted-dark mt-0.5">
                    {t("settings.transport.arrivalTimeDescription")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={MIN_ARRIVAL_BUFFER_MINUTES}
                    max={MAX_ARRIVAL_BUFFER_MINUTES}
                    value={localArrivalBuffer}
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
        </div>
      </CardContent>
    </Card>
  );
}

export const LocationTravelSection = memo(LocationTravelSectionComponent);
