import { memo } from "react";
import type { CalendarAssignment } from "@/api/calendar-api";
import { Card } from "@/components/ui/Card";
import { Calendar, MapPin, Clock } from "@/components/ui/icons";
import { format, isToday, isTomorrow } from "date-fns";
import { useTranslation } from "@/hooks/useTranslation";
import { useDateLocale } from "@/hooks/useDateFormat";

/**
 * Maximum width for the address text to prevent layout overflow.
 * Sized to fit typical Swiss venue addresses while leaving room for time display.
 */
const ADDRESS_MAX_WIDTH_CLASS = "max-w-[150px]";

interface CalendarAssignmentCardProps {
  assignment: CalendarAssignment;
  dataTour?: string;
}

/**
 * A simplified assignment card for calendar mode.
 *
 * Displays basic assignment information from the iCal calendar feed.
 * This card is read-only and doesn't support swipe actions.
 *
 * @example
 * ```tsx
 * <CalendarAssignmentCard
 *   assignment={calendarAssignment}
 * />
 * ```
 */
export const CalendarAssignmentCard = memo(function CalendarAssignmentCard({
  assignment,
  dataTour,
}: CalendarAssignmentCardProps) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const startDate = new Date(assignment.startTime);

  const getDateLabel = (): string => {
    if (isToday(startDate)) return t("common.today");
    if (isTomorrow(startDate)) return t("common.tomorrow");
    return format(startDate, "EEEE, d MMMM", { locale: dateLocale });
  };

  const timeLabel = format(startDate, "HH:mm", { locale: dateLocale });

  return (
    <Card
      data-tour={dataTour}
      className="p-4"
    >
      <div className="space-y-3">
        {/* Header with date and role */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2 text-sm text-text-muted dark:text-text-muted-dark">
            <Calendar className="w-4 h-4" aria-hidden="true" />
            <span>{getDateLabel()}</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-xs font-medium">
            {assignment.roleRaw}
          </span>
        </div>

        {/* Teams */}
        <div className="text-center">
          <p className="font-medium text-text-primary dark:text-text-primary-dark">
            {assignment.homeTeam || t("common.unknown")}
          </p>
          <p className="text-xs text-text-muted dark:text-text-muted-dark my-1">
            {t("common.vs")}
          </p>
          <p className="font-medium text-text-primary dark:text-text-primary-dark">
            {assignment.awayTeam || t("common.unknown")}
          </p>
        </div>

        {/* League */}
        {assignment.league && (
          <p className="text-sm text-center text-text-secondary dark:text-text-secondary-dark">
            {assignment.league}
          </p>
        )}

        {/* Time and location */}
        <div className="flex justify-between items-center text-sm text-text-muted dark:text-text-muted-dark">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" aria-hidden="true" />
            <span>{timeLabel}</span>
          </div>
          {assignment.address && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" aria-hidden="true" />
              <span className={`truncate ${ADDRESS_MAX_WIDTH_CLASS}`}>{assignment.address}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
});
