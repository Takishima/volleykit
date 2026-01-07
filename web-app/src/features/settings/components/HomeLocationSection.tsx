import { memo } from "react";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Card, CardContent, CardHeader } from "@/shared/components/Card";
import { Button } from "@/shared/components/Button";
import { MapPin, X, Clock } from "@/shared/components/icons";
import {
  useHomeLocationSettings,
  getGeolocationErrorMessage,
} from "../hooks/useHomeLocationSettings";

function HomeLocationSectionComponent() {
  const { t } = useTranslation();
  const homeLocation = useHomeLocationSettings({ t });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-text-muted dark:text-text-muted-dark" />
          <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
            {t("settings.homeLocation.title")}
          </h2>
        </div>
      </CardHeader>
      <CardContent className="space-y-4" data-tour="home-location">
        <p className="text-sm text-text-muted dark:text-text-muted-dark">
          {t("settings.homeLocation.description")}
        </p>

        {/* Current location display */}
        {homeLocation.homeLocation && (
          <div className="flex items-center justify-between p-3 bg-surface-subtle dark:bg-surface-subtle-dark rounded-lg">
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="w-5 h-5 flex-shrink-0 text-primary-600 dark:text-primary-400" />
              <span className="text-sm text-text-primary dark:text-text-primary-dark truncate">
                {homeLocation.homeLocation.label}
              </span>
            </div>
            <button
              type="button"
              onClick={homeLocation.handleClearLocation}
              className="ml-2 p-1 text-text-muted hover:text-text-primary dark:text-text-muted-dark dark:hover:text-text-primary-dark rounded transition-colors"
              aria-label={t("settings.homeLocation.clear")}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Use current location button */}
        {homeLocation.geoSupported && (
          <Button
            variant="secondary"
            onClick={homeLocation.requestLocation}
            loading={homeLocation.geoLoading}
            fullWidth
            iconLeft={!homeLocation.geoLoading && <Clock className="w-4 h-4" />}
          >
            {homeLocation.geoLoading
              ? t("settings.homeLocation.locating")
              : t("settings.homeLocation.useCurrentLocation")}
          </Button>
        )}

        {/* Geolocation error */}
        {homeLocation.geoError && (
          <p className="text-sm text-error-600 dark:text-error-400">
            {getGeolocationErrorMessage(homeLocation.geoError, t)}
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
              value={homeLocation.addressQuery}
              onChange={homeLocation.handleAddressChange}
              placeholder={t("settings.homeLocation.searchPlaceholder")}
              className="w-full px-4 py-2 text-sm border border-border-default dark:border-border-default-dark rounded-lg bg-surface-card dark:bg-surface-card-dark text-text-primary dark:text-text-primary-dark placeholder:text-text-muted dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {homeLocation.geocodeLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <span className="w-4 h-4 block border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Geocoding error */}
          {homeLocation.geocodeError && (
            <p className="text-sm text-error-600 dark:text-error-400">
              {t("settings.homeLocation.searchError")}
            </p>
          )}

          {/* Geocoding results */}
          {homeLocation.geocodeResults.length > 0 && (
            <ul className="border border-border-default dark:border-border-default-dark rounded-lg overflow-hidden divide-y divide-border-subtle dark:divide-border-subtle-dark">
              {homeLocation.geocodeResults.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    onClick={() => homeLocation.handleSelectGeocodedLocation(result)}
                    className="w-full px-4 py-3 text-left text-sm text-text-primary dark:text-text-primary-dark hover:bg-surface-subtle dark:hover:bg-surface-subtle-dark transition-colors"
                  >
                    {result.displayName}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* No results message */}
          {homeLocation.debouncedQuery.length >= homeLocation.minSearchLength &&
            !homeLocation.geocodeLoading &&
            homeLocation.geocodeResults.length === 0 &&
            !homeLocation.geocodeError && (
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
