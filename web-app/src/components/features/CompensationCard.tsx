import { format, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui/Card";
import { ExpandArrow } from "@/components/ui/ExpandArrow";
import { Badge } from "@/components/ui/Badge";
import { Check, Circle } from "@/components/ui/icons";
import type { CompensationRecord } from "@/api/client";
import { useExpandable } from "@/hooks/useExpandable";
import { useTranslation } from "@/hooks/useTranslation";
import { useDateLocale } from "@/hooks/useDateFormat";
import { formatDistanceKm } from "@/utils/distance";

interface CompensationCardProps {
  compensation: CompensationRecord;
  onClick?: () => void;
  /** When true, expansion is disabled and the arrow is hidden */
  disableExpansion?: boolean;
}

export function CompensationCard({
  compensation,
  onClick,
  disableExpansion,
}: CompensationCardProps) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const { isExpanded, detailsId, handleToggle } = useExpandable({
    disabled: disableExpansion,
    onClick,
  });

  const game = compensation.refereeGame?.game;
  const comp = compensation.convocationCompensation;
  const startDate = game?.startingDateTime
    ? parseISO(game.startingDateTime)
    : null;

  const homeTeam = game?.encounter?.teamHome?.name || t("common.unknown");
  const awayTeam = game?.encounter?.teamAway?.name || t("common.unknown");

  const total = (comp?.gameCompensation || 0) + (comp?.travelExpenses || 0);
  const isPaid = comp?.paymentDone;

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
            {/* Date */}
            <div className="text-xs text-text-muted dark:text-text-muted-dark min-w-[4rem]">
              {startDate ? format(startDate, "MMM d", { locale: dateLocale }) : t("common.unknownDate")}
            </div>

            {/* Match info - truncated */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-text-primary dark:text-text-primary-dark truncate text-sm">
                {homeTeam} {t("common.vs")} {awayTeam}
              </div>
            </div>

            {/* Amount & status */}
            <div className="flex items-center gap-2">
              <div
                className={`text-sm font-bold ${isPaid ? "text-success-500 dark:text-success-400" : "text-warning-500 dark:text-warning-400"}`}
              >
                {total.toFixed(0)}
              </div>
              <Badge variant={isPaid ? "success" : "warning"}>
                {isPaid ? (
                  <Check className="w-3 h-3" aria-hidden="true" />
                ) : (
                  <Circle className="w-3 h-3" aria-hidden="true" />
                )}
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
            {comp && (
              <div className="px-2 pb-2 pt-0 border-t border-border-subtle dark:border-border-subtle-dark space-y-1 text-sm">
                <div className="flex justify-between pt-2">
                  <span className="text-text-muted dark:text-text-muted-dark">
                    {t("compensations.total")}:
                  </span>
                  <span
                    className={`font-bold ${isPaid ? "text-success-500 dark:text-success-400" : "text-warning-500 dark:text-warning-400"}`}
                  >
                    {t("common.currencyChf")} {total.toFixed(2)}
                  </span>
                </div>
                {comp.gameCompensation !== undefined &&
                  comp.gameCompensation > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-text-subtle dark:text-text-subtle-dark">
                        {t("compensations.gameFee")}:
                      </span>
                      <span className="text-text-secondary dark:text-text-muted-dark">
                        {t("common.currencyChf")} {comp.gameCompensation.toFixed(2)}
                      </span>
                    </div>
                  )}
                {comp.travelExpenses !== undefined &&
                  comp.travelExpenses > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-text-subtle dark:text-text-subtle-dark">
                        {t("compensations.travel")}:
                      </span>
                      <span className="text-text-secondary dark:text-text-muted-dark">
                        {t("common.currencyChf")} {comp.travelExpenses.toFixed(2)}
                      </span>
                    </div>
                  )}
                {comp.distanceInMetres !== undefined &&
                  comp.distanceInMetres > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-text-subtle dark:text-text-subtle-dark">
                        {t("compensations.distance")}:
                      </span>
                      <span className="text-text-secondary dark:text-text-muted-dark">
                        {formatDistanceKm(comp.distanceInMetres)} {t("common.distanceUnit")}
                      </span>
                    </div>
                  )}
                <div className="flex justify-between text-xs pt-1">
                  <span className="text-text-subtle dark:text-text-subtle-dark">
                    {t("compensations.status")}:
                  </span>
                  <span
                    className={
                      isPaid
                        ? "text-success-500 dark:text-success-400"
                        : "text-warning-500 dark:text-warning-400"
                    }
                  >
                    {isPaid
                      ? t("compensations.paid")
                      : t("compensations.pending")}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
