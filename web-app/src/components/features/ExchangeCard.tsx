import { format, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui/Card";
import { ExpandArrow } from "@/components/ui/ExpandArrow";
import { Badge } from "@/components/ui/Badge";
import type { GameExchange } from "@/api/client";
import { useExpandable } from "@/hooks/useExpandable";
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
  const { isExpanded, detailsId, handleToggle } = useExpandable({
    disabled: disableExpansion,
  });

  const game = exchange.refereeGame?.game;
  const startDate = game?.startingDateTime
    ? parseISO(game.startingDateTime)
    : null;

  const homeTeam = game?.encounter?.teamHome?.name || t("common.tbd");
  const awayTeam = game?.encounter?.teamAway?.name || t("common.tbd");
  const hallName = game?.hall?.name || t("common.locationTbd");

  const status = exchange.status;
  const requiredLevel = exchange.requiredRefereeLevel;

  const defaultStatus = { label: t("exchange.open"), variant: "warning" as const };
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
    <Card>
      <CardContent className="p-0">
        {/* Clickable header region */}
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={isExpanded}
          aria-controls={detailsId}
          className="w-full text-left px-2 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset rounded-xl"
        >
          {/* Compact view - always visible */}
          <div className="flex items-center gap-3">
            {/* Date/Time */}
            <div className="text-xs text-text-muted dark:text-text-muted-dark min-w-[4rem]">
              {startDate ? format(startDate, "MMM d", { locale: dateLocale }) : t("common.tbd")}
              <div className="font-medium text-text-secondary dark:text-text-secondary-dark">
                {startDate ? format(startDate, "HH:mm", { locale: dateLocale }) : ""}
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
              {!disableExpansion && <ExpandArrow isExpanded={isExpanded} />}
            </div>
          </div>
        </button>

        {/* Expanded details - using CSS Grid for smooth animation */}
        <div
          id={detailsId}
          className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${
            isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="px-2 pb-2 pt-0 border-t border-border-subtle dark:border-border-subtle-dark space-y-1">
              {/* Location */}
              <div className="flex items-center gap-2 text-sm text-text-muted dark:text-text-muted-dark pt-2">
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
