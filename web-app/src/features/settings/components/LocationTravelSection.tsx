import { memo } from "react";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { CALENDAR_ASSOCIATION } from "@/shared/stores/auth";
import { Card, CardContent, CardHeader } from "@/shared/components/Card";
import { Button } from "@/shared/components/Button";
import { ToggleSwitch } from "@/shared/components/ToggleSwitch";
import {
  useHomeLocationSettings,
  getGeolocationErrorMessage,
} from "../hooks/useHomeLocationSettings";
import { useTransportSettings } from "../hooks/useTransportSettings";

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

  const homeLocation = useHomeLocationSettings({ t });
  const transport = useTransportSettings();

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
          {homeLocation.homeLocation && (
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
                  {homeLocation.homeLocation.label}
                </span>
              </div>
              <button
                type="button"
                onClick={homeLocation.handleClearLocation}
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
          {homeLocation.geoSupported && (
            <Button
              variant="secondary"
              onClick={homeLocation.requestLocation}
              loading={homeLocation.geoLoading}
              fullWidth
              iconLeft={
                !homeLocation.geoLoading && (
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
          {!transport.hasHomeLocation && (
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

          {transport.hasHomeLocation && !transport.isTransportAvailable && (
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
                  {transport.associationCode && transport.associationCode !== CALENDAR_ASSOCIATION && (
                    <AssociationBadge code={transport.associationCode} />
                  )}
                </div>
              </div>

              <ToggleSwitch
                checked={transport.isTransportEnabled}
                onChange={transport.handleToggleTransport}
                disabled={!transport.canEnableTransport}
                label={t("settings.transport.enableCalculations")}
              />
            </div>
            {!transport.canEnableTransport && (
              <p className="text-xs text-text-muted dark:text-text-muted-dark mt-1">
                {!transport.hasHomeLocation
                  ? t("settings.transport.requiresHomeLocation")
                  : !transport.isTransportAvailable
                    ? t("settings.transport.apiNotConfigured")
                    : t("settings.transport.disabledHint")}
              </p>
            )}
          </div>

          {/* Arrival time setting - only show when transport is enabled */}
          {transport.isTransportEnabled && (
            <div className="pt-2 border-t border-border-subtle dark:border-border-subtle-dark" data-tour="arrival-time">
              <div className="flex items-center justify-between py-2">
                <div className="flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                      {t("settings.transport.arrivalTime")}
                    </span>
                    {transport.associationCode && transport.associationCode !== CALENDAR_ASSOCIATION && (
                      <AssociationBadge code={transport.associationCode} />
                    )}
                  </div>
                  <div className="text-xs text-text-muted dark:text-text-muted-dark mt-0.5">
                    {t("settings.transport.arrivalTimeDescription")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={transport.minArrivalBuffer}
                    max={transport.maxArrivalBuffer}
                    value={transport.localArrivalBuffer}
                    onChange={transport.handleArrivalBufferChange}
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
          {transport.isTransportEnabled && (
            <div className="pt-2 border-t border-border-subtle dark:border-border-subtle-dark">
              <p className="text-xs text-text-muted dark:text-text-muted-dark mb-2">
                {t("settings.transport.cacheInfo")}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary dark:text-text-secondary-dark">
                  {tInterpolate("settings.transport.cacheEntries", {
                    count: transport.cacheEntryCount,
                  })}
                </span>

                {!transport.showClearConfirm ? (
                  <button
                    type="button"
                    onClick={() => transport.setShowClearConfirm(true)}
                    disabled={transport.cacheEntryCount === 0}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t("settings.transport.refreshCache")}
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => transport.setShowClearConfirm(false)}
                      className="text-sm text-text-muted dark:text-text-muted-dark hover:text-text-secondary dark:hover:text-text-secondary-dark"
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      type="button"
                      onClick={transport.handleClearCache}
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
