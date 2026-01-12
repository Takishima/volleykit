import { describe, it, expect } from 'vitest'

import type { CalendarAssignment } from '@/features/assignments/api/ical/types'

import { createTimeGapEvaluator } from './useCalendarConflicts'

// Helper to create a test assignment
function createAssignment(startTime: string, endTime: string): CalendarAssignment {
  return {
    gameId: '1',
    startTime,
    endTime,
    homeTeam: 'Home',
    awayTeam: 'Away',
    league: 'Test League',
    role: 'referee1',
    roleRaw: 'ARB 1',
    association: null,
    leagueCategory: '3L',
    gender: 'men',
    hallName: 'Hall',
    hallId: null,
    gameNumber: 1,
    address: '123 Test St',
    coordinates: null,
    plusCode: null,
    mapsUrl: null,
    referees: {},
  }
}

describe('createTimeGapEvaluator', () => {
  it('should return true when gap is less than threshold', () => {
    const evaluator = createTimeGapEvaluator(60) // 60 min threshold
    const a = createAssignment('2024-01-15T10:00:00Z', '2024-01-15T12:00:00Z')
    const b = createAssignment('2024-01-15T12:30:00Z', '2024-01-15T14:30:00Z')
    // 30 min gap < 60 min threshold -> conflict
    expect(evaluator(a, b)).toBe(true)
  })

  it('should return false when gap equals threshold', () => {
    const evaluator = createTimeGapEvaluator(60) // 60 min threshold
    const a = createAssignment('2024-01-15T10:00:00Z', '2024-01-15T12:00:00Z')
    const b = createAssignment('2024-01-15T13:00:00Z', '2024-01-15T15:00:00Z')
    // 60 min gap >= 60 min threshold -> no conflict
    expect(evaluator(a, b)).toBe(false)
  })

  it('should return false when gap is greater than threshold', () => {
    const evaluator = createTimeGapEvaluator(60) // 60 min threshold
    const a = createAssignment('2024-01-15T10:00:00Z', '2024-01-15T12:00:00Z')
    const b = createAssignment('2024-01-15T14:00:00Z', '2024-01-15T16:00:00Z')
    // 120 min gap > 60 min threshold -> no conflict
    expect(evaluator(a, b)).toBe(false)
  })

  it('should handle overlapping assignments as conflicts', () => {
    const evaluator = createTimeGapEvaluator(60)
    const a = createAssignment('2024-01-15T10:00:00Z', '2024-01-15T14:00:00Z')
    const b = createAssignment('2024-01-15T12:00:00Z', '2024-01-15T16:00:00Z')
    // Overlapping -> negative gap -> definitely < threshold
    expect(evaluator(a, b)).toBe(true)
  })

  it('should work regardless of assignment order', () => {
    const evaluator = createTimeGapEvaluator(60)
    const earlier = createAssignment('2024-01-15T10:00:00Z', '2024-01-15T12:00:00Z')
    const later = createAssignment('2024-01-15T12:30:00Z', '2024-01-15T14:30:00Z')
    // Should work in both orders
    expect(evaluator(earlier, later)).toBe(true)
    expect(evaluator(later, earlier)).toBe(true)
  })

  it('should respect custom threshold', () => {
    const strictEvaluator = createTimeGapEvaluator(120) // 2 hour threshold
    const a = createAssignment('2024-01-15T10:00:00Z', '2024-01-15T12:00:00Z')
    const b = createAssignment('2024-01-15T13:00:00Z', '2024-01-15T15:00:00Z')
    // 60 min gap < 120 min threshold -> conflict
    expect(strictEvaluator(a, b)).toBe(true)

    const relaxedEvaluator = createTimeGapEvaluator(30) // 30 min threshold
    // 60 min gap >= 30 min threshold -> no conflict
    expect(relaxedEvaluator(a, b)).toBe(false)
  })
})
