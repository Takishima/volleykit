import { useAssignmentCardContext } from "./context";

/** Displays the date and time for an assignment in compact view */
export function DateTime() {
  const { dateLabel, timeLabel, isToday } = useAssignmentCardContext();

  return (
    <div className="flex flex-col items-end w-14 shrink-0">
      <span
        className={`text-xs font-medium ${isToday ? "text-primary-600 dark:text-primary-400" : "text-text-muted dark:text-text-muted-dark"}`}
      >
        {dateLabel}
      </span>
      <span className="text-lg font-bold text-text-primary dark:text-text-primary-dark">
        {timeLabel}
      </span>
    </div>
  );
}
