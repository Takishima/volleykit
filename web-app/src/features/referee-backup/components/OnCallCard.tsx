import { memo } from "react";
import { Card, CardContent } from "@/shared/components/Card";
import { useDateFormat } from "@/shared/hooks/useDateFormat";
import { useTranslation } from "@/shared/hooks/useTranslation";
import type { OnCallAssignment } from "../hooks/useMyOnCallAssignments";

interface OnCallCardProps {
  assignment: OnCallAssignment;
}

function OnCallCardComponent({ assignment }: OnCallCardProps) {
  const { t } = useTranslation();
  const { dateLabel, timeLabel, isToday } = useDateFormat(assignment.date);

  const ariaLabel = `${t("onCall.duty")} ${assignment.league} - ${dateLabel}`;

  return (
    <Card
      className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50"
      aria-label={ariaLabel}
    >
      <CardContent className="p-0">
        <div className="px-2 py-2">
          <div className="flex items-center gap-3">
          {/* Date and time */}
          <div className="flex flex-col items-end w-14 shrink-0">
            <span
              className={`text-xs font-medium ${
                isToday
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {dateLabel}
            </span>
            <span className="text-lg font-bold text-amber-900 dark:text-amber-100">
              {timeLabel}
            </span>
          </div>

          {/* Label */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              {t("onCall.duty")}
            </p>
          </div>

          {/* League badge */}
          <div
            className={`flex-shrink-0 px-2 py-1 text-xs font-semibold rounded ${
              assignment.league === "NLA"
                ? "bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100"
                : "bg-amber-100 dark:bg-amber-900/70 text-amber-800 dark:text-amber-200"
            }`}
          >
            {assignment.league}
          </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const OnCallCard = memo(OnCallCardComponent);
