import { memo } from "react";
import { format, parseISO } from "date-fns";
import { ExpandableCard } from "@/components/ui/ExpandableCard";
import { Badge } from "@/components/ui/Badge";
import { Check, Circle, Lock } from "@/components/ui/icons";
import type { CompensationRecord } from "@/api/client";
import { useTranslation } from "@/hooks/useTranslation";
import { useDateLocale } from "@/hooks/useDateFormat";
import { formatDistanceKm } from "@/utils/distance";
import { isCompensationEditable } from "@/utils/compensation-actions";

interface CompensationCardProps {
  compensation: CompensationRecord;
  onClick?: () => void;
  /** When true, expansion is disabled and the arrow is hidden */
  disableExpansion?: boolean;
  /** Optional data-tour attribute for guided tours */
  dataTour?: string;
}

function CompensationCardComponent({
  compensation,
  onClick,
  disableExpansion,
  dataTour,
}: CompensationCardProps) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();

  const game = compensation.refereeGame?.game;
  const comp = compensation.convocationCompensation;
  const startDate = game?.startingDateTime
    ? parseISO(game.startingDateTime)
    : null;

  const homeTeam = game?.encounter?.teamHome?.name || t("common.unknown");
  const awayTeam = game?.encounter?.teamAway?.name || t("common.unknown");

  const total = (comp?.gameCompensation || 0) + (comp?.travelExpenses || 0);
  const isPaid = comp?.paymentDone;
  const canEdit = isCompensationEditable(compensation);
  // Show restriction notice when not editable due to on-site payout (not just paid status)
  const showEditRestriction = !canEdit && !isPaid;

  return (
    <ExpandableCard
      data={compensation}
      onClick={onClick}
      disableExpansion={disableExpansion}
      dataTour={dataTour}
      renderCompact={(_, { expandArrow }) => (
        <>
          {/* Date */}
          <div className="text-xs text-text-muted dark:text-text-muted-dark min-w-[4rem]">
            {startDate
              ? format(startDate, "MMM d", { locale: dateLocale })
              : t("common.unknownDate")}
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
            {expandArrow}
          </div>
        </>
      )}
      renderDetails={() =>
        comp && (
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
            {comp.travelExpenses !== undefined && comp.travelExpenses > 0 && (
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
                    {formatDistanceKm(comp.distanceInMetres)}{" "}
                    {t("common.distanceUnit")}
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
            {showEditRestriction && (
              <div className="flex items-center gap-1.5 text-xs pt-2 text-text-muted dark:text-text-muted-dark">
                <Lock className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                <span>{t("compensations.editingRestrictedByRegion")}</span>
              </div>
            )}
          </div>
        )
      }
    />
  );
}

export const CompensationCard = memo(CompensationCardComponent);
