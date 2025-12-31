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

/**
 * Player data for roster formatting.
 */
export interface RosterPlayerData {
  id: string;
  firstName?: string;
  lastName?: string;
  birthday?: string | null;
}

/**
 * Formatted player entry with abbreviated first name.
 */
export interface FormattedRosterEntry {
  lastName: string;
  firstInitial: string;
  dob: string;
  displayString: string;
}

/**
 * Computes the minimum number of first name letters needed to distinguish
 * players with the same last name.
 *
 * @param players - Array of players with the same last name
 * @returns Map of player ID to required initial length
 */
function computeInitialLengths(
  players: RosterPlayerData[],
): Map<string, number> {
  const result = new Map<string, number>();

  // Start with 1 character for everyone
  for (const player of players) {
    result.set(player.id, 1);
  }

  // If only one player or no duplicates possible, we're done
  if (players.length <= 1) {
    return result;
  }

  // Group by first letter to find conflicts
  const byFirstLetter = new Map<string, RosterPlayerData[]>();
  for (const player of players) {
    const firstLetter = (player.firstName ?? "").charAt(0).toUpperCase();
    const existing = byFirstLetter.get(firstLetter) ?? [];
    existing.push(player);
    byFirstLetter.set(firstLetter, existing);
  }

  // For groups with conflicts, use 2 letters
  for (const group of byFirstLetter.values()) {
    if (group.length > 1) {
      for (const player of group) {
        result.set(player.id, 2);
      }
    }
  }

  return result;
}

/**
 * Formats player roster entries with abbreviated first names and DOB.
 * Uses 1 letter for first name by default, 2 letters if there are duplicate
 * last names with the same first initial.
 *
 * Format: "LastName X. dd.mm.yy" or "LastName Xy. dd.mm.yy" for duplicates
 *
 * @param players - Array of players to format
 * @returns Map of player ID to formatted entry data
 */
export function formatRosterEntries(
  players: RosterPlayerData[],
): Map<string, FormattedRosterEntry> {
  const result = new Map<string, FormattedRosterEntry>();

  // Group players by last name (case-insensitive)
  const byLastName = new Map<string, RosterPlayerData[]>();
  for (const player of players) {
    const lastName = (player.lastName ?? "").toLowerCase();
    const existing = byLastName.get(lastName) ?? [];
    existing.push(player);
    byLastName.set(lastName, existing);
  }

  // Compute required initial lengths for each group
  const initialLengths = new Map<string, number>();
  for (const group of byLastName.values()) {
    const groupLengths = computeInitialLengths(group);
    for (const [id, length] of groupLengths) {
      initialLengths.set(id, length);
    }
  }

  // Format each player
  for (const player of players) {
    const lastName = player.lastName ?? "";
    const firstName = player.firstName ?? "";
    const initialLength = initialLengths.get(player.id) ?? 1;
    const firstInitial =
      firstName.length > 0
        ? firstName.slice(0, initialLength).charAt(0).toUpperCase() +
          firstName.slice(1, initialLength).toLowerCase() +
          "."
        : "";
    const dob = formatDOB(player.birthday);

    const displayString = [lastName, firstInitial, dob]
      .filter(Boolean)
      .join(" ");

    result.set(player.id, {
      lastName,
      firstInitial,
      dob,
      displayString,
    });
  }

  return result;
}
