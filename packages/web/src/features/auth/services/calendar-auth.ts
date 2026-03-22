/**
 * Calendar mode authentication logic.
 *
 * Handles login with a calendar code (6 alphanumeric characters) by:
 * 1. Validating the code format
 * 2. Fetching calendar data to extract associations
 * 3. Creating synthetic occupations for transport settings
 */

import type { Occupation, AuthState } from '@/common/stores/auth'
import { logger } from '@/common/utils/logger'
import { fetchCalendarAssignments } from '@/features/assignments/api/calendar-api'

/** Calendar codes are exactly 6 alphanumeric characters */
const CALENDAR_CODE_PATTERN = /^[a-zA-Z0-9]{6}$/

type SetFn = (partial: Partial<AuthState>) => void

export async function performCalendarLogin(code: string, set: SetFn): Promise<void> {
  const trimmedCode = code.trim()

  // Validate calendar code format (6 alphanumeric characters)
  // Note: The calendar code should already be validated by LoginPage before
  // calling this function. This is just a safeguard for direct API calls.
  if (!CALENDAR_CODE_PATTERN.test(trimmedCode)) {
    set({ status: 'error', error: 'auth.invalidCalendarCode' })
    return
  }

  set({ status: 'loading', error: null })

  try {
    // Fetch calendar data to extract associations for transport settings
    // This unifies calendar mode with regular API mode - both have occupations
    const assignments = await fetchCalendarAssignments(trimmedCode)

    // Extract unique associations from calendar assignments
    const uniqueAssociations = new Set<string>()
    for (const assignment of assignments) {
      if (assignment.association) {
        uniqueAssociations.add(assignment.association)
      }
    }

    // Create synthetic occupations from associations found in calendar
    // This allows transport settings to work per-association like regular mode
    const occupations: Occupation[] = Array.from(uniqueAssociations)
      .sort()
      .map((assoc) => ({
        id: `calendar-${assoc}`,
        type: 'referee' as const,
        associationCode: assoc,
      }))

    // Set authenticated state with occupations derived from calendar data
    set({
      status: 'authenticated',
      dataSource: 'calendar',
      calendarCode: trimmedCode,
      user: {
        id: `calendar-${trimmedCode}`,
        firstName: 'Calendar',
        lastName: 'User',
        occupations,
      },
      // Set first occupation as active if any found
      activeOccupationId: occupations[0]?.id ?? null,
      error: null,
    })
  } catch (error) {
    // If fetching fails, fall back to no occupations
    // This allows login to succeed even if calendar is empty or fails
    logger.warn('Failed to fetch calendar for associations:', error)

    set({
      status: 'authenticated',
      dataSource: 'calendar',
      calendarCode: trimmedCode,
      user: {
        id: `calendar-${trimmedCode}`,
        firstName: 'Calendar',
        lastName: 'User',
        occupations: [],
      },
      activeOccupationId: null,
      error: null,
    })
  }
}
