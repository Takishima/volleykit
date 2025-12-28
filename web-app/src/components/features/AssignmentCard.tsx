import { memo, useMemo } from "react";
import { ExpandableCard } from "@/components/ui/ExpandableCard";
import { Badge } from "@/components/ui/Badge";
import { MapPin, MaleIcon, FemaleIcon, TrainFront } from "@/components/ui/icons";
import type { Assignment } from "@/api/client";
import { useTranslation } from "@/hooks/useTranslation";
import { useDateFormat } from "@/hooks/useDateFormat";
import { getPositionLabel } from "@/utils/position-labels";
import { useSettingsStore } from "@/stores/settings";
import { useActiveAssociationCode } from "@/hooks/useActiveAssociation";
import { generateSbbUrl, calculateArrivalTime } from "@/utils/sbb-url";

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
  const { t, locale } = useTranslation();
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
  const plusCode =
    game?.hall?.primaryPostalAddress?.geographicalLocation?.plusCode;
  const googleMapsUrl = plusCode
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(plusCode)}`
    : null;
  const city = game?.hall?.primaryPostalAddress?.city;
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
  const sbbLinkTarget = useSettingsStore((state) =>
    state.getSbbLinkTargetForAssociation(associationCode),
  );
  const arrivalBuffer = useSettingsStore((state) =>
    state.getArrivalBufferForAssociation(associationCode),
  );

  // Extract startingDateTime for stable reference
  const gameStartingDateTime = game?.startingDateTime;

  // Generate SBB URL if transport is enabled and we have the required data
  const sbbUrl = useMemo(() => {
    if (!isTransportEnabled || !city || !gameStartingDateTime) {
      return null;
    }

    const gameDate = new Date(gameStartingDateTime);
    const arrivalTime = calculateArrivalTime(gameDate, arrivalBuffer);

    return generateSbbUrl(
      {
        destination: city,
        date: gameDate,
        arrivalTime,
        language: locale as "de" | "en" | "fr" | "it",
      },
      sbbLinkTarget,
    );
  }, [isTransportEnabled, city, gameStartingDateTime, arrivalBuffer, locale, sbbLinkTarget]);

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
          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-text-muted dark:text-text-muted-dark pt-2">
            <MapPin className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {googleMapsUrl ? (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-primary-600 dark:text-primary-400 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
                onClick={(e) => e.stopPropagation()}
              >
                {hallName}
              </a>
            ) : (
              <span className="truncate">{hallName}</span>
            )}
            {sbbUrl && (
              <a
                href={sbbUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 p-1 -m-1 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
                onClick={(e) => e.stopPropagation()}
                title={t("exchange.travelTime")}
                aria-label={t("exchange.travelTime")}
              >
                <TrainFront className="w-4 h-4" aria-hidden="true" />
              </a>
            )}
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
