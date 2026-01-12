/**
 * Assignment conflict detection utilities.
 *
 * Detects assignments that may conflict due to overlapping times.
 * A conflict is when two assignments are scheduled less than a threshold
 * apart (default: 1 hour), making it potentially impossible to attend both.
 *
 * This is particularly important for referees with multiple associations,
 * as they may have assignments from different regional/national associations
 * that could overlap.
 */

import type { CalendarAssignment } from '@/features/assignments/api/ical/types'

/** Default minimum gap between assignments to avoid conflict (in minutes) */
const DEFAULT_CONFLICT_THRESHOLD_MINUTES = 60

/**
 * Evaluator function to determine if two assignments conflict.
 * Used to customize conflict detection logic beyond simple time gaps.
 *
 * @param a - First assignment
 * @param b - Second assignment
 * @returns true if the assignments conflict, false otherwise
 */
export type ConflictEvaluator = (a: CalendarAssignment, b: CalendarAssignment) => boolean

/** Time conversion constants */
const MINUTES_PER_HOUR = 60
const MS_PER_MINUTE = 60000 // 60 * 1000

/**
 * Represents a detected conflict between two assignments.
 */
export interface AssignmentConflict {
  /** The ID of the first assignment (current/primary) */
  assignmentId: string
  /** The ID of the conflicting assignment */
  conflictingAssignmentId: string
  /** Time gap between assignments in minutes (can be negative for overlaps) */
  gapMinutes: number
  /** The conflicting assignment details */
  conflictingAssignment: {
    gameId: string
    homeTeam: string
    awayTeam: string
    startTime: string
    endTime: string
    league: string
    /** Association code (e.g., 'SV', 'SVRZ', 'SVRBA') - null if not from calendar */
    association: string | null
    /** Hall name if available */
    hallName?: string | null
  }
}

/**
 * Map of assignment ID to its conflicts.
 */
export type ConflictMap = Map<string, AssignmentConflict[]>

/**
 * Detects conflicts between calendar assignments.
 *
 * Two assignments conflict if:
 * - They are on the same day
 * - The gap between end of one and start of another is less than the threshold
 * - They are not the same assignment
 *
 * A custom evaluator can be provided to override the default time-based logic.
 * This allows for location-based or other custom conflict detection.
 *
 * @param assignments - All calendar assignments to check
 * @param thresholdMinutes - Minimum required gap between assignments (default: 60)
 * @param evaluator - Optional custom function to determine if two assignments conflict
 * @returns Map of assignment IDs to their conflicts
 */
