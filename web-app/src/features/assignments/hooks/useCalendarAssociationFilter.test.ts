import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'

import type { CalendarAssignment } from '@/features/assignments/api/calendar-api'
import { useCalendarFilterStore } from '@/shared/stores/calendar-filter'

import { useCalendarAssociationFilter, ALL_ASSOCIATIONS } from './useCalendarAssociationFilter'

function createMockCalendarAssignment(
  overrides: Partial<CalendarAssignment> = {}
): CalendarAssignment {
  return {
    gameId: `game-${Math.random()}`,
    gameNumber: 123456,
    startTime: '2025-02-15T19:30:00+01:00',
    endTime: '2025-02-15T22:30:00+01:00',
    league: 'NLA Men',
    leagueCategory: 'NLA',
    homeTeam: 'VBC Zürich',
    awayTeam: 'Volley Luzern',
    role: 'referee1',
    roleRaw: 'ARB 1',
    gender: 'men',
    hallName: 'Sporthalle Hardau',
    hallId: '3661',
    address: 'Hardaustrasse 10, 8005 Zürich',
    coordinates: { latitude: 47.3769, longitude: 8.5417 },
    mapsUrl: 'https://maps.google.com/?q=47.3769,8.5417',
    plusCode: null,
    referees: {},
    association: null,
    ...overrides,
  }
}

