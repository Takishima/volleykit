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
import { calculateDistanceKm, type Coordinates } from '@/shared/utils/distance'

/** Default minimum gap between assignments to avoid conflict (in minutes) */
const DEFAULT_CONFLICT_THRESHOLD_MINUTES = 60

/** Default maximum distance in km for venues to be considered "same location" (no conflict) */
const DEFAULT_SAME_LOCATION_DISTANCE_KM = 5

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

/**
 * Options for the smart conflict evaluator.
 */
export interface SmartConflictOptions {
  /** Minimum gap required between assignments in minutes (default: 60) */
  thresholdMinutes?: number
  /** Maximum distance in km for venues to be considered "same location" (default: 5) */
  sameLocationDistanceKm?: number
}

/**
 * Creates a smart conflict evaluator that considers both time gap AND venue distance.
 *
 * Two assignments are NOT considered conflicting if:
 * - They have less than thresholdMinutes gap (time conflict) BUT
 * - Both venues have coordinates AND they are within sameLocationDistanceKm of each other
 *
 * This handles the common case where a referee has back-to-back games at the same
 * or nearby venue - no travel time is needed, so a small gap is acceptable.
 *
 * @param options - Configuration for threshold and distance
 * @returns Evaluator function for use with detectConflicts()
 *
 * @example
 * ```ts
 * // Default: 60 min threshold, 5 km same-location distance
 * const evaluator = createSmartConflictEvaluator();
 *
 * // Custom: 90 min threshold, 3 km same-location distance
 * const evaluator = createSmartConflictEvaluator({
 *   thresholdMinutes: 90,
 *   sameLocationDistanceKm: 3
 * });
 *
 * const conflicts = detectConflicts(assignments, 60, evaluator);
 * ```
 */
export function createSmartConflictEvaluator(options: SmartConflictOptions = {}): ConflictEvaluator {
  const {
    thresholdMinutes = DEFAULT_CONFLICT_THRESHOLD_MINUTES,
    sameLocationDistanceKm = DEFAULT_SAME_LOCATION_DISTANCE_KM,
  } = options

  return (a: CalendarAssignment, b: CalendarAssignment): boolean => {
    // First check if there's a time-based conflict
    const aStart = new Date(a.startTime).getTime()
    const aEnd = new Date(a.endTime).getTime()
    const bStart = new Date(b.startTime).getTime()
    const bEnd = new Date(b.endTime).getTime()

    const thresholdMs = thresholdMinutes * MS_PER_MINUTE

    // Gap from a end to b start
    const gapAToB = bStart - aEnd
    // Gap from b end to a start
    const gapBToA = aStart - bEnd

    // Effective gap is the maximum of these (handles ordering)
    const effectiveGap = Math.max(gapAToB, gapBToA)

    // No time conflict - no conflict at all
    if (effectiveGap >= thresholdMs) {
      return false
    }

    // There IS a time conflict - now check if venues are close enough to ignore it
    // If both assignments have coordinates, check the distance
    if (a.coordinates && b.coordinates) {
      const distanceKm = calculateDistanceKm(a.coordinates, b.coordinates)

      // If venues are within the "same location" distance, no conflict
      if (distanceKm <= sameLocationDistanceKm) {
        return false
      }
    }

    // Time conflict exists and venues are not close (or coordinates unavailable)
    return true
  }
}

/**
 * Calculates the distance between two venues from their coordinates.
 *
 * @param coordsA - First venue coordinates (or null)
 * @param coordsB - Second venue coordinates (or null)
 * @returns Distance in km, or null if either coordinates are missing
 */
export function calculateVenueDistance(
  coordsA: Coordinates | null,
  coordsB: Coordinates | null
): number | null {
  if (!coordsA || !coordsB) {
    return null
  }
  return calculateDistanceKm(coordsA, coordsB)
}

/**
 * Checks if two venues are within a "same location" distance threshold.
 *
 * @param coordsA - First venue coordinates (or null)
 * @param coordsB - Second venue coordinates (or null)
 * @param maxDistanceKm - Maximum distance to be considered same location (default: 5)
 * @returns true if venues are close, false if far apart or coordinates unavailable
 */
export function areVenuesClose(
  coordsA: Coordinates | null,
  coordsB: Coordinates | null,
  maxDistanceKm = DEFAULT_SAME_LOCATION_DISTANCE_KM
): boolean {
  const distance = calculateVenueDistance(coordsA, coordsB)
  if (distance === null) {
    return false
  }
  return distance <= maxDistanceKm
}

/** Default game duration for gap calculation when endTime is not available (in minutes) */
const DEFAULT_GAME_DURATION_MINUTES = 90

/**
 * Calculates the minimum gap between a game time and a list of existing assignments.
 * Used for filtering exchanges that would be too close to existing assignments.
 *
 * @param gameStartTime - ISO date string of the potential game start time
 * @param assignments - User's existing calendar assignments
 * @param gameDurationMinutes - Estimated game duration if calculating gap to following games
 * @returns Minimum gap in minutes to any assignment (can be negative for overlaps), or null if no assignments
 */