export function detectConflicts(
  assignments: CalendarAssignment[],
  thresholdMinutes = DEFAULT_CONFLICT_THRESHOLD_MINUTES,
  evaluator?: ConflictEvaluator
): ConflictMap {
  const conflicts: ConflictMap = new Map()

  // Sort assignments by start time
  const sorted = [...assignments].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  // Check each pair of assignments
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i]!
    const currentStart = new Date(current.startTime)
    const currentEnd = new Date(current.endTime)

    // Only check assignments within a reasonable window (same day + threshold)
    for (let j = i + 1; j < sorted.length; j++) {
      const other = sorted[j]!
      const otherStart = new Date(other.startTime)
      const otherEnd = new Date(other.endTime)

      // If other starts more than threshold after current ends, no conflict possible
      // (only use this optimization when no custom evaluator is provided)
      const gapFromCurrentEndToOtherStart =
        (otherStart.getTime() - currentEnd.getTime()) / MS_PER_MINUTE

      if (!evaluator && gapFromCurrentEndToOtherStart >= thresholdMinutes) {
        // Since sorted by start time, no more conflicts possible for current
        break
      }

      // Check if there's a conflict (gap is less than threshold)
      // Gap can be negative if assignments overlap
      const gapFromOtherEndToCurrentStart =
        (currentStart.getTime() - otherEnd.getTime()) / MS_PER_MINUTE

      // The relevant gap depends on which assignment starts first
      const effectiveGap = Math.max(gapFromCurrentEndToOtherStart, gapFromOtherEndToCurrentStart)

      // Determine if there's a conflict using custom evaluator or default time-based logic
      const isConflict = evaluator ? evaluator(current, other) : effectiveGap < thresholdMinutes

      if (isConflict) {
        // Found a conflict - add to both assignments
        const conflictForCurrent: AssignmentConflict = {
          assignmentId: current.gameId,
          conflictingAssignmentId: other.gameId,
          gapMinutes: Math.round(gapFromCurrentEndToOtherStart),
          conflictingAssignment: {
            gameId: other.gameId,
            homeTeam: other.homeTeam,
            awayTeam: other.awayTeam,
            startTime: other.startTime,
            endTime: other.endTime,
            league: other.league,
            association: other.association,
            hallName: other.hallName,
          },
        }

        const conflictForOther: AssignmentConflict = {
          assignmentId: other.gameId,
          conflictingAssignmentId: current.gameId,
          gapMinutes: Math.round(-gapFromCurrentEndToOtherStart),
          conflictingAssignment: {
            gameId: current.gameId,
            homeTeam: current.homeTeam,
            awayTeam: current.awayTeam,
            startTime: current.startTime,
            endTime: current.endTime,
            league: current.league,
            association: current.association,
            hallName: current.hallName,
          },
        }

        // Add to current's conflicts
        const currentConflicts = conflicts.get(current.gameId) ?? []
        currentConflicts.push(conflictForCurrent)
        conflicts.set(current.gameId, currentConflicts)

        // Add to other's conflicts
        const otherConflicts = conflicts.get(other.gameId) ?? []
        otherConflicts.push(conflictForOther)
        conflicts.set(other.gameId, otherConflicts)
      }
    }
  }

  return conflicts
}

/**
 * Finds conflicts for a specific assignment ID.
 *
 * @param assignmentId - The assignment ID (game ID) to check
 * @param conflictMap - The conflict map from detectConflicts()
 * @returns Array of conflicts for this assignment, or empty array if none
 */
export function getConflictsForAssignment(
  assignmentId: string,
  conflictMap: ConflictMap
): AssignmentConflict[] {
  return conflictMap.get(assignmentId) ?? []
}

/**
 * Checks if an assignment has any conflicts.
 *
 * @param assignmentId - The assignment ID (game ID) to check
 * @param conflictMap - The conflict map from detectConflicts()
 * @returns true if the assignment has conflicts
 */
export function hasConflicts(assignmentId: string, conflictMap: ConflictMap): boolean {
  const conflicts = conflictMap.get(assignmentId)
  return conflicts !== undefined && conflicts.length > 0
}

/**
 * Parsed time gap for display.
 */
export interface ParsedGap {
  /** Type of gap: 'gap' means time between games, 'overlap' means games overlap */
  type: 'gap' | 'overlap'
  /** Hours component (0 if less than 1 hour) */
  hours: number
  /** Minutes component (remainder after hours) */
  minutes: number
}

/**
 * Parses the time gap into structured data for i18n-friendly display.
 *
 * @param gapMinutes - Gap in minutes (can be negative for overlaps)
 * @returns Structured gap data for translation
 */
export function parseGap(gapMinutes: number): ParsedGap {
  const isOverlap = gapMinutes < 0
  const absoluteMinutes = Math.abs(gapMinutes)
  const hours = Math.floor(absoluteMinutes / MINUTES_PER_HOUR)
  const minutes = absoluteMinutes % MINUTES_PER_HOUR

  return {
    type: isOverlap ? 'overlap' : 'gap',
    hours,
    minutes,
  }
}

/**
 * Formats the time gap for display.
 *
 * @param gapMinutes - Gap in minutes (can be negative for overlaps)
 * @returns Formatted string describing the gap
 * @deprecated Use parseGap() and handle formatting in the component with translations
 */
export function formatGap(gapMinutes: number): string {
  const { type, hours, minutes } = parseGap(gapMinutes)
  const typeLabel = type === 'overlap' ? 'overlap' : 'gap'

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}min ${typeLabel}`
  }
  if (hours > 0) {
    return `${hours}h ${typeLabel}`
  }
  return `${minutes}min ${typeLabel}`
}
