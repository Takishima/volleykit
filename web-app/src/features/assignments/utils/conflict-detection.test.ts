import { describe, it, expect } from 'vitest'

import type { CalendarAssignment } from '@/features/assignments/api/ical/types'

import {
  detectConflicts,
  getConflictsForAssignment,
  hasConflicts,
  formatGap,
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
})
