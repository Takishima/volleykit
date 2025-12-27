import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { SlidersHorizontal, X, MapPin, TrainFront } from "@/components/ui/icons";
import { FilterChip } from "@/components/ui/FilterChip";
import { formatTravelTime } from "@/utils/format-travel-time";

interface FilterConfig {
  travelTime?: {
    enabled: boolean;
    maxTravelTimeMinutes: number;
    onToggle: () => void;
  };
  distance?: {
    enabled: boolean;
    maxDistanceKm: number;
    onToggle: () => void;
  };
  level?: {
    enabled: boolean;
    userLevel: string;
    onToggle: () => void;
  };
}

interface ExchangeFiltersProps {
  filters: FilterConfig;
  dataTour?: string;
}

export function ExchangeFilters({ filters, dataTour }: ExchangeFiltersProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // Count active filters
  const activeCount = [
    filters.travelTime?.enabled,
    filters.distance?.enabled,
    filters.level?.enabled,
  ].filter(Boolean).length;

  // Check if any filters are available
  const hasFilters =
    filters.travelTime || filters.distance || filters.level;

  if (!hasFilters) {
    return null;
  }

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
        aria-label={t("exchange.filters")}
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm font-medium
          transition-colors cursor-pointer select-none
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1
          ${
            activeCount > 0
              ? "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          }
        `}
      >
        <SlidersHorizontal className="w-4 h-4" />
        {activeCount > 0 && (
          <span className="min-w-[1.25rem] h-5 flex items-center justify-center rounded-full bg-primary-500 text-white text-xs font-bold">
            {activeCount}
          </span>
        )}
      </button>

      <ResponsiveSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        titleId="exchange-filters-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-border-default dark:border-border-default-dark">
          <h2
            id="exchange-filters-title"
            className="text-lg font-semibold text-text-primary dark:text-text-primary-dark"
          >
            {t("exchange.filters")}
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

        <div className="p-4 space-y-3">
          {filters.travelTime && (
            <FilterChip
              active={filters.travelTime.enabled}
              onToggle={filters.travelTime.onToggle}
              icon={<TrainFront className="w-full h-full" />}
              label={t("exchange.filterByTravelTime")}
              activeValue={formatTravelTime(
                filters.travelTime.maxTravelTimeMinutes,
                timeUnits,
                "≤",
              )}
              showIconWhenActive
            />
          )}

          {filters.distance && (
            <FilterChip
              active={filters.distance.enabled}
              onToggle={filters.distance.onToggle}
              icon={<MapPin className="w-full h-full" />}
              label={t("exchange.filterByDistance")}
              activeValue={`≤${filters.distance.maxDistanceKm} ${t("common.distanceUnit")}`}
              showIconWhenActive
            />
          )}

          {filters.level && (
            <FilterChip
              active={filters.level.enabled}
              onToggle={filters.level.onToggle}
              label={t("exchange.filterByLevel")}
              activeValue={`${filters.level.userLevel}+`}
            />
          )}
        </div>
      </ResponsiveSheet>
    </>
  );
}
