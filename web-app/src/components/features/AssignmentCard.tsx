import { memo } from "react";
import { ExpandableCard } from "@/components/ui/ExpandableCard";
import { Badge } from "@/components/ui/Badge";
import { MapPin, MaleIcon, FemaleIcon, TrainFront, Loader2, Navigation } from "@/components/ui/icons";
import type { Assignment } from "@/api/client";
import { useTranslation } from "@/hooks/useTranslation";
import { useDateFormat } from "@/hooks/useDateFormat";
import { getPositionLabel } from "@/utils/position-labels";
import { useSettingsStore } from "@/stores/settings";
import { useActiveAssociationCode } from "@/hooks/useActiveAssociation";
import { useSbbUrl } from "@/hooks/useSbbUrl";

/** Helper to extract referee display name from deep nested structure */
function getRefereeDisplayName(
  convocation:
    | {
        indoorAssociationReferee?: {
          indoorReferee?: {
            person?: { displayName?: string };
          };
        };
      }
    | null
    | undefined
): string | undefined {
  return convocation?.indoorAssociationReferee?.indoorReferee?.person
    ?.displayName;
}

interface AssignmentCardProps {
  assignment: Assignment;
  onClick?: () => void;
  /** When true, expansion is disabled and the arrow is hidden */
  disableExpansion?: boolean;
  /** Optional data-tour attribute for guided tours */
  dataTour?: string;
}

