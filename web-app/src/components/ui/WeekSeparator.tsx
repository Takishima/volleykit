import { format, isSameMonth, isSameYear } from "date-fns";
import { useDateLocale } from "@/hooks/useDateFormat";
import type { WeekInfo } from "@/utils/date-helpers";

interface WeekSeparatorProps {
  week: WeekInfo;
}

/**
 * A subtle separator displaying a week date range (Mon-Sun).
 * Formats the date range intelligently based on whether dates span months/years.
 */
export function WeekSeparator({ week }: WeekSeparatorProps) {
  const locale = useDateLocale();
  const { weekStart, weekEnd } = week;

  // Format dates based on whether they span months or years
  let dateRange: string;
  if (isSameMonth(weekStart, weekEnd)) {
    // Same month: "Dec 30 - 5"
    dateRange = `${format(weekStart, "MMM d", { locale })} – ${format(weekEnd, "d", { locale })}`;
  } else if (isSameYear(weekStart, weekEnd)) {
    // Same year, different months: "Dec 30 - Jan 5"
    dateRange = `${format(weekStart, "MMM d", { locale })} – ${format(weekEnd, "MMM d", { locale })}`;
  } else {
    // Different years: "Dec 30, 2024 - Jan 5, 2025"
    dateRange = `${format(weekStart, "MMM d, yyyy", { locale })} – ${format(weekEnd, "MMM d, yyyy", { locale })}`;
  }

  return (
    <div className="col-span-full flex items-center gap-3 py-1.5">
      <div className="h-px flex-1 bg-border-default dark:bg-border-default-dark" />
      <span className="text-xs text-text-muted dark:text-text-muted-dark whitespace-nowrap">
        {dateRange}
      </span>
      <div className="h-px flex-1 bg-border-default dark:bg-border-default-dark" />
    </div>
  );
}