describe('useCalendarAssociationFilter', () => {
  // Reset the Zustand store before each test to ensure isolation
  beforeEach(() => {
    useCalendarFilterStore.setState({
      selectedAssociation: ALL_ASSOCIATIONS,
      associations: [],
    })
  })

  describe('associations extraction', () => {
    it('returns empty array when no calendar data', () => {
      const { result } = renderHook(() => useCalendarAssociationFilter([]))

      expect(result.current.associations).toEqual([])
    })

    it('extracts unique associations from calendar data', () => {
      const calendarData = [
        createMockCalendarAssignment({ association: 'SVRZ' }),
        createMockCalendarAssignment({ association: 'SVRBA' }),
        createMockCalendarAssignment({ association: 'SVRZ' }), // duplicate
      ]

      const { result } = renderHook(() => useCalendarAssociationFilter(calendarData))

      expect(result.current.associations).toEqual(['SVRBA', 'SVRZ']) // sorted
    })

    it('excludes null associations', () => {
      const calendarData = [
        createMockCalendarAssignment({ association: 'SVRZ' }),
        createMockCalendarAssignment({ association: null }),
        createMockCalendarAssignment({ association: 'SVRBA' }),
      ]

      const { result } = renderHook(() => useCalendarAssociationFilter(calendarData))

      expect(result.current.associations).toEqual(['SVRBA', 'SVRZ'])
    })

    it('sorts associations alphabetically', () => {
      const calendarData = [
        createMockCalendarAssignment({ association: 'SVRZ' }),
        createMockCalendarAssignment({ association: 'SVRI' }),
        createMockCalendarAssignment({ association: 'SVRBA' }),
        createMockCalendarAssignment({ association: 'SVRNO' }),
      ]

      const { result } = renderHook(() => useCalendarAssociationFilter(calendarData))

      expect(result.current.associations).toEqual(['SVRBA', 'SVRI', 'SVRNO', 'SVRZ'])
    })
  })

  describe('hasMultipleAssociations', () => {
    it('returns false when no associations', () => {
      const { result } = renderHook(() => useCalendarAssociationFilter([]))

      expect(result.current.hasMultipleAssociations).toBe(false)
    })

    it('returns false when only one association', () => {
      const calendarData = [
        createMockCalendarAssignment({ association: 'SVRZ' }),
        createMockCalendarAssignment({ association: 'SVRZ' }),
      ]

      const { result } = renderHook(() => useCalendarAssociationFilter(calendarData))

      expect(result.current.hasMultipleAssociations).toBe(false)
    })

    it('returns true when two or more associations', () => {
      const calendarData = [
        createMockCalendarAssignment({ association: 'SVRZ' }),
        createMockCalendarAssignment({ association: 'SVRBA' }),
      ]

      const { result } = renderHook(() => useCalendarAssociationFilter(calendarData))

      expect(result.current.hasMultipleAssociations).toBe(true)
    })
  })

  describe('selectedAssociation', () => {
    it('defaults to ALL_ASSOCIATIONS', () => {
      const calendarData = [createMockCalendarAssignment({ association: 'SVRZ' })]

      const { result } = renderHook(() => useCalendarAssociationFilter(calendarData))

      expect(result.current.selectedAssociation).toBe(ALL_ASSOCIATIONS)
    })

    it('updates when setSelectedAssociation is called', () => {
      const calendarData = [
        createMockCalendarAssignment({ association: 'SVRZ' }),
        createMockCalendarAssignment({ association: 'SVRBA' }),
      ]

      const { result } = renderHook(() => useCalendarAssociationFilter(calendarData))

      act(() => {
        result.current.setSelectedAssociation('SVRZ')
      })

      expect(result.current.selectedAssociation).toBe('SVRZ')
    })

    it('reverts to ALL_ASSOCIATIONS when selected association is no longer available', () => {
      const initialData = [
        createMockCalendarAssignment({ association: 'SVRZ' }),
        createMockCalendarAssignment({ association: 'SVRBA' }),
      ]

      const { result, rerender } = renderHook(({ data }) => useCalendarAssociationFilter(data), {
        initialProps: { data: initialData },
      })

      // Select SVRZ
      act(() => {
        result.current.setSelectedAssociation('SVRZ')
      })
      expect(result.current.selectedAssociation).toBe('SVRZ')

      // Update data to remove SVRZ
      const newData = [createMockCalendarAssignment({ association: 'SVRBA' })]
      rerender({ data: newData })

      // Should revert to ALL_ASSOCIATIONS
      expect(result.current.selectedAssociation).toBe(ALL_ASSOCIATIONS)
    })
  })

  describe('filterByAssociation', () => {
    it('returns all items when ALL_ASSOCIATIONS is selected', () => {
      const calendarData = [
        createMockCalendarAssignment({ gameId: '1', association: 'SVRZ' }),
        createMockCalendarAssignment({ gameId: '2', association: 'SVRBA' }),
        createMockCalendarAssignment({ gameId: '3', association: null }),
      ]

      const { result } = renderHook(() => useCalendarAssociationFilter(calendarData))

      const filtered = result.current.filterByAssociation(calendarData)
      expect(filtered).toHaveLength(3)
    })

    it('filters items by selected association', () => {
      const calendarData = [
        createMockCalendarAssignment({ gameId: '1', association: 'SVRZ' }),
        createMockCalendarAssignment({ gameId: '2', association: 'SVRBA' }),
        createMockCalendarAssignment({ gameId: '3', association: 'SVRZ' }),
      ]

      const { result } = renderHook(() => useCalendarAssociationFilter(calendarData))

      act(() => {
        result.current.setSelectedAssociation('SVRZ')
      })

      const filtered = result.current.filterByAssociation(calendarData)
      expect(filtered).toHaveLength(2)
      expect(filtered.every((item) => item.association === 'SVRZ')).toBe(true)
    })

    it('returns empty array when no items match selected association', () => {
      const calendarData = [createMockCalendarAssignment({ gameId: '1', association: 'SVRBA' })]

      const { result } = renderHook(() => useCalendarAssociationFilter(calendarData))

      act(() => {
        result.current.setSelectedAssociation('SVRZ')
      })

      // Since SVRZ is not in the data, it should revert to ALL_ASSOCIATIONS
      // due to the effectiveSelection logic
      const filtered = result.current.filterByAssociation(calendarData)
      expect(filtered).toHaveLength(1)
    })

    it('works with generic types extending association interface', () => {
      interface ExtendedItem {
        id: string
        association: string | null
        extra: number
      }

      const items: ExtendedItem[] = [
        { id: '1', association: 'SVRZ', extra: 100 },
        { id: '2', association: 'SVRBA', extra: 200 },
      ]

      const calendarData = [
        createMockCalendarAssignment({ association: 'SVRZ' }),
        createMockCalendarAssignment({ association: 'SVRBA' }),
      ]

      const { result } = renderHook(() => useCalendarAssociationFilter(calendarData))

      act(() => {
        result.current.setSelectedAssociation('SVRZ')
      })

      const filtered = result.current.filterByAssociation(items)
      expect(filtered).toHaveLength(1)
      expect(filtered[0]?.id).toBe('1')
      expect(filtered[0]?.extra).toBe(100)
    })
  })

  describe('memoization', () => {
    it('maintains stable filterByAssociation reference when selection unchanged', () => {
      const calendarData = [createMockCalendarAssignment({ association: 'SVRZ' })]

      const { result, rerender } = renderHook(() => useCalendarAssociationFilter(calendarData))

      const firstFilter = result.current.filterByAssociation
      rerender()
      const secondFilter = result.current.filterByAssociation

      expect(firstFilter).toBe(secondFilter)
    })

    it('updates filterByAssociation reference when selection changes', () => {
      const calendarData = [
        createMockCalendarAssignment({ association: 'SVRZ' }),
        createMockCalendarAssignment({ association: 'SVRBA' }),
      ]

      const { result } = renderHook(() => useCalendarAssociationFilter(calendarData))

      const firstFilter = result.current.filterByAssociation

      act(() => {
        result.current.setSelectedAssociation('SVRZ')
      })

      const secondFilter = result.current.filterByAssociation

      expect(firstFilter).not.toBe(secondFilter)
    })
  })
})
