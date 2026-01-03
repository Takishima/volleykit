import { memo, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ExpandableCard } from "@/components/ui/ExpandableCard";
import { TravelTimeBadge } from "@/components/features/TravelTimeBadge";
import { MapPin, MaleIcon, FemaleIcon, Car, Navigation, TrainFront, Loader2, User } from "@/components/ui/icons";
import type { GameExchange } from "@/api/client";
import { useDateLocale } from "@/hooks/useDateFormat";
import { useTranslation } from "@/hooks/useTranslation";
import { buildMapsUrls } from "@/utils/maps-url";
import { extractCoordinates } from "@/utils/geo-location";
import { getPositionLabel } from "@/utils/position-labels";
import { useSettingsStore } from "@/stores/settings";
import { useActiveAssociationCode } from "@/hooks/useActiveAssociation";
import { useSbbUrl } from "@/hooks/useSbbUrl";

type RoleLabelKey = "positions.head-one" | "positions.head-two" | "positions.linesman-one" | "positions.linesman-two";

interface RoleEntry {
  labelKey: RoleLabelKey;
  name: string;
  isSubmitter: boolean;
}

type RefereeGameFields = "activeFirstHeadRefereeName" | "activeSecondHeadRefereeName" | "activeFirstLinesmanRefereeName" | "activeSecondLinesmanRefereeName";

const ROLE_CONFIG: Array<{ field: RefereeGameFields; labelKey: RoleLabelKey }> = [
  { field: "activeFirstHeadRefereeName", labelKey: "positions.head-one" },
  { field: "activeSecondHeadRefereeName", labelKey: "positions.head-two" },
  { field: "activeFirstLinesmanRefereeName", labelKey: "positions.linesman-one" },
  { field: "activeSecondLinesmanRefereeName", labelKey: "positions.linesman-two" },
];

interface ExchangeCardProps {
  exchange: GameExchange;
  /** When true, expansion is disabled and the arrow is hidden */
  disableExpansion?: boolean;
  /** Optional data-tour attribute for guided tours */
  dataTour?: string;
  /** Estimated car distance from user's home location in kilometres (if available) */
  carDistanceKm?: number | null;
  /** Travel time in minutes (if available) */
  travelTimeMinutes?: number | null;
  /** Whether travel time is currently loading */
  travelTimeLoading?: boolean;
}

