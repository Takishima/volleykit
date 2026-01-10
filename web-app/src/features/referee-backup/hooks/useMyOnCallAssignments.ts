import { useMemo } from "react";
import { addDays, getISOWeek } from "date-fns";
import { useRefereeBackups } from "./useRefereeBackups";
import { useAuthStore } from "@/shared/stores/auth";
import { generateDemoUuid } from "@/shared/utils/demo-uuid";
import { DEMO_USER_PERSON_IDENTITY } from "@/shared/stores/demo";
import type { RefereeBackupEntry, BackupRefereeAssignment } from "@/api/client";

/** Default number of weeks ahead to fetch on-call assignments */
const DEFAULT_WEEKS_AHEAD = 2;

/**
 * Represents an on-call (Pikett) assignment for the current user.
 */
export interface OnCallAssignment {
  id: string;
  date: string;
  weekday: string;
  calendarWeek: number;
  league: "NLA" | "NLB";
  backupEntry: RefereeBackupEntry;
  assignment: BackupRefereeAssignment;
}

/**
 * Checks if a backup referee assignment belongs to the given user.
 */
export function isUserAssignment(
  assignment: BackupRefereeAssignment,
  userId: string,
): boolean {
  const refereeId =
    assignment.indoorReferee?.persistenceObjectIdentifier ??
    assignment.indoorReferee?.person?.persistenceObjectIdentifier;
  return refereeId === userId;
}

/**
 * Extracts on-call assignments for the current user from backup entries.
 */
export function extractUserOnCallAssignments(
  entries: RefereeBackupEntry[],
  userId: string,
): OnCallAssignment[] {
  const assignments: OnCallAssignment[] = [];

  for (const entry of entries) {
    // Check NLA referees
    const nlaAssignments = entry.nlaReferees ?? [];
    for (const assignment of nlaAssignments) {
      if (isUserAssignment(assignment, userId)) {
        assignments.push({
          id: `${entry.__identity}-NLA`,
          date: entry.date,
          weekday: entry.weekday,
          calendarWeek: entry.calendarWeek,
          league: "NLA",
          backupEntry: entry,
          assignment,
        });
      }
    }

    // Check NLB referees
    const nlbAssignments = entry.nlbReferees ?? [];
    for (const assignment of nlbAssignments) {
      if (isUserAssignment(assignment, userId)) {
        assignments.push({
          id: `${entry.__identity}-NLB`,
          date: entry.date,
          weekday: entry.weekday,
          calendarWeek: entry.calendarWeek,
          league: "NLB",
          backupEntry: entry,
          assignment,
        });
      }
    }
  }

  // Sort by date (ascending)
  return assignments.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

// Weekday abbreviations for demo data
const WEEKDAY_ABBREV = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;

// Day of week constants for date calculations
const SATURDAY = 6;
const DAYS_IN_WEEK = 7;

/**
 * Generates demo on-call assignments for the demo user.
 * Creates sample on-call duties for upcoming weekends.
 */
function generateDemoOnCallAssignments(): OnCallAssignment[] {
  const now = new Date();
  const assignments: OnCallAssignment[] = [];

  // Find the next Saturday (on-call duties typically on weekends)
  const daysUntilSaturday =
    (SATURDAY - now.getDay() + DAYS_IN_WEEK) % DAYS_IN_WEEK || DAYS_IN_WEEK;
  const nextSaturday = addDays(now, daysUntilSaturday);

  // Create a demo backup entry for NLA duty this weekend
  const nlaEntry: RefereeBackupEntry = {
    __identity: generateDemoUuid("demo-backup-nla"),
    date: nextSaturday.toISOString(),
    weekday: WEEKDAY_ABBREV[nextSaturday.getDay()]!,
    calendarWeek: getISOWeek(nextSaturday),
    nlaReferees: [
      {
        __identity: generateDemoUuid("demo-backup-assignment-nla"),
        indoorReferee: {
          persistenceObjectIdentifier: DEMO_USER_PERSON_IDENTITY,
          person: {
            firstName: "Demo",
            lastName: "User",
            displayName: "Demo User",
          },
        },
        isDispensed: false,
        hasResigned: false,
        unconfirmedFutureRefereeConvocations: false,
      },
    ],
  };

  assignments.push({
    id: `${nlaEntry.__identity}-NLA`,
    date: nlaEntry.date,
    weekday: nlaEntry.weekday,
    calendarWeek: nlaEntry.calendarWeek,
    league: "NLA",
    backupEntry: nlaEntry,
    assignment: nlaEntry.nlaReferees![0]!,
  });

  // Add an NLB duty for the following weekend
  const followingSaturday = addDays(nextSaturday, DAYS_IN_WEEK);
  const nlbEntry: RefereeBackupEntry = {
    __identity: generateDemoUuid("demo-backup-nlb"),
    date: followingSaturday.toISOString(),
    weekday: WEEKDAY_ABBREV[followingSaturday.getDay()]!,
    calendarWeek: getISOWeek(followingSaturday),
    nlbReferees: [
      {
        __identity: generateDemoUuid("demo-backup-assignment-nlb"),
        indoorReferee: {
          persistenceObjectIdentifier: DEMO_USER_PERSON_IDENTITY,
          person: {
            firstName: "Demo",
            lastName: "User",
            displayName: "Demo User",
          },
        },
        isDispensed: false,
        hasResigned: false,
        unconfirmedFutureRefereeConvocations: false,
      },
    ],
  };

  assignments.push({
    id: `${nlbEntry.__identity}-NLB`,
    date: nlbEntry.date,
    weekday: nlbEntry.weekday,
    calendarWeek: nlbEntry.calendarWeek,
    league: "NLB",
    backupEntry: nlbEntry,
    assignment: nlbEntry.nlbReferees![0]!,
  });

  return assignments;
}

/**
 * Hook to fetch on-call (Pikett) assignments for the current user.
 * Filters backup entries to only include dates where the user is assigned.
 */
export function useMyOnCallAssignments(
  weeksAhead: number = DEFAULT_WEEKS_AHEAD,
) {
  const userId = useAuthStore((state) => state.user?.id);
  const dataSource = useAuthStore((state) => state.dataSource);
  const isDemoMode = dataSource === "demo";

  const { data: backupEntries, ...queryResult } = useRefereeBackups(weeksAhead);

  // Filter and transform backup entries to user's on-call assignments
  const data = useMemo(() => {
    // Demo mode: generate sample on-call assignments
    if (isDemoMode) {
      return generateDemoOnCallAssignments();
    }

    // Calendar mode: no on-call data available
    if (dataSource === "calendar" || !userId || !backupEntries) {
      return [];
    }

    // API mode: extract user's assignments from backup entries
    return extractUserOnCallAssignments(backupEntries, userId);
  }, [isDemoMode, dataSource, userId, backupEntries]);

  return {
    ...queryResult,
    data,
  };
}
