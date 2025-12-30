/**
 * Date formatting utilities for VolleyKit.
 */

import { parseISO, startOfWeek, endOfWeek, isValid, getISOWeek, getYear } from "date-fns";

const DATE_TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: "short",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
} as const;

/**
 * Formats an ISO datetime string to a localized human-readable format.
 * Returns 'TBD' if the input is undefined or invalid.
 *
 * @param isoString - ISO 8601 datetime string
 * @returns Formatted date string or 'TBD'
 */
export function formatDateTime(isoString?: string): string {
  if (!isoString) return "TBD";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "TBD";
    return date.toLocaleString(undefined, DATE_TIME_FORMAT_OPTIONS);
  } catch {
    return "TBD";
  }
}

/**
 * Formats a birthday string as DD.MM.YY (Swiss format).
 * Returns empty string if the input is undefined, null, or invalid.
 *
 * @param birthday - ISO date string or date-like string
 * @returns Formatted date as DD.MM.YY or empty string
 */
export function formatDOB(birthday: string | null | undefined): string {
  if (!birthday) return "";
  const date = new Date(birthday);
  if (isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}.${month}.${year}`;
}

/**
 * Represents a week with its start and end dates.
 */
export interface WeekInfo {
  /** Unique key for the week (e.g., "2025-W05") */
  key: string;
  /** Start of week (Monday) */
  weekStart: Date;
  /** End of week (Sunday) */
  weekEnd: Date;
  /** ISO week number */
  weekNumber: number;
  /** Year the week belongs to */
  year: number;
}

/**
 * Represents items grouped by week.
 */
export interface WeekGroup<T> {
  week: WeekInfo;
  items: T[];
}

/**
 * Groups items by ISO week (Monday-Sunday).
 * Items are expected to already be sorted by date.
 *
 * @param items - Array of items to group
 * @param getDateString - Function to extract the ISO date string from an item
 * @returns Array of week groups with their items
 */
export function groupByWeek<T>(
  items: T[],
  getDateString: (item: T) => string | undefined | null,
): WeekGroup<T>[] {
  const groups: WeekGroup<T>[] = [];
  let currentGroup: WeekGroup<T> | null = null;

  for (const item of items) {
    const dateString = getDateString(item);
    if (!dateString) continue;

    const date = parseISO(dateString);
    if (!isValid(date)) continue;

    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
    const weekNumber = getISOWeek(date);
    const year = getYear(weekStart);
    const weekKey = `${year}-W${String(weekNumber).padStart(2, "0")}`;

    if (!currentGroup || currentGroup.week.key !== weekKey) {
      currentGroup = {
        week: {
          key: weekKey,
          weekStart,
          weekEnd,
          weekNumber,
          year,
        },
        items: [],
      };
      groups.push(currentGroup);
    }

    currentGroup.items.push(item);
  }

  return groups;
}
