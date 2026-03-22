/**
 * Date range utilities for assignment queries.
 *
 * Pure functions for computing date ranges used in assignment filtering.
 * Extracted from useAssignments.ts for improved testability and reuse.
 */

import { addDays, startOfDay, endOfDay, subDays } from 'date-fns'

import {
  DEFAULT_DATE_RANGE_DAYS,
  THIS_WEEK_DAYS,
  NEXT_MONTH_DAYS,
} from '@/common/hooks/usePaginatedQuery'

/** Preset date period for filtering assignments */
export type DatePeriod = 'upcoming' | 'past' | 'thisWeek' | 'nextMonth' | 'custom'

/**
 * Compute ISO date range strings for a given period preset.
 */
export function getDateRangeForPeriod(
  period: DatePeriod,
  customRange?: { from: Date; to: Date }
): { from: string; to: string } {
  const now = new Date()

  switch (period) {
    case 'upcoming':
      return {
        from: startOfDay(now).toISOString(),
        to: endOfDay(addDays(now, DEFAULT_DATE_RANGE_DAYS)).toISOString(),
      }
    case 'past':
      return {
        from: startOfDay(subDays(now, DEFAULT_DATE_RANGE_DAYS)).toISOString(),
        to: endOfDay(subDays(now, 1)).toISOString(),
      }
    case 'thisWeek':
      return {
        from: startOfDay(now).toISOString(),
        to: endOfDay(addDays(now, THIS_WEEK_DAYS)).toISOString(),
      }
    case 'nextMonth':
      return {
        from: startOfDay(now).toISOString(),
        to: endOfDay(addDays(now, NEXT_MONTH_DAYS)).toISOString(),
      }
    case 'custom':
      if (customRange) {
        return {
          from: startOfDay(customRange.from).toISOString(),
          to: endOfDay(customRange.to).toISOString(),
        }
      }
      return getDateRangeForPeriod('upcoming')
  }
}