function ExchangeCardComponent({
  exchange,
  disableExpansion,
  dataTour,
  carDistanceKm,
  travelTimeMinutes,
  travelTimeLoading,
}: ExchangeCardProps) {
  const { t, tInterpolate, locale } = useTranslation();
  const dateLocale = useDateLocale();
  const associationCode = useActiveAssociationCode();

  const game = exchange.refereeGame?.game;
  const startDate = game?.startingDateTime
    ? parseISO(game.startingDateTime)
    : null;

  // Build list of role entries with submitter identification
  const roleEntries = useMemo((): RoleEntry[] => {
    const refereeGame = exchange.refereeGame;
    const submitter = exchange.submittedByPerson;
    const submitterFullName = submitter ? `${submitter.firstName} ${submitter.lastName}` : null;

    return ROLE_CONFIG
      .filter(({ field }) => refereeGame?.[field])
      .map(({ field, labelKey }) => ({
        labelKey,
        name: refereeGame![field]!,
        isSubmitter: refereeGame![field] === submitterFullName,
      }));
  }, [exchange.refereeGame, exchange.submittedByPerson]);

  const homeTeam = game?.encounter?.teamHome?.name || t("common.tbd");
  const awayTeam = game?.encounter?.teamAway?.name || t("common.tbd");
  const hallName = game?.hall?.name || t("common.locationTbd");
  const postalAddress = game?.hall?.primaryPostalAddress;
  const city = postalAddress?.city;

  // Build maps URLs using shared utility
  const { googleMapsUrl, nativeMapsUrl: addressMapsUrl, fullAddress } = buildMapsUrls(postalAddress, hallName);

  const requiredLevel = exchange.requiredRefereeLevel;

  // Get the translated position label for the exchange
  const positionLabel = getPositionLabel(exchange.refereePosition, t);

  const leagueCategory = game?.group?.phase?.league?.leagueCategory?.name;
  const gender = game?.group?.phase?.league?.gender;

  // Get transport settings for the association
  const isTransportEnabled = useSettingsStore((state) =>
    state.isTransportEnabledForAssociation(associationCode),
  );

  // Extract hall coordinates and ID for travel time queries
  const geoLocation = game?.hall?.primaryPostalAddress?.geographicalLocation;
  const hallCoords = extractCoordinates(geoLocation);
  const hallId = game?.hall?.__identity;
  const gameStartingDateTime = game?.startingDateTime;

  // Hook to fetch trip data on demand and generate SBB URL with station ID
  const { isLoading: isSbbLoading, openSbbConnection } = useSbbUrl({
    hallCoords,
    hallId,
    city,
    gameStartTime: gameStartingDateTime,
    language: locale,
  });

  // Show SBB button if transport is enabled and we have the required data
  const showSbbButton = isTransportEnabled && city && gameStartingDateTime;

  return (
    <ExpandableCard
      data={exchange}
      disableExpansion={disableExpansion}
      dataTour={dataTour}
      renderCompact={(_, { expandArrow }) => (
        <>
          {/* Day/Date/Time */}
          <div className="text-xs text-text-muted dark:text-text-muted-dark min-w-[4.5rem] shrink-0">
            {startDate ? (
              <>
                <div>
                  {format(startDate, "EEE, MMM d", { locale: dateLocale })}
                </div>
                <div className="font-medium text-text-secondary dark:text-text-secondary-dark">
                  {format(startDate, "HH:mm", { locale: dateLocale })}
                </div>
              </>
            ) : (
              t("common.tbd")
            )}
          </div>

          {/* League/Gender + Teams */}
          <div className="flex-1 min-w-0">
            {leagueCategory && (
              <div className="font-medium text-text-primary dark:text-text-primary-dark truncate text-sm flex items-center gap-1">
                <span className="truncate">{leagueCategory}</span>
                {gender === "m" && (
                  <MaleIcon
                    className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0"
                    aria-label={t("common.men")}
                  />
                )}
                {gender === "f" && (
                  <FemaleIcon
                    className="w-3.5 h-3.5 text-pink-500 dark:text-pink-400 shrink-0"
                    aria-label={t("common.women")}
                  />
                )}
              </div>
            )}
            <div className="text-xs text-text-muted dark:text-text-muted-dark truncate">
              {homeTeam} {t("common.vs")} {awayTeam}
            </div>
          </div>

          {/* Distance and travel time badges */}
          {(carDistanceKm != null || travelTimeMinutes !== undefined || travelTimeLoading) && (
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              {/* Car distance badge */}
              {carDistanceKm != null && (
                <span className="text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Car className="w-3 h-3" aria-hidden="true" />
                  ~{carDistanceKm.toFixed(0)} {t("common.distanceUnit")}
                </span>
              )}
              {/* Travel time badge */}
              {(travelTimeMinutes !== undefined || travelTimeLoading) && (
                <TravelTimeBadge
                  durationMinutes={travelTimeMinutes ?? undefined}
                  isLoading={travelTimeLoading}
                />
              )}
            </div>
          )}

          {/* Expand indicator */}
          <div className="flex items-center">{expandArrow}</div>
        </>
      )}
      renderDetails={() => (
        <div className="px-2 pb-2 pt-0 border-t border-border-subtle dark:border-border-subtle-dark space-y-1">
          {/* Location - Hall name */}
          <div className="flex items-start gap-2 text-sm text-text-muted dark:text-text-muted-dark pt-2">
            <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-text-primary dark:text-text-primary-dark">
                {hallName}
              </div>
              {/* Full address - clickable to open in native maps app */}
              {fullAddress && (
                addressMapsUrl ? (
                  <a
                    href={addressMapsUrl}
                    className="text-primary-600 dark:text-primary-400 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded block"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={tInterpolate("assignments.openAddressInMaps", { address: fullAddress })}
                  >
                    {fullAddress}
                  </a>
                ) : (
                  <span>{fullAddress}</span>
                )
              )}
            </div>
            {/* Navigation buttons */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {googleMapsUrl && (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-800/40 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  title={t("assignments.openInGoogleMaps")}
                  aria-label={t("assignments.openInGoogleMaps")}
                >
                  <Navigation className="w-5 h-5" aria-hidden="true" />
                </a>
              )}
              {showSbbButton && (
                <button
                  type="button"
                  className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-800/40 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg transition-colors disabled:opacity-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    void openSbbConnection();
                  }}
                  disabled={isSbbLoading}
                  title={t("assignments.openSbbConnection")}
                  aria-label={t("assignments.openSbbConnection")}
                >
                  {isSbbLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  ) : (
                    <TrainFront className="w-5 h-5" aria-hidden="true" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Position being exchanged */}
          {positionLabel && (
            <div className="flex items-center gap-2 text-sm text-text-muted dark:text-text-muted-dark">
              <User className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <div>
                <span className="text-text-subtle dark:text-text-subtle-dark">{t("common.position")}: </span>
                <span className="font-medium text-text-primary dark:text-text-primary-dark">{positionLabel}</span>
              </div>
            </div>
          )}

          {/* Required level */}
          {requiredLevel && (
            <div className="text-xs text-text-subtle dark:text-text-subtle-dark">
              {tInterpolate("exchange.levelRequired", { level: requiredLevel })}
            </div>
          )}

          {/* Role assignments */}
          {roleEntries.length > 0 && (
            <div className="text-xs text-text-muted dark:text-text-muted-dark space-y-0.5 pt-1">
              {roleEntries.map((entry) => (
                <div key={entry.labelKey} className="flex gap-1">
                  <span className="text-text-subtle dark:text-text-subtle-dark">
                    {t(entry.labelKey)}:
                  </span>
                  <span className={entry.isSubmitter ? "italic text-primary-600 dark:text-primary-400" : ""}>
                    {entry.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    />
  );
}

export const ExchangeCard = memo(ExchangeCardComponent);
