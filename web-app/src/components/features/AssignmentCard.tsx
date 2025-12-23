import { Card, CardContent } from "@/components/ui/Card";
import { ExpandArrow } from "@/components/ui/ExpandArrow";
import { Badge } from "@/components/ui/Badge";
import { MapPin } from "@/components/ui/icons";
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
      : assignment.refereePosition || t("occupations.referee");

  const statusConfig: Record<
    string,
    { label: string; variant: "success" | "danger" | "neutral" }
  > = {
    active: { label: t("assignments.confirmed"), variant: "success" },
    cancelled: { label: t("assignments.cancelled"), variant: "danger" },
    archived: { label: t("assignments.archived"), variant: "neutral" },
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
              {/* Position shown in compact view */}
              <div className="text-xs text-text-subtle dark:text-text-subtle-dark">
                {position}
              </div>
            </div>

            {/* City & expand indicator */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted dark:text-text-muted-dark truncate w-24">
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
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