function AssignmentCardComponent({
  assignment,
  onClick,
  disableExpansion,
  dataTour,
}: AssignmentCardProps) {
  const { t, tInterpolate, locale } = useTranslation();
  const associationCode = useActiveAssociationCode();

  const game = assignment.refereeGame?.game;

  const {
    dateLabel,
    timeLabel,
    isToday: isTodayDate,
    isPast: isGamePast,
  } = useDateFormat(game?.startingDateTime);

  const homeTeam = game?.encounter?.teamHome?.name || t("common.tbd");
  const awayTeam = game?.encounter?.teamAway?.name || t("common.tbd");
  const hallName = game?.hall?.name || t("common.locationTbd");
  const postalAddress = game?.hall?.primaryPostalAddress;
  const plusCode = postalAddress?.geographicalLocation?.plusCode;
  const googleMapsUrl = plusCode
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(plusCode)}`
    : null;
  const city = postalAddress?.city;

  // Full address for display (street + postal code + city)
  const fullAddress = postalAddress?.combinedAddress
    || (postalAddress?.streetAndHouseNumber && postalAddress?.postalCodeAndCity
      ? `${postalAddress.streetAndHouseNumber}, ${postalAddress.postalCodeAndCity}`
      : null);

  // Platform-specific maps URL: iOS uses maps: scheme, Android uses geo: URI
  // Prefer address over coordinates for better accuracy
  const geoLat = postalAddress?.geographicalLocation?.latitude;
  const geoLon = postalAddress?.geographicalLocation?.longitude;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const hasCoords = geoLat !== undefined && geoLon !== undefined;
  const addressMapsUrl = fullAddress
    ? isIOS
      ? `maps:?q=${encodeURIComponent(fullAddress)}`
      : `geo:0,0?q=${encodeURIComponent(fullAddress)}`
    : hasCoords
      ? isIOS
        ? `maps:?q=${geoLat},${geoLon}&ll=${geoLat},${geoLon}`
        : `geo:${geoLat},${geoLon}?q=${geoLat},${geoLon}(${encodeURIComponent(hallName)})`
      : null;
  const status = assignment.refereeConvocationStatus;

  const position = getPositionLabel(
    assignment.refereePosition,
    t,
    t("occupations.referee"),
  );

  // Gender indicator
  const gender = game?.group?.phase?.league?.gender;

  // Referee names from the refereeGame
  const refereeGame = assignment.refereeGame;
  const headReferee1 = getRefereeDisplayName(
    refereeGame?.activeRefereeConvocationFirstHeadReferee
  );
  const headReferee2 = getRefereeDisplayName(
    refereeGame?.activeRefereeConvocationSecondHeadReferee
  );
  const linesman1 = getRefereeDisplayName(
    refereeGame?.activeRefereeConvocationFirstLinesman
  );
  const linesman2 = getRefereeDisplayName(
    refereeGame?.activeRefereeConvocationSecondLinesman
  );
  const linesman3 = getRefereeDisplayName(
    refereeGame?.activeRefereeConvocationThirdLinesman
  );
  const linesman4 = getRefereeDisplayName(
    refereeGame?.activeRefereeConvocationFourthLinesman
  );

  const linesmen = [linesman1, linesman2, linesman3, linesman4].filter(Boolean);

  // Get transport settings for the association
  const isTransportEnabled = useSettingsStore((state) =>
    state.isTransportEnabledForAssociation(associationCode),
  );

  // Extract hall coordinates and ID for travel time queries
  const geoLocation = game?.hall?.primaryPostalAddress?.geographicalLocation;
  const hallCoords = geoLocation?.latitude !== undefined && geoLocation?.longitude !== undefined
    ? { latitude: geoLocation.latitude, longitude: geoLocation.longitude }
    : null;
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

  const statusConfig: Record<
    string,
    { label: string; variant: "success" | "danger" | "neutral" }
  > = {
    active: { label: t("assignments.confirmed"), variant: "success" },
    cancelled: { label: t("assignments.cancelled"), variant: "danger" },
    archived: { label: t("assignments.archived"), variant: "neutral" },
  };

  return (
    <ExpandableCard
      data={assignment}
      onClick={onClick}
      disableExpansion={disableExpansion}
      dataTour={dataTour}
      className={isGamePast ? "opacity-75" : ""}
      renderCompact={(_, { expandArrow }) => (
        <>
          {/* Date/Time - fixed width for alignment */}
          <div className="flex flex-col items-end w-14 shrink-0">
            <span
              className={`text-xs font-medium ${isTodayDate ? "text-primary-600 dark:text-primary-400" : "text-text-muted dark:text-text-muted-dark"}`}
            >
              {dateLabel}
            </span>
            <span className="text-lg font-bold text-text-primary dark:text-text-primary-dark">
              {timeLabel}
            </span>
          </div>

          {/* Teams and position */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-text-primary dark:text-text-primary-dark truncate">
              {homeTeam}
            </div>
            <div className="text-sm text-text-secondary dark:text-text-muted-dark truncate">
              {t("common.vs")} {awayTeam}
            </div>
            {/* Position and gender shown in compact view */}
            <div className="text-xs text-text-subtle dark:text-text-subtle-dark flex items-center gap-1">
              <span>{position}</span>
              {gender === "m" && (
                <MaleIcon
                  className="w-3 h-3 text-blue-500 dark:text-blue-400"
                  aria-label={t("common.men")}
                />
              )}
              {gender === "f" && (
                <FemaleIcon
                  className="w-3 h-3 text-pink-500 dark:text-pink-400"
                  aria-label={t("common.women")}
                />
              )}
            </div>
          </div>

          {/* City, game number & expand indicator */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end w-24">
              <span className="text-xs text-text-muted dark:text-text-muted-dark truncate w-full text-right">
                {city || ""}
              </span>
              {game?.number && (
                <span className="text-xs text-text-subtle dark:text-text-subtle-dark">
                  #{game.number}
                </span>
              )}
            </div>
            {expandArrow}
          </div>
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

          {/* Status */}
          <div className="flex items-center gap-2 text-sm pt-1">
            <Badge
              variant={statusConfig[status]?.variant || "success"}
              className="rounded-full"
            >
              {statusConfig[status]?.label || t("assignments.active")}
            </Badge>
          </div>

          {/* Category/League */}
          {game?.group?.phase?.league?.leagueCategory?.name && (
            <div className="text-xs text-text-subtle dark:text-text-subtle-dark">
              {game.group.phase.league.leagueCategory.name}
              {game.group.phase.league.gender &&
                ` • ${game.group.phase.league.gender === "m" ? t("common.men") : t("common.women")}`}
            </div>
          )}

          {/* Referee names */}
          {(headReferee1 || headReferee2 || linesmen.length > 0) && (
            <div className="text-xs text-text-subtle dark:text-text-subtle-dark pt-1 space-y-0.5">
              {headReferee1 && (
                <div>
                  <span className="font-medium">
                    {t("positions.head-one")}:
                  </span>{" "}
                  {headReferee1}
                </div>
              )}
              {headReferee2 && (
                <div>
                  <span className="font-medium">
                    {t("positions.head-two")}:
                  </span>{" "}
                  {headReferee2}
                </div>
              )}
              {linesmen.length > 0 && (
                <div>
                  <span className="font-medium">
                    {t("occupations.linesmen")}:
                  </span>{" "}
                  {linesmen.join(", ")}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    />
  );
}

export const AssignmentCard = memo(AssignmentCardComponent);
