/**
 * Re-export date helpers from @volleykit/shared.
 *
 * The shared package is the source of truth for date utilities.
 * This re-export maintains backward compatibility with existing imports.
 */

export {
  // Time constants
  MS_PER_SECOND,
  SECONDS_PER_MINUTE,
  MINUTES_PER_HOUR,
  HOURS_PER_DAY,
  MS_PER_MINUTE,
  MS_PER_HOUR,
  // Date formatting
  formatDateTime,
  formatDate,
  formatDOB,
  // Date checks
  isDateInPast,
  isDateToday,
  // Week grouping
  groupByWeek,
  // Roster formatting
  formatRosterEntries,
  getMaxLastNameWidth,
  // Season utilities
  getSeasonDateRange,
} from '@volleykit/shared/utils';

export type {
  WeekInfo,
  WeekGroup,
  RosterPlayerData,
  FormattedRosterEntry,
} from '@volleykit/shared/utils';
