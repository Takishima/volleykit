import { Card, CardContent } from "@/components/ui/Card";
import { ExpandArrow } from "@/components/ui/ExpandArrow";
import type { Assignment } from "@/api/client";
import { useTranslation } from "@/hooks/useTranslation";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useExpandable } from "@/hooks/useExpandable";

interface AssignmentCardProps {
  assignment: Assignment;
  onClick?: () => void;
  /** When true, expansion is disabled and the arrow is hidden */
  disableExpansion?: boolean;
}

export function AssignmentCard({
  assignment,
  onClick,
  disableExpansion,
}: AssignmentCardProps) {
  const { t } = useTranslation();
  const { isExpanded, detailsId, handleToggle } = useExpandable({
    disabled: disableExpansion,
    onClick,
  });

  const game = assignment.refereeGame?.game;

  // Use formatted date with i18n support
  const {
    dateLabel,
    timeLabel,
    isToday: isTodayDate,
    isPast: isGamePast,
  } = useDateFormat(game?.startingDateTime);

  const homeTeam = game?.encounter?.teamHome?.name || "TBD";
  const awayTeam = game?.encounter?.teamAway?.name || "TBD";
  const hallName = game?.hall?.name || "Location TBD";
  const plusCode =
    game?.hall?.primaryPostalAddress?.geographicalLocation?.plusCode;
  const googleMapsUrl = plusCode
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(plusCode)}`
    : null;
  const city = game?.hall?.primaryPostalAddress?.city;
  const status = assignment.refereeConvocationStatus;

  // Position labels from i18n
  const positionKey = assignment.refereePosition as
    | keyof typeof positionLabelsMap
    | undefined;
  const positionLabelsMap = {
    "head-one": t("positions.head-one"),
    "head-two": t("positions.head-two"),
    "linesman-one": t("positions.linesman-one"),
    "linesman-two": t("positions.linesman-two"),
    "linesman-three": t("positions.linesman-three"),
    "linesman-four": t("positions.linesman-four"),
    "standby-head": t("positions.standby-head"),
    "standby-linesman": t("positions.standby-linesman"),
  } as const;
  const position =
    positionKey && positionKey in positionLabelsMap
      ? positionLabelsMap[positionKey]
      : assignment.refereePosition || "Referee";

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    archived: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  };

  // Status labels from i18n
  const statusLabels: Record<string, string> = {
    active: t("assignments.confirmed"),
    cancelled: t("assignments.cancelled"),
    archived: "Archived",
  };

  return (
    <Card className={isGamePast ? "opacity-75" : ""}>
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
            {/* Date/Time - fixed width for alignment */}
            <div className="flex flex-col items-end w-14 shrink-0">
              <span
                className={`text-xs font-medium ${isTodayDate ? "text-primary-600 dark:text-primary-400" : "text-gray-500 dark:text-gray-400"}`}
              >
                {dateLabel}
              </span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {timeLabel}
              </span>
            </div>

            {/* Teams and position */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 dark:text-white truncate">
                {homeTeam}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                vs {awayTeam}
              </div>
              {/* Position shown in compact view */}
              <div className="text-xs text-gray-400 dark:text-gray-500">
                {position}
              </div>
            </div>

            {/* City & expand indicator */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate w-24">
                {city || ""}
              </span>
              {!disableExpansion && (
                <ExpandArrow isExpanded={isExpanded} className="shrink-0" />
              )}
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

              {/* Status */}
              <div className="flex items-center gap-2 text-sm pt-1">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || statusColors.active}`}
                >
                  {statusLabels[status] || "Active"}
                </span>
              </div>

              {/* Category/League */}
              {game?.group?.phase?.league?.leagueCategory?.name && (
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  {game.group.phase.league.leagueCategory.name}
                  {game.group.phase.league.gender &&
                    ` • ${game.group.phase.league.gender === "m" ? t("common.men") : t("common.women")}`}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
