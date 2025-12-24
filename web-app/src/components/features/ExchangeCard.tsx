import { format, parseISO } from "date-fns";
import { ExpandableCard } from "@/components/ui/ExpandableCard";
import { Badge } from "@/components/ui/Badge";
import { MapPin } from "@/components/ui/icons";
import type { GameExchange } from "@/api/client";
import { useDateLocale } from "@/hooks/useDateFormat";
import { t, tInterpolate } from "@/i18n";

interface ExchangeCardProps {
  exchange: GameExchange;
  /** When true, expansion is disabled and the arrow is hidden */
  disableExpansion?: boolean;
}

export function ExchangeCard({
  exchange,
  disableExpansion,
}: ExchangeCardProps) {
  const dateLocale = useDateLocale();

  const game = exchange.refereeGame?.game;
  const startDate = game?.startingDateTime
    ? parseISO(game.startingDateTime)
    : null;

  const homeTeam = game?.encounter?.teamHome?.name || t("common.tbd");
  const awayTeam = game?.encounter?.teamAway?.name || t("common.tbd");
  const hallName = game?.hall?.name || t("common.locationTbd");

  const status = exchange.status;
  const requiredLevel = exchange.requiredRefereeLevel;

  const defaultStatus = {
    label: t("exchange.open"),
    variant: "warning" as const,
  };
  const statusConfig = {
    open: { label: t("exchange.open"), variant: "warning" as const },
    applied: { label: t("exchange.applied"), variant: "success" as const },
    closed: { label: t("exchange.closed"), variant: "neutral" as const },
  };

  const currentStatus =
    status && status in statusConfig
      ? statusConfig[status as keyof typeof statusConfig]
      : defaultStatus;

  return (
    <ExpandableCard
      data={exchange}
      disableExpansion={disableExpansion}
      renderCompact={(_, { expandArrow }) => (
        <>
          {/* Date/Time */}
          <div className="text-xs text-text-muted dark:text-text-muted-dark min-w-[4rem]">
            {startDate
              ? format(startDate, "MMM d", { locale: dateLocale })
              : t("common.tbd")}
            <div className="font-medium text-text-secondary dark:text-text-secondary-dark">
              {startDate
                ? format(startDate, "HH:mm", { locale: dateLocale })
                : ""}
            </div>
          </div>

          {/* Teams - truncated */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-text-primary dark:text-text-primary-dark truncate text-sm">
              {homeTeam} {t("common.vs")} {awayTeam}
            </div>
            {requiredLevel && (
              <div className="text-xs text-text-subtle dark:text-text-subtle-dark">
                {tInterpolate("exchange.levelRequired", { level: requiredLevel })}
              </div>
            )}
          </div>

          {/* Status & expand indicator */}
          <div className="flex items-center gap-2">
            <Badge variant={currentStatus.variant} className="rounded-full">
              {currentStatus.label}
            </Badge>
            {expandArrow}
          </div>
        </>
      )}
      renderDetails={() => (
        <div className="px-2 pb-2 pt-0 border-t border-border-subtle dark:border-border-subtle-dark space-y-1">
          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-text-muted dark:text-text-muted-dark pt-2">
            <MapPin className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{hallName}</span>
          </div>

          {/* Category */}
          {game?.group?.phase?.league?.leagueCategory?.name && (
            <div className="text-xs text-text-subtle dark:text-text-subtle-dark">
              {game.group.phase.league.leagueCategory.name}
              {game.group.phase.league.gender &&
                ` • ${game.group.phase.league.gender === "m" ? t("common.men") : t("common.women")}`}
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
