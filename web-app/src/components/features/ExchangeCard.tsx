import { memo } from "react";
import { format, parseISO } from "date-fns";
import { ExpandableCard } from "@/components/ui/ExpandableCard";
import { MapPin, MaleIcon, FemaleIcon, Home } from "@/components/ui/icons";
import type { GameExchange } from "@/api/client";
import { useDateLocale } from "@/hooks/useDateFormat";
import { useTranslation } from "@/hooks/useTranslation";

interface ExchangeCardProps {
  exchange: GameExchange;
  /** When true, expansion is disabled and the arrow is hidden */
  disableExpansion?: boolean;
  /** Optional data-tour attribute for guided tours */
  dataTour?: string;
  /** Distance from user's home location in kilometres (if available) */
  distanceKm?: number | null;
}

function ExchangeCardComponent({
  exchange,
  disableExpansion,
  dataTour,
  distanceKm,
}: ExchangeCardProps) {
  const { t, tInterpolate } = useTranslation();
  const dateLocale = useDateLocale();

  const game = exchange.refereeGame?.game;
  const startDate = game?.startingDateTime
    ? parseISO(game.startingDateTime)
    : null;

  const homeTeam = game?.encounter?.teamHome?.name || t("common.tbd");
  const awayTeam = game?.encounter?.teamAway?.name || t("common.tbd");
  const hallName = game?.hall?.name || t("common.locationTbd");
  const plusCode =
    game?.hall?.primaryPostalAddress?.geographicalLocation?.plusCode;
  const googleMapsUrl = plusCode
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(plusCode)}`
    : null;
  const requiredLevel = exchange.requiredRefereeLevel;

  const leagueCategory = game?.group?.phase?.league?.leagueCategory?.name;
  const gender = game?.group?.phase?.league?.gender;

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

          {/* Distance badge */}
          {distanceKm != null && (
            <div className="flex items-center shrink-0">
              <span className="text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Home className="w-3 h-3" aria-hidden="true" />
                {distanceKm.toFixed(0)} {t("common.distanceUnit")}
              </span>
            </div>
          )}

          {/* Expand indicator */}
          <div className="flex items-center">{expandArrow}</div>
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
          </div>

          {/* Required level */}
          {requiredLevel && (
            <div className="text-xs text-text-subtle dark:text-text-subtle-dark">
              {tInterpolate("exchange.levelRequired", { level: requiredLevel })}
            </div>
          )}

          {/* Submitter info */}
          {exchange.submittedByPerson && (
            <div className="text-xs text-text-muted dark:text-text-muted-dark">
              {t("exchange.submittedBy")} {exchange.submittedByPerson.firstName}{" "}
              {exchange.submittedByPerson.lastName}
            </div>
          )}
        </div>
      )}
    />
  );
}

export const ExchangeCard = memo(ExchangeCardComponent);
