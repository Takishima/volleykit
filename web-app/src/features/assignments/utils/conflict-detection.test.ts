import { describe, it, expect } from 'vitest'

import type { CalendarAssignment } from '@/features/assignments/api/ical/types'

import {
  detectConflicts,
  getConflictsForAssignment,
  hasConflicts,
  formatGap,
  parseGap,
  calculateMinGapToAssignments,
  hasMinimumGapFromAssignments,
} from './conflict-detection'

// Helper to create a test assignment
function createAssignment(
  gameId: string,
  startTime: string,
  endTime: string,
  association: string | null = null
): CalendarAssignment {
  return {
    gameId,
    startTime,
    endTime,
    homeTeam: `Home ${gameId}`,
    awayTeam: `Away ${gameId}`,
    league: 'Test League',
    role: 'referee1',
    roleRaw: 'ARB 1',
    association,
    leagueCategory: '3L',
    gender: 'men',
    hallName: `Hall ${gameId}`,
    hallId: null,
    gameNumber: parseInt(gameId, 10),
    address: '123 Test St',
    coordinates: null,
    plusCode: null,
    mapsUrl: null,
    referees: {},
  }
}

describe('conflict-detection', () => {
  describe('detectConflicts', () => {
    it('should return empty map when no assignments', () => {
      const conflicts = detectConflicts([])
      expect(conflicts.size).toBe(0)
    })

    it('should return empty map when single assignment', () => {
      const assignments = [createAssignment('1', '2024-01-15T14:00:00Z', '2024-01-15T16:00:00Z')]
      const conflicts = detectConflicts(assignments)
      expect(conflicts.size).toBe(0)
    })

    it('should return empty map when assignments are far apart', () => {
      const assignments = [
        createAssignment('1', '2024-01-15T10:00:00Z', '2024-01-15T12:00:00Z'),
        createAssignment('2', '2024-01-15T14:00:00Z', '2024-01-15T16:00:00Z'),
      ]
      const conflicts = detectConflicts(assignments)
      expect(conflicts.size).toBe(0)
    })

    it('should detect conflict when assignments are within threshold', () => {
      const assignments = [
        createAssignment('1', '2024-01-15T10:00:00Z', '2024-01-15T12:00:00Z'),
        createAssignment('2', '2024-01-15T12:30:00Z', '2024-01-15T14:30:00Z'),
      ]
      // 30 min gap, default threshold is 60 min
      const conflicts = detectConflicts(assignments)

      expect(conflicts.size).toBe(2)
      expect(conflicts.has('1')).toBe(true)
      expect(conflicts.has('2')).toBe(true)

      const conflict1 = conflicts.get('1')
      expect(conflict1?.length).toBe(1)
      expect(conflict1?.[0]?.conflictingAssignmentId).toBe('2')
    })

    it('should detect overlapping assignments', () => {
      const assignments = [
        createAssignment('1', '2024-01-15T10:00:00Z', '2024-01-15T14:00:00Z'),
        createAssignment('2', '2024-01-15T12:00:00Z', '2024-01-15T16:00:00Z'),
      ]
      const conflicts = detectConflicts(assignments)

      expect(conflicts.size).toBe(2)
      const conflict1 = conflicts.get('1')
      expect(conflict1).toBeDefined()
      // Gap should be negative for overlapping assignments
      expect(conflict1?.[0]?.gapMinutes).toBeLessThan(0)
    })

    it('should respect custom threshold', () => {
      const assignments = [
        createAssignment('1', '2024-01-15T10:00:00Z', '2024-01-15T12:00:00Z'),
        createAssignment('2', '2024-01-15T12:30:00Z', '2024-01-15T14:30:00Z'),
      ]

      // With 30 min threshold, 30 min gap is not a conflict
      const conflictsLowThreshold = detectConflicts(assignments, 30)
      expect(conflictsLowThreshold.size).toBe(0)

      // With 90 min threshold, 30 min gap is a conflict
      const conflictsHighThreshold = detectConflicts(assignments, 90)
      expect(conflictsHighThreshold.size).toBe(2)
    })

    it('should include association info in conflicts', () => {
      const assignments = [
        createAssignment('1', '2024-01-15T10:00:00Z', '2024-01-15T12:00:00Z', 'SVRZ'),
        createAssignment('2', '2024-01-15T12:30:00Z', '2024-01-15T14:30:00Z', 'SVRBA'),
      ]
      const conflicts = detectConflicts(assignments)

      const conflict1 = conflicts.get('1')
      expect(conflict1?.[0]?.conflictingAssignment.association).toBe('SVRBA')

      const conflict2 = conflicts.get('2')
      expect(conflict2?.[0]?.conflictingAssignment.association).toBe('SVRZ')
    })

    it('should handle multiple conflicts for same assignment', () => {
      const assignments = [
        createAssignment('1', '2024-01-15T10:00:00Z', '2024-01-15T11:00:00Z'),
        createAssignment('2', '2024-01-15T11:15:00Z', '2024-01-15T12:15:00Z'),
        createAssignment('3', '2024-01-15T12:30:00Z', '2024-01-15T13:30:00Z'),
      ]
      // Assignment 2 should conflict with both 1 and 3
      const conflicts = detectConflicts(assignments)

      const conflict2 = conflicts.get('2')
      expect(conflict2?.length).toBe(2)
    })

    it('should not detect conflict on different days', () => {
      const assignments = [
        createAssignment('1', '2024-01-15T22:00:00Z', '2024-01-16T00:00:00Z'),
        createAssignment('2', '2024-01-16T00:30:00Z', '2024-01-16T02:30:00Z'),
      ]
      // Even though times are close, should still detect since gap < threshold
      const conflicts = detectConflicts(assignments)
      expect(conflicts.size).toBe(2)
    })

    it('should use custom evaluator when provided', () => {
      const assignments = [
        createAssignment('1', '2024-01-15T10:00:00Z', '2024-01-15T12:00:00Z'),
        createAssignment('2', '2024-01-15T12:30:00Z', '2024-01-15T14:30:00Z'),
      ]
      // 30 min gap would normally be a conflict with default 60 min threshold
      // But custom evaluator says no conflicts
      const neverConflict = () => false
      const conflicts = detectConflicts(assignments, 60, neverConflict)
      expect(conflicts.size).toBe(0)
    })

    it('should detect conflicts when custom evaluator returns true', () => {
      const assignments = [
        createAssignment('1', '2024-01-15T10:00:00Z', '2024-01-15T12:00:00Z'),
        createAssignment('2', '2024-01-15T15:00:00Z', '2024-01-15T17:00:00Z'),
      ]
      // 3 hour gap would not normally be a conflict with default 60 min threshold
      // But custom evaluator says always conflict
      const alwaysConflict = () => true
      const conflicts = detectConflicts(assignments, 60, alwaysConflict)
      expect(conflicts.size).toBe(2)
    })

    it('should pass assignments to custom evaluator in order', () => {
      const assignments = [
        createAssignment('1', '2024-01-15T10:00:00Z', '2024-01-15T12:00:00Z'),
        createAssignment('2', '2024-01-15T12:30:00Z', '2024-01-15T14:30:00Z'),
      ]
      const evaluatorCalls: Array<[string, string]> = []
      const trackingEvaluator = (a: CalendarAssignment, b: CalendarAssignment) => {
        evaluatorCalls.push([a.gameId, b.gameId])
        return false
      }
      detectConflicts(assignments, 60, trackingEvaluator)
      // Should be called with first assignment first (sorted by start time)
      expect(evaluatorCalls).toEqual([['1', '2']])
    })
  })

  describe('getConflictsForAssignment', () => {
    it('should return empty array for non-existent assignment', () => {
      const conflicts = detectConflicts([])
      const result = getConflictsForAssignment('nonexistent', conflicts)
      expect(result).toEqual([])
    })

    it('should return conflicts for existing assignment', () => {
      const assignments = [
        createAssignment('1', '2024-01-15T10:00:00Z', '2024-01-15T12:00:00Z'),
        createAssignment('2', '2024-01-15T12:30:00Z', '2024-01-15T14:30:00Z'),
      ]
      const conflictMap = detectConflicts(assignments)
      const result = getConflictsForAssignment('1', conflictMap)

      expect(result.length).toBe(1)
      expect(result[0]?.conflictingAssignmentId).toBe('2')
    })
  })

  describe('hasConflicts', () => {
    it('should return false for assignment without conflicts', () => {
      const assignments = [
        createAssignment('1', '2024-01-15T10:00:00Z', '2024-01-15T12:00:00Z'),
        createAssignment('2', '2024-01-15T15:00:00Z', '2024-01-15T17:00:00Z'),
      ]
      const conflictMap = detectConflicts(assignments)

      expect(hasConflicts('1', conflictMap)).toBe(false)
      expect(hasConflicts('2', conflictMap)).toBe(false)
    })

    it('should return true for assignment with conflicts', () => {
      const assignments = [
        createAssignment('1', '2024-01-15T10:00:00Z', '2024-01-15T12:00:00Z'),
        createAssignment('2', '2024-01-15T12:30:00Z', '2024-01-15T14:30:00Z'),
      ]
      const conflictMap = detectConflicts(assignments)

      expect(hasConflicts('1', conflictMap)).toBe(true)
      expect(hasConflicts('2', conflictMap)).toBe(true)
    })
  })

  describe('formatGap', () => {
    it('should format positive gap in minutes', () => {
      expect(formatGap(30)).toBe('30min gap')
    })

    it('should format positive gap in hours', () => {
      expect(formatGap(60)).toBe('1h gap')
    })

    it('should format positive gap in hours and minutes', () => {
      expect(formatGap(90)).toBe('1h 30min gap')
    })

    it('should format negative gap (overlap) in minutes', () => {
      expect(formatGap(-30)).toBe('30min overlap')
    })

    it('should format negative gap (overlap) in hours', () => {
      expect(formatGap(-60)).toBe('1h overlap')
    })

    it('should format negative gap (overlap) in hours and minutes', () => {
      expect(formatGap(-90)).toBe('1h 30min overlap')
    })

    it('should handle zero gap', () => {
      expect(formatGap(0)).toBe('0min gap')
    })
  })

  describe('parseGap', () => {
    it('should parse positive gap in minutes only', () => {
      const result = parseGap(30)
      expect(result).toEqual({ type: 'gap', hours: 0, minutes: 30 })
    })

    it('should parse positive gap in hours only', () => {
      const result = parseGap(60)
      expect(result).toEqual({ type: 'gap', hours: 1, minutes: 0 })
    })

    it('should parse positive gap in hours and minutes', () => {
      const result = parseGap(90)
      expect(result).toEqual({ type: 'gap', hours: 1, minutes: 30 })
    })

    it('should parse negative gap (overlap) in minutes only', () => {
      const result = parseGap(-30)
      expect(result).toEqual({ type: 'overlap', hours: 0, minutes: 30 })
    })

    it('should parse negative gap (overlap) in hours only', () => {
      const result = parseGap(-60)
      expect(result).toEqual({ type: 'overlap', hours: 1, minutes: 0 })
    })

    it('should parse negative gap (overlap) in hours and minutes', () => {
      const result = parseGap(-90)
      expect(result).toEqual({ type: 'overlap', hours: 1, minutes: 30 })
    })

    it('should handle zero as gap', () => {
      const result = parseGap(0)
      expect(result).toEqual({ type: 'gap', hours: 0, minutes: 0 })
    })

    it('should handle large values', () => {
      const result = parseGap(150) // 2h 30min
      expect(result).toEqual({ type: 'gap', hours: 2, minutes: 30 })
    })
  })

  describe('calculateMinGapToAssignments', () => {
    it('should return null when no assignments', () => {
      const result = calculateMinGapToAssignments('2024-01-15T14:00:00Z', [])
      expect(result).toBeNull()
    })

    it('should return null when game time is undefined', () => {
      const assignments = [createAssignment('1', '2024-01-15T10:00:00Z', '2024-01-15T12:00:00Z')]
      const result = calculateMinGapToAssignments(undefined, assignments)
      expect(result).toBeNull()
    })

    it('should return null when game time is invalid', () => {
      const assignments = [createAssignment('1', '2024-01-15T10:00:00Z', '2024-01-15T12:00:00Z')]
      const result = calculateMinGapToAssignments('invalid-date', assignments)
      expect(result).toBeNull()
    })

    it('should calculate positive gap when game is after assignment', () => {
      const assignments = [createAssignment('1', '2024-01-15T10:00:00Z', '2024-01-15T12:00:00Z')]
      // Game starts at 14:00, assignment ends at 12:00 -> 2 hour gap
      const result = calculateMinGapToAssignments('2024-01-15T14:00:00Z', assignments)
      expect(result).toBe(120) // 2 hours = 120 minutes
    })

    it('should calculate positive gap when game is before assignment', () => {
      const assignments = [createAssignment('1', '2024-01-15T14:00:00Z', '2024-01-15T16:00:00Z')]
      // Game starts at 10:00, ends at ~11:30 (90 min default), assignment starts at 14:00
      // Gap = 14:00 - 11:30 = 2.5 hours = 150 minutes
      const result = calculateMinGapToAssignments('2024-01-15T10:00:00Z', assignments)
      expect(result).toBe(150) // 2.5 hours
    })

    it('should calculate negative gap when games overlap', () => {
      const assignments = [createAssignment('1', '2024-01-15T12:00:00Z', '2024-01-15T14:00:00Z')]
      // Game starts at 13:00, assignment ends at 14:00
      // With 90 min game duration, game would end at 14:30
      // Gap from game end (14:30) to assignment start (12:00) = -2.5 hours
      // Gap from assignment end (14:00) to game start (13:00) = -1 hour
      // Effective gap = max(-150, -60) = -60 minutes (overlap)
      const result = calculateMinGapToAssignments('2024-01-15T13:00:00Z', assignments)
      expect(result).toBeLessThan(0) // Overlap = negative
    })

    it('should return minimum gap when multiple assignments', () => {
      const assignments = [
        createAssignment('1', '2024-01-15T09:00:00Z', '2024-01-15T11:00:00Z'), // 3 hour gap after
        createAssignment('2', '2024-01-15T15:00:00Z', '2024-01-15T17:00:00Z'), // 0.5 hour gap before (with 90 min game)
      ]
      // Game at 14:00-15:30 (90 min)
      // Gap to assignment 1: game start (14:00) - assignment end (11:00) = 3 hours = 180 min
      // Gap to assignment 2: assignment start (15:00) - game end (15:30) = -30 min
      const result = calculateMinGapToAssignments('2024-01-15T14:00:00Z', assignments)
      expect(result).toBe(-30) // Minimum gap (overlap with assignment 2)
    })

    it('should skip assignments with invalid times', () => {
      const validAssignment = createAssignment(
        '1',
        '2024-01-15T10:00:00Z',
        '2024-01-15T12:00:00Z'
      )
      const invalidAssignment: CalendarAssignment = {
        ...validAssignment,
        gameId: '2',
        startTime: 'invalid',
        endTime: 'invalid',
      }
      const result = calculateMinGapToAssignments('2024-01-15T14:00:00Z', [
        validAssignment,
        invalidAssignment,
      ])
      expect(result).toBe(120) // Only considers valid assignment
    })
  })

  describe('hasMinimumGapFromAssignments', () => {
    it('should return true when no assignments', () => {
      const result = hasMinimumGapFromAssignments('2024-01-15T14:00:00Z', [], 60)
      expect(result).toBe(true)
    })

    it('should return true when game time is undefined', () => {
      const assignments = [createAssignment('1', '2024-01-15T10:00:00Z', '2024-01-15T12:00:00Z')]
      const result = hasMinimumGapFromAssignments(undefined, assignments, 60)
      expect(result).toBe(true)
    })

    it('should return true when gap is sufficient', () => {
      const assignments = [createAssignment('1', '2024-01-15T10:00:00Z', '2024-01-15T12:00:00Z')]
      // Game at 14:00, 2 hour gap after assignment
      const result = hasMinimumGapFromAssignments('2024-01-15T14:00:00Z', assignments, 60)
      expect(result).toBe(true) // 120 min gap >= 60 min threshold
    })

    it('should return false when gap is insufficient', () => {
      const assignments = [createAssignment('1', '2024-01-15T12:00:00Z', '2024-01-15T14:00:00Z')]
      // Game at 14:30, only 30 min gap after assignment
      const result = hasMinimumGapFromAssignments('2024-01-15T14:30:00Z', assignments, 60)
      expect(result).toBe(false) // 30 min gap < 60 min threshold
    })

    it('should return false when games overlap', () => {
      const assignments = [createAssignment('1', '2024-01-15T14:00:00Z', '2024-01-15T16:00:00Z')]
      // Game at 15:00 overlaps with assignment
      const result = hasMinimumGapFromAssignments('2024-01-15T15:00:00Z', assignments, 60)
      expect(result).toBe(false) // Negative gap (overlap) < 60 min
    })

    it('should use minimum gap across multiple assignments', () => {
      const assignments = [
        createAssignment('1', '2024-01-15T09:00:00Z', '2024-01-15T11:00:00Z'), // Plenty of gap
        createAssignment('2', '2024-01-15T14:30:00Z', '2024-01-15T16:30:00Z'), // Only 30 min gap
      ]
      // Game at 12:00-13:30 (90 min)
      // Gap to assignment 1: 12:00 - 11:00 = 60 min
      // Gap to assignment 2: 14:30 - 13:30 = 60 min
      const result = hasMinimumGapFromAssignments('2024-01-15T12:00:00Z', assignments, 60)
      expect(result).toBe(true)

      // With higher threshold
      const result2 = hasMinimumGapFromAssignments('2024-01-15T12:00:00Z', assignments, 90)
      expect(result2).toBe(false)
    })
  })
})
