import { useState, useCallback, memo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useSettingsStore } from "@/stores/settings";
import { useTranslation } from "@/hooks/useTranslation";
import { useTravelTimeAvailable } from "@/hooks/useTravelTime";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { Settings, X, MapPin, TrainFront } from "@/components/ui/icons";
import { formatTravelTime, MINUTES_PER_HOUR } from "@/utils/format-travel-time";

/** Distance presets for the slider (in kilometers) */
const DISTANCE_PRESETS = [10, 25, 50, 75, 100];

/** Travel time presets for the slider (in minutes) */
const TRAVEL_TIME_PRESETS = [30, 45, 60, 90, 120];

interface ExchangeSettingsSheetProps {
  dataTour?: string;
}

function ExchangeSettingsSheetComponent({ dataTour }: ExchangeSettingsSheetProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const isTravelTimeAvailable = useTravelTimeAvailable();

  const {
    homeLocation,
    distanceFilter,
    setMaxDistanceKm,
    transportEnabled,
    travelTimeFilter,
    setMaxTravelTimeMinutes,
  } = useSettingsStore(
    useShallow((state) => ({
      homeLocation: state.homeLocation,
      distanceFilter: state.distanceFilter,
      setMaxDistanceKm: state.setMaxDistanceKm,
      transportEnabled: state.transportEnabled,
      travelTimeFilter: state.travelTimeFilter,
      setMaxTravelTimeMinutes: state.setMaxTravelTimeMinutes,
    })),
  );

  const handleDistanceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMaxDistanceKm(Number(e.target.value));
    },
    [setMaxDistanceKm],
  );

  const handleTravelTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMaxTravelTimeMinutes(Number(e.target.value));
    },
    [setMaxTravelTimeMinutes],
  );

  // Determine which settings are available
  const hasHomeLocation = Boolean(homeLocation);
  const canShowDistanceSlider = hasHomeLocation;
  const canShowTravelTimeSlider = hasHomeLocation && transportEnabled && isTravelTimeAvailable;

  // Don't show the gear icon if no settings are available
  if (!canShowDistanceSlider && !canShowTravelTimeSlider) {
    return null;
  }

  // Format distance for display
  const formatDistance = (km: number): string => {
    return `${km} ${t("common.distanceUnit")}`;
  };

  const timeUnits = {
    minutesUnit: t("common.minutesUnit"),
    hoursUnit: t("common.hoursUnit"),
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        data-tour={dataTour}
        aria-label={t("exchange.settings.title")}
        className="
          inline-flex items-center justify-center p-1.5 rounded-full
          text-text-muted dark:text-text-muted-dark
          hover:bg-surface-subtle dark:hover:bg-surface-subtle-dark
          hover:text-text-primary dark:hover:text-text-primary-dark
          transition-colors cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1
        "
      >
        <Settings className="w-5 h-5" />
      </button>

      <ResponsiveSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        titleId="exchange-settings-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-border-default dark:border-border-default-dark">
          <h2
            id="exchange-settings-title"
            className="text-lg font-semibold text-text-primary dark:text-text-primary-dark"
          >
            {t("exchange.settings.title")}
          </h2>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-2 -m-2 text-text-muted dark:text-text-muted-dark hover:text-text-primary dark:hover:text-text-primary-dark transition-colors"
            aria-label={t("common.close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Max Distance slider */}
          {canShowDistanceSlider && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-text-muted dark:text-text-muted-dark" />
                <label
                  htmlFor="max-distance"
                  className="text-sm font-medium text-text-primary dark:text-text-primary-dark"
                >
                  {t("exchange.settings.maxDistance")}
                </label>
                <span className="ml-auto text-sm font-semibold text-primary-600 dark:text-primary-400">
                  {formatDistance(distanceFilter.maxDistanceKm)}
                </span>
              </div>

              <input
                id="max-distance"
                type="range"
                min={DISTANCE_PRESETS[0]}
                max={DISTANCE_PRESETS[DISTANCE_PRESETS.length - 1]}
                step={5}
                value={distanceFilter.maxDistanceKm}
                onChange={handleDistanceChange}
                className="w-full h-2 bg-surface-muted dark:bg-surface-subtle-dark rounded-lg appearance-none cursor-pointer accent-primary-600"
              />

              {/* Preset labels */}
              <div className="flex justify-between text-xs text-text-muted dark:text-text-muted-dark">
                {DISTANCE_PRESETS.map((preset) => (
                  <span key={preset}>{preset} km</span>
                ))}
              </div>
            </div>
          )}

          {/* Max Travel Time slider */}
          {canShowTravelTimeSlider && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <TrainFront className="w-5 h-5 text-text-muted dark:text-text-muted-dark" />
                <label
                  htmlFor="max-travel-time"
                  className="text-sm font-medium text-text-primary dark:text-text-primary-dark"
                >
                  {t("exchange.settings.maxTravelTime")}
                </label>
                <span className="ml-auto text-sm font-semibold text-primary-600 dark:text-primary-400">
                  {formatTravelTime(travelTimeFilter.maxTravelTimeMinutes, timeUnits)}
                </span>
              </div>

              <input
                id="max-travel-time"
                type="range"
                min={TRAVEL_TIME_PRESETS[0]}
                max={TRAVEL_TIME_PRESETS[TRAVEL_TIME_PRESETS.length - 1]}
                step={15}
                value={travelTimeFilter.maxTravelTimeMinutes}
                onChange={handleTravelTimeChange}
                className="w-full h-2 bg-surface-muted dark:bg-surface-subtle-dark rounded-lg appearance-none cursor-pointer accent-primary-600"
              />

              {/* Preset labels */}
              <div className="flex justify-between text-xs text-text-muted dark:text-text-muted-dark">
                {TRAVEL_TIME_PRESETS.map((preset) => (
                  <span key={preset}>
                    {preset < MINUTES_PER_HOUR ? `${preset}m` : `${preset / MINUTES_PER_HOUR}h`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Info text */}
          <p className="text-xs text-text-muted dark:text-text-muted-dark">
            {t("exchange.settings.description")}
          </p>
        </div>
      </ResponsiveSheet>
    </>
  );
}

export const ExchangeSettingsSheet = memo(ExchangeSettingsSheetComponent);
