import { memo } from "react";
import { format, parseISO } from "date-fns";
import { ExpandableCard } from "@/components/ui/ExpandableCard";
import { MapPin } from "@/components/ui/icons";
import type { GameExchange } from "@/api/client";
import { useDateLocale } from "@/hooks/useDateFormat";
import { useTranslation } from "@/hooks/useTranslation";

interface ExchangeCardProps {
  exchange: GameExchange;
  /** When true, expansion is disabled and the arrow is hidden */
  disableExpansion?: boolean;
  /** Optional data-tour attribute for guided tours */
  dataTour?: string;
}

function ExchangeCardComponent({
  exchange,
  disableExpansion,
  dataTour,
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
              <div className="font-medium text-text-primary dark:text-text-primary-dark truncate text-sm">
                {leagueCategory}
                {gender && (
                  <span className="text-text-muted dark:text-text-muted-dark font-normal">
                    {" "}
                    • {gender === "m" ? t("common.men") : t("common.women")}
                  </span>
                )}
              </div>
            )}
            <div className="text-xs text-text-muted dark:text-text-muted-dark truncate">
              {homeTeam} {t("common.vs")} {awayTeam}
            </div>
          </div>

          {/* Expand indicator */}
          <div className="flex items-center">{expandArrow}</div>
        </>
      )}
      renderDetails={() => (
        <div className="px-2 pb-2 pt-0 border-t border-border-subtle dark:border-border-subtle-dark space-y-1">
          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-text-muted dark:text-text-muted-dark pt-2">
            <MapPin className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{hallName}</span>
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
