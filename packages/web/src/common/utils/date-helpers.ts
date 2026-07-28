/**
 * Re-export date helpers from @volleykit/shared.
 *
 * The shared package is the source of truth for date utilities.
 * This re-export maintains backward compatibility with existing imports.
 */

export {
  // Date formatting
  formatDateTime,
  formatDOB,
  // Week grouping
  groupByWeek,
  // Roster formatting
  formatRosterEntries,
  getMaxLastNameWidth,
  // Season utilities
  getSeasonDateRange,
  getActiveOrUpcomingSeasonDateRange,
} from '@volleykit/shared/utils'

export type { WeekInfo } from '@volleykit/shared/utils'