export function calculateMinGapToAssignments(
  gameStartTime: string | undefined,
  assignments: CalendarAssignment[],
  gameDurationMinutes = DEFAULT_GAME_DURATION_MINUTES
): number | null {
  if (!gameStartTime || assignments.length === 0) {
    return null
  }

  const gameStart = new Date(gameStartTime).getTime()
  if (isNaN(gameStart)) {
    return null
  }

  // Estimated end time for the potential game
  const gameEnd = gameStart + gameDurationMinutes * MS_PER_MINUTE

  let minGap: number | null = null

  for (const assignment of assignments) {
    const assignmentStart = new Date(assignment.startTime).getTime()
    const assignmentEnd = new Date(assignment.endTime).getTime()

    if (isNaN(assignmentStart) || isNaN(assignmentEnd)) {
      continue
    }

    // Calculate gap: positive means there's time between games, negative means overlap
    // Case 1: Game is before assignment -> gap = assignment start - game end
    // Case 2: Game is after assignment -> gap = game start - assignment end
    const gapBeforeAssignment = (assignmentStart - gameEnd) / MS_PER_MINUTE
    const gapAfterAssignment = (gameStart - assignmentEnd) / MS_PER_MINUTE

    // The effective gap is the larger of the two (since one will be very negative)
    const effectiveGap = Math.max(gapBeforeAssignment, gapAfterAssignment)

    if (minGap === null || effectiveGap < minGap) {
      minGap = effectiveGap
    }
  }

  return minGap
}

/**
 * Options for smart gap checking with distance consideration.
 */
export interface GapCheckOptions {
  /** Minimum required gap in minutes */
  minGapMinutes: number
  /** Venue coordinates of the potential game (for distance-based filtering) */
  venueCoordinates?: Coordinates | null
  /** Maximum distance in km to consider venues as "same location" (default: 5) */
  sameLocationDistanceKm?: number
}

/**
 * Checks if a game has sufficient gap from all existing assignments.
 * Supports smart conflict detection by considering venue distance.
 *
 * When venue coordinates are provided, games at nearby venues (within sameLocationDistanceKm)
 * are not considered conflicts even if the time gap is small, since no travel time is needed.
 *
 * @param gameStartTime - ISO date string of the potential game start time
 * @param assignments - User's existing calendar assignments
 * @param minGapMinutesOrOptions - Minimum gap in minutes, or options object for smart checking
 * @returns true if the game has sufficient gap (or no assignments exist), false otherwise
 *
 * @example
 * ```ts
 * // Simple time-based check (backwards compatible)
 * hasMinimumGapFromAssignments(startTime, assignments, 60)
 *
 * // Smart check with distance consideration
 * hasMinimumGapFromAssignments(startTime, assignments, {
 *   minGapMinutes: 60,
 *   venueCoordinates: { latitude: 47.37, longitude: 8.54 },
 *   sameLocationDistanceKm: 5
 * })
 * ```
 */
export function hasMinimumGapFromAssignments(
  gameStartTime: string | undefined,
  assignments: CalendarAssignment[],
  minGapMinutesOrOptions: number | GapCheckOptions
): boolean {
  // Parse options (support both simple number and options object)
  const options: GapCheckOptions =
    typeof minGapMinutesOrOptions === 'number'
      ? { minGapMinutes: minGapMinutesOrOptions }
      : minGapMinutesOrOptions

  const {
    minGapMinutes,
    venueCoordinates = null,
    sameLocationDistanceKm = DEFAULT_SAME_LOCATION_DISTANCE_KM,
  } = options

  if (!gameStartTime || assignments.length === 0) {
    return true
  }

  const gameStart = new Date(gameStartTime).getTime()
  if (isNaN(gameStart)) {
    return true
  }

  // Estimated end time for the potential game
  const gameEnd = gameStart + DEFAULT_GAME_DURATION_MINUTES * MS_PER_MINUTE

  for (const assignment of assignments) {
    const assignmentStart = new Date(assignment.startTime).getTime()
    const assignmentEnd = new Date(assignment.endTime).getTime()

    if (isNaN(assignmentStart) || isNaN(assignmentEnd)) {
      continue
    }

    // Calculate gap: positive means there's time between games, negative means overlap
    const gapBeforeAssignment = (assignmentStart - gameEnd) / MS_PER_MINUTE
    const gapAfterAssignment = (gameStart - assignmentEnd) / MS_PER_MINUTE
    const effectiveGap = Math.max(gapBeforeAssignment, gapAfterAssignment)

    // If there's enough time gap, this assignment doesn't conflict
    if (effectiveGap >= minGapMinutes) {
      continue
    }

    // Time gap is insufficient - check if venues are close enough to allow it
    if (venueCoordinates && assignment.coordinates) {
      const distanceKm = calculateDistanceKm(venueCoordinates, assignment.coordinates)

      // If venues are within "same location" distance, no conflict for this assignment
      if (distanceKm <= sameLocationDistanceKm) {
        continue
      }
    }

    // Found a conflicting assignment (insufficient time gap and venues not close)
    return false
  }

  // No conflicts found
  return true
}
