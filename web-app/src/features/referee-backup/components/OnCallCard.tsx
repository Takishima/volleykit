import { memo } from "react";
import { Phone } from "lucide-react";
import { Card, CardContent } from "@/shared/components/Card";
import { useDateFormat } from "@/shared/hooks/useDateFormat";
import { useTranslation } from "@/shared/hooks/useTranslation";
import type { OnCallAssignment } from "../hooks/useMyOnCallAssignments";

interface OnCallCardProps {
  assignment: OnCallAssignment;
}

function OnCallCardComponent({ assignment }: OnCallCardProps) {
  const { t } = useTranslation();
  const { dateLabel, isToday } = useDateFormat(assignment.date);

  const ariaLabel = `${t("onCall.duty")} ${assignment.league} - ${dateLabel}`;

  return (
    <Card
      className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50"
      aria-label={ariaLabel}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
            <Phone
              className="w-5 h-5 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
          </div>

          {/* Date and label */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-medium ${
                  isToday
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-amber-900 dark:text-amber-100"
                }`}
              >
                {dateLabel}
              </span>
              {isToday && (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded">
                  {t("common.today")}
                </span>
              )}
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400">
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
      </CardContent>
    </Card>
  );
}

export const OnCallCard = memo(OnCallCardComponent);
