import { useState, useEffect, useCallback, memo, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { useSettingsStore, type UserLocation } from "@/stores/settings";
import { useTranslation } from "@/hooks/useTranslation";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useCombinedGeocode } from "@/hooks/useCombinedGeocode";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const GEOCODE_DEBOUNCE_MS = 500;
const MIN_SEARCH_LENGTH = 3;

function HomeLocationSectionComponent() {
  const { t } = useTranslation();
  const { homeLocation, setHomeLocation } = useSettingsStore(
    useShallow((state) => ({
      homeLocation: state.homeLocation,
      setHomeLocation: state.setHomeLocation,
    })),
  );

  const [addressQuery, setAddressQuery] = useState("");
  const debouncedQuery = useDebouncedValue(addressQuery, GEOCODE_DEBOUNCE_MS);

  const {
    results: geocodeResults,
    isLoading: geocodeLoading,
    error: geocodeError,
    search: geocodeSearch,
    clear: geocodeClear,
  } = useCombinedGeocode();

  // Keep refs in sync with latest values for use in geolocation callback.
  // These refs allow the callback to access the latest function references
  // without needing to recreate the callback when these functions change.
  // No dependency array: we intentionally want this to run on every render.
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

  // Trigger geocoding when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length >= MIN_SEARCH_LENGTH) {
      geocodeSearch(debouncedQuery);
    } else {
      geocodeClear();
    }
  }, [debouncedQuery, geocodeSearch, geocodeClear]);

  const handleSelectGeocodedLocation = useCallback(
    (result: {
      latitude: number;
      longitude: number;
      displayName: string;
      swissData?: { lv95X: number; lv95Y: number; featureId: number };
    }) => {
      const location: UserLocation = {
        latitude: result.latitude,
        longitude: result.longitude,
        label: result.displayName,
        source: "geocoded",
        swissData: result.swissData,
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

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
          {t("settings.homeLocation.title")}
        </h2>
      </CardHeader>
      <CardContent className="space-y-4" data-tour="home-location">
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
      </CardContent>
    </Card>
  );
}

export const HomeLocationSection = memo(HomeLocationSectionComponent);
