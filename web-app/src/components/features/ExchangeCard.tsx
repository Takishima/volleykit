import { format, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui/Card";
import { ExpandArrow } from "@/components/ui/ExpandArrow";
import type { GameExchange } from "@/api/client";
import { useExpandable } from "@/hooks/useExpandable";

interface ExchangeCardProps {
  exchange: GameExchange;
  /** When true, expansion is disabled and the arrow is hidden */
  disableExpansion?: boolean;
}

export function ExchangeCard({
  exchange,
  disableExpansion,
}: ExchangeCardProps) {
  const { isExpanded, detailsId, handleToggle } = useExpandable({
    disabled: disableExpansion,
  });

  const game = exchange.refereeGame?.game;
  const startDate = game?.startingDateTime
    ? parseISO(game.startingDateTime)
    : null;

  const homeTeam = game?.encounter?.teamHome?.name || "TBD";
  const awayTeam = game?.encounter?.teamAway?.name || "TBD";
  const hallName = game?.hall?.name || "Location TBD";

  const status = exchange.status;
  const requiredLevel = exchange.requiredRefereeLevel;

  const statusConfig = {
    open: {
      label: "Open",
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    },
    applied: {
      label: "Applied",
      color:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    },
    closed: {
      label: "Closed",
      color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    },
  } as const;

  const defaultStatus = statusConfig.open;
  const currentStatus =
    status && status in statusConfig
      ? statusConfig[status as keyof typeof statusConfig]
      : defaultStatus;
  const { label: statusLabel, color: statusColor } = currentStatus;

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
            <div className="text-xs text-gray-500 dark:text-gray-400 min-w-[4rem]">
              {startDate ? format(startDate, "MMM d") : "TBD"}
              <div className="font-medium text-gray-700 dark:text-gray-300">
                {startDate ? format(startDate, "HH:mm") : ""}
              </div>
            </div>

            {/* Teams - truncated */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 dark:text-white truncate text-sm">
                {homeTeam} vs {awayTeam}
              </div>
              {requiredLevel && (
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  Level {requiredLevel}+
                </div>
              )}
            </div>

            {/* Status & expand indicator */}
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}
              >
                {statusLabel}
              </span>
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
            <div className="px-2 pb-2 pt-0 border-t border-gray-100 dark:border-gray-700 space-y-1">
              {/* Location */}
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 pt-2">
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
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  {game.group.phase.league.leagueCategory.name}
                  {game.group.phase.league.gender &&
                    ` • ${game.group.phase.league.gender === "m" ? "Men" : "Women"}`}
                </div>
              )}

              {/* Submitter info */}
              {exchange.submittedByPerson && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  By: {exchange.submittedByPerson.firstName}{" "}
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
