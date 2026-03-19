import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { useEasterEggDetection } from './useEasterEggDetection'

import type { ParsedGameSheet, ParsedTeam, OfficialRole } from '../types'

/** Helper to create a team with specific officials */
function createTeam(officials: Array<{ role: OfficialRole; name: string }> = []): ParsedTeam {
  return {
    name: 'Test Team',
    players: [],
    officials: officials.map((o) => ({
      role: o.role,
      firstName: o.name.split(' ')[0] ?? '',
      lastName: o.name.split(' ')[1] ?? '',
      displayName: o.name,
      rawName: o.name,
    })),
  }
}

/** Helper to create a game sheet with two teams */
function createGameSheet(
  teamAOfficials: Array<{ role: OfficialRole; name: string }> = [],
  teamBOfficials: Array<{ role: OfficialRole; name: string }> = []
): ParsedGameSheet {
  return {
    teamA: createTeam(teamAOfficials),
    teamB: createTeam(teamBOfficials),
    warnings: [],
  }
}

describe('useEasterEggDetection', () => {
  it('should initialize with closed state', () => {
    const { result } = renderHook(() => useEasterEggDetection())

    expect(result.current.easterEgg.isOpen).toBe(false)
    expect(result.current.easterEgg.type).toBeNull()
  })

  describe('AC3 detection', () => {
    it('should detect AC3 in team A', () => {
      const { result } = renderHook(() => useEasterEggDetection())
      const gameSheet = createGameSheet([
        { role: 'C', name: 'Head Coach' },
        { role: 'AC', name: 'Assistant 1' },
        { role: 'AC2', name: 'Assistant 2' },
        { role: 'AC3', name: 'Assistant 3' },
      ])

      act(() => {
        result.current.checkForEasterEggs(gameSheet)
      })

      expect(result.current.easterEgg.isOpen).toBe(true)
      expect(result.current.easterEgg.type).toBe('ac3')
    })

    it('should detect AC3 in team B', () => {
      const { result } = renderHook(() => useEasterEggDetection())
      const gameSheet = createGameSheet(
        [],
        [
          { role: 'C', name: 'Head Coach' },
          { role: 'AC3', name: 'Third Assistant' },
        ]
      )

      act(() => {
        result.current.checkForEasterEggs(gameSheet)
      })

      expect(result.current.easterEgg.isOpen).toBe(true)
      expect(result.current.easterEgg.type).toBe('ac3')
    })

    it('should not trigger for AC or AC2 only', () => {
      const { result } = renderHook(() => useEasterEggDetection())
      const gameSheet = createGameSheet([
        { role: 'C', name: 'Head Coach' },
        { role: 'AC', name: 'Assistant 1' },
        { role: 'AC2', name: 'Assistant 2' },
      ])

      act(() => {
        result.current.checkForEasterEggs(gameSheet)
      })

      expect(result.current.easterEgg.isOpen).toBe(false)
      expect(result.current.easterEgg.type).toBeNull()
    })
  })

  describe('multiple doctors detection', () => {
    it('should detect 2+ doctors in team A', () => {
      const { result } = renderHook(() => useEasterEggDetection())
      const gameSheet = createGameSheet([
        { role: 'C', name: 'Head Coach' },
        { role: 'M', name: 'Doctor 1' },
        { role: 'M', name: 'Doctor 2' },
      ])

      act(() => {
        result.current.checkForEasterEggs(gameSheet)
      })

      expect(result.current.easterEgg.isOpen).toBe(true)
      expect(result.current.easterEgg.type).toBe('multipleDoctors')
    })

    it('should detect 2+ doctors in team B', () => {
      const { result } = renderHook(() => useEasterEggDetection())
      const gameSheet = createGameSheet(
        [],
        [
          { role: 'M', name: 'Doctor 1' },
          { role: 'M', name: 'Doctor 2' },
          { role: 'M', name: 'Doctor 3' },
        ]
      )

      act(() => {
        result.current.checkForEasterEggs(gameSheet)
      })

      expect(result.current.easterEgg.isOpen).toBe(true)
      expect(result.current.easterEgg.type).toBe('multipleDoctors')
    })

    it('should not trigger for single doctor', () => {
      const { result } = renderHook(() => useEasterEggDetection())
      const gameSheet = createGameSheet([
        { role: 'C', name: 'Head Coach' },
        { role: 'M', name: 'Doctor 1' },
      ])

      act(() => {
        result.current.checkForEasterEggs(gameSheet)
      })

      expect(result.current.easterEgg.isOpen).toBe(false)
      expect(result.current.easterEgg.type).toBeNull()
    })
  })

  describe('priority', () => {
    it('should prioritize AC3 over multiple doctors', () => {
      const { result } = renderHook(() => useEasterEggDetection())
      const gameSheet = createGameSheet([
        { role: 'AC3', name: 'Third Assistant' },
        { role: 'M', name: 'Doctor 1' },
        { role: 'M', name: 'Doctor 2' },
      ])

      act(() => {
        result.current.checkForEasterEggs(gameSheet)
      })

      expect(result.current.easterEgg.type).toBe('ac3')
    })
  })

  describe('dismiss', () => {
    it('should close the Easter egg modal when dismissed', () => {
      const { result } = renderHook(() => useEasterEggDetection())
      const gameSheet = createGameSheet([{ role: 'AC3', name: 'Third Assistant' }])

      act(() => {
        result.current.checkForEasterEggs(gameSheet)
      })

      expect(result.current.easterEgg.isOpen).toBe(true)

      act(() => {
        result.current.dismissEasterEgg()
      })

      expect(result.current.easterEgg.isOpen).toBe(false)
      expect(result.current.easterEgg.type).toBeNull()
    })
  })

  describe('no Easter eggs', () => {
    it('should not trigger for empty officials', () => {
      const { result } = renderHook(() => useEasterEggDetection())
      const gameSheet = createGameSheet([], [])

      act(() => {
        result.current.checkForEasterEggs(gameSheet)
      })

      expect(result.current.easterEgg.isOpen).toBe(false)
      expect(result.current.easterEgg.type).toBeNull()
    })

    it('should not trigger for standard coaching staff', () => {
      const { result } = renderHook(() => useEasterEggDetection())
      const gameSheet = createGameSheet(
        [
          { role: 'C', name: 'Head Coach' },
          { role: 'AC', name: 'Assistant' },
        ],
        [
          { role: 'C', name: 'Head Coach B' },
          { role: 'AC', name: 'Assistant B' },
          { role: 'M', name: 'Doctor' },
        ]
      )

      act(() => {
        result.current.checkForEasterEggs(gameSheet)
      })

      expect(result.current.easterEgg.isOpen).toBe(false)
      expect(result.current.easterEgg.type).toBeNull()
    })
  })
})
