/**
 * Tests for authentication store
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act } from '@testing-library/react'
import {
  useAuthStore,
  getActiveAssociationCode,
  filterRefereeOccupations,
  type UserProfile,
  type Occupation,
  type AuthError,
} from './auth'

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAuthStore.getState().reset()
  })

  afterEach(() => {
    useAuthStore.getState().reset()
  })

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useAuthStore.getState()

      expect(state.status).toBe('idle')
      expect(state.user).toBeNull()
      expect(state.dataSource).toBe('api')
      expect(state.error).toBeNull()
      expect(state.activeOccupationId).toBeNull()
      expect(state.calendarCode).toBeNull()
      expect(state.isAssociationSwitching).toBe(false)
    })
  })

  describe('setUser', () => {
    it('should set user and update status to authenticated', () => {
      const user: UserProfile = {
        id: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        occupations: [{ id: 'occ-1', type: 'referee', associationCode: 'RVNO' }],
      }

      act(() => {
        useAuthStore.getState().setUser(user)
      })

      const state = useAuthStore.getState()
      expect(state.user).toEqual(user)
      expect(state.status).toBe('authenticated')
      expect(state.error).toBeNull()
      expect(state.activeOccupationId).toBe('occ-1')
    })

    it('should set first referee occupation as active by default', () => {
      const user: UserProfile = {
        id: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        occupations: [
          { id: 'occ-player', type: 'player' },
          { id: 'occ-referee', type: 'referee', associationCode: 'RVSZ' },
          { id: 'occ-linesmen', type: 'linesmen' },
        ],
      }

      act(() => {
        useAuthStore.getState().setUser(user)
      })

      const state = useAuthStore.getState()
      expect(state.activeOccupationId).toBe('occ-referee')
    })

    it('should preserve existing activeOccupationId if valid', () => {
      // First set an active occupation
      act(() => {
        useAuthStore.getState().setActiveOccupation('occ-2')
      })

      const user: UserProfile = {
        id: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        occupations: [
          { id: 'occ-1', type: 'referee' },
          { id: 'occ-2', type: 'referee' },
        ],
      }

      act(() => {
        useAuthStore.getState().setUser(user)
      })

      const state = useAuthStore.getState()
      expect(state.activeOccupationId).toBe('occ-2')
    })

    it('should fallback to first occupation if no referee type', () => {
      const user: UserProfile = {
        id: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        occupations: [
          { id: 'occ-player', type: 'player' },
          { id: 'occ-club', type: 'clubAdmin' },
        ],
      }

      act(() => {
        useAuthStore.getState().setUser(user)
      })

      const state = useAuthStore.getState()
      expect(state.activeOccupationId).toBe('occ-player')
    })

    it('should handle user with no occupations', () => {
      const user: UserProfile = {
        id: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        occupations: [],
      }

      act(() => {
        useAuthStore.getState().setUser(user)
      })

      const state = useAuthStore.getState()
      expect(state.activeOccupationId).toBeNull()
    })
  })

  describe('setStatus', () => {
    it('should update status', () => {
      act(() => {
        useAuthStore.getState().setStatus('loading')
      })

      expect(useAuthStore.getState().status).toBe('loading')

      act(() => {
        useAuthStore.getState().setStatus('error')
      })

      expect(useAuthStore.getState().status).toBe('error')
    })
  })

  describe('setError', () => {
    it('should set error and update status to error', () => {
      const error: AuthError = {
        message: 'Invalid credentials',
        code: 'invalid_credentials',
      }

      act(() => {
        useAuthStore.getState().setError(error)
      })

      const state = useAuthStore.getState()
      expect(state.error).toEqual(error)
      expect(state.status).toBe('error')
    })

    it('should clear error when set to null', () => {
      // First set an error
      act(() => {
        useAuthStore.getState().setError({ message: 'Error', code: 'unknown' })
      })

      // Then clear it
      act(() => {
        useAuthStore.getState().setError(null)
      })

      const state = useAuthStore.getState()
      expect(state.error).toBeNull()
      // Status should remain unchanged when clearing error
    })

    it('should handle error with lockedUntilSeconds', () => {
      const error: AuthError = {
        message: 'Account locked',
        code: 'locked',
        lockedUntilSeconds: 300,
      }

      act(() => {
        useAuthStore.getState().setError(error)
      })

      expect(useAuthStore.getState().error?.lockedUntilSeconds).toBe(300)
    })
  })

  describe('setDataSource', () => {
    it('should update data source', () => {
      act(() => {
        useAuthStore.getState().setDataSource('demo')
      })

      expect(useAuthStore.getState().dataSource).toBe('demo')

      act(() => {
        useAuthStore.getState().setDataSource('calendar')
      })

      expect(useAuthStore.getState().dataSource).toBe('calendar')
    })
  })

  describe('setActiveOccupation', () => {
    it('should update active occupation', () => {
      act(() => {
        useAuthStore.getState().setActiveOccupation('occ-new')
      })

      expect(useAuthStore.getState().activeOccupationId).toBe('occ-new')
    })
  })

  describe('setCalendarCode', () => {
    it('should set calendar code', () => {
      act(() => {
        useAuthStore.getState().setCalendarCode('ABC123')
      })

      expect(useAuthStore.getState().calendarCode).toBe('ABC123')
    })

    it('should clear calendar code when set to null', () => {
      act(() => {
        useAuthStore.getState().setCalendarCode('ABC123')
        useAuthStore.getState().setCalendarCode(null)
      })

      expect(useAuthStore.getState().calendarCode).toBeNull()
    })
  })

  describe('setAssociationSwitching', () => {
    it('should update association switching state', () => {
      act(() => {
        useAuthStore.getState().setAssociationSwitching(true)
      })

      expect(useAuthStore.getState().isAssociationSwitching).toBe(true)

      act(() => {
        useAuthStore.getState().setAssociationSwitching(false)
      })

      expect(useAuthStore.getState().isAssociationSwitching).toBe(false)
    })
  })

  describe('logout', () => {
    it('should reset state but preserve dataSource', () => {
      // Setup authenticated state
      act(() => {
        useAuthStore.getState().setUser({
          id: 'user-123',
          firstName: 'John',
          lastName: 'Doe',
          occupations: [{ id: 'occ-1', type: 'referee' }],
        })
        useAuthStore.getState().setDataSource('demo')
      })

      // Verify authenticated
      expect(useAuthStore.getState().status).toBe('authenticated')
      expect(useAuthStore.getState().dataSource).toBe('demo')

      // Logout
      act(() => {
        useAuthStore.getState().logout()
      })

      const state = useAuthStore.getState()
      expect(state.status).toBe('idle')
      expect(state.user).toBeNull()
      expect(state.dataSource).toBe('demo') // Preserved
      expect(state.activeOccupationId).toBeNull()
    })
  })

  describe('reset', () => {
    it('should reset to initial state including dataSource', () => {
      act(() => {
        useAuthStore.getState().setUser({
          id: 'user-123',
          firstName: 'John',
          lastName: 'Doe',
          occupations: [],
        })
        useAuthStore.getState().setDataSource('calendar')
        useAuthStore.getState().setCalendarCode('ABC123')
      })

      act(() => {
        useAuthStore.getState().reset()
      })

      const state = useAuthStore.getState()
      expect(state.status).toBe('idle')
      expect(state.user).toBeNull()
      expect(state.dataSource).toBe('api') // Reset to default
      expect(state.calendarCode).toBeNull()
    })
  })

  describe('hasMultipleAssociations', () => {
    it('should return true for user with multiple associations', () => {
      const user: UserProfile = {
        id: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        occupations: [
          { id: 'occ-1', type: 'referee', associationCode: 'RVNO' },
          { id: 'occ-2', type: 'referee', associationCode: 'RVSZ' },
        ],
      }

      act(() => {
        useAuthStore.getState().setUser(user)
      })

      expect(useAuthStore.getState().hasMultipleAssociations()).toBe(true)
    })

    it('should return false for user with single association', () => {
      const user: UserProfile = {
        id: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        occupations: [{ id: 'occ-1', type: 'referee', associationCode: 'RVNO' }],
      }

      act(() => {
        useAuthStore.getState().setUser(user)
      })

      expect(useAuthStore.getState().hasMultipleAssociations()).toBe(false)
    })

    it('should return false when user is null', () => {
      expect(useAuthStore.getState().hasMultipleAssociations()).toBe(false)
    })

    it('should count unique associations only', () => {
      const user: UserProfile = {
        id: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        occupations: [
          { id: 'occ-1', type: 'referee', associationCode: 'RVNO' },
          { id: 'occ-2', type: 'linesmen', associationCode: 'RVNO' }, // Same association
        ],
      }

      act(() => {
        useAuthStore.getState().setUser(user)
      })

      expect(useAuthStore.getState().hasMultipleAssociations()).toBe(false)
    })
  })

  describe('isCalendarMode', () => {
    it('should return true when dataSource is calendar', () => {
      act(() => {
        useAuthStore.getState().setDataSource('calendar')
      })

      expect(useAuthStore.getState().isCalendarMode()).toBe(true)
    })

    it('should return false for other data sources', () => {
      expect(useAuthStore.getState().isCalendarMode()).toBe(false)

      act(() => {
        useAuthStore.getState().setDataSource('demo')
      })

      expect(useAuthStore.getState().isCalendarMode()).toBe(false)
    })
  })

  describe('isDemoMode', () => {
    it('should return true when dataSource is demo', () => {
      act(() => {
        useAuthStore.getState().setDataSource('demo')
      })

      expect(useAuthStore.getState().isDemoMode()).toBe(true)
    })

    it('should return false for other data sources', () => {
      expect(useAuthStore.getState().isDemoMode()).toBe(false)

      act(() => {
        useAuthStore.getState().setDataSource('calendar')
      })

      expect(useAuthStore.getState().isDemoMode()).toBe(false)
    })
  })

  describe('getAuthMode', () => {
    it('should return none when not authenticated', () => {
      expect(useAuthStore.getState().getAuthMode()).toBe('none')
    })

    it('should return demo when authenticated in demo mode', () => {
      act(() => {
        useAuthStore.getState().setDataSource('demo')
        useAuthStore.getState().setUser({
          id: 'user-123',
          firstName: 'Demo',
          lastName: 'User',
          occupations: [],
        })
      })

      expect(useAuthStore.getState().getAuthMode()).toBe('demo')
    })

    it('should return calendar when authenticated in calendar mode', () => {
      act(() => {
        useAuthStore.getState().setDataSource('calendar')
        useAuthStore.getState().setUser({
          id: 'user-123',
          firstName: 'Calendar',
          lastName: 'User',
          occupations: [],
        })
      })

      expect(useAuthStore.getState().getAuthMode()).toBe('calendar')
    })

    it('should return full when authenticated with api data source', () => {
      act(() => {
        useAuthStore.getState().setUser({
          id: 'user-123',
          firstName: 'Real',
          lastName: 'User',
          occupations: [],
        })
      })

      expect(useAuthStore.getState().getAuthMode()).toBe('full')
    })
  })

  describe('getActiveOccupation', () => {
    it('should return active occupation', () => {
      const occupations: Occupation[] = [
        { id: 'occ-1', type: 'referee', associationCode: 'RVNO' },
        { id: 'occ-2', type: 'referee', associationCode: 'RVSZ' },
      ]

      act(() => {
        useAuthStore.getState().setUser({
          id: 'user-123',
          firstName: 'John',
          lastName: 'Doe',
          occupations,
        })
        useAuthStore.getState().setActiveOccupation('occ-2')
      })

      const active = useAuthStore.getState().getActiveOccupation()
      expect(active?.id).toBe('occ-2')
      expect(active?.associationCode).toBe('RVSZ')
    })

    it('should return null when user is null', () => {
      expect(useAuthStore.getState().getActiveOccupation()).toBeNull()
    })

    it('should return null when activeOccupationId is null', () => {
      act(() => {
        useAuthStore.getState().setUser({
          id: 'user-123',
          firstName: 'John',
          lastName: 'Doe',
          occupations: [{ id: 'occ-1', type: 'referee' }],
        })
        // Manually set to null (edge case)
        useAuthStore.setState({ activeOccupationId: null })
      })

      expect(useAuthStore.getState().getActiveOccupation()).toBeNull()
    })

    it('should return null when occupation not found', () => {
      act(() => {
        useAuthStore.getState().setUser({
          id: 'user-123',
          firstName: 'John',
          lastName: 'Doe',
          occupations: [{ id: 'occ-1', type: 'referee' }],
        })
        useAuthStore.getState().setActiveOccupation('non-existent')
      })

      expect(useAuthStore.getState().getActiveOccupation()).toBeNull()
    })
  })
})

describe('getActiveAssociationCode', () => {
  beforeEach(() => {
    useAuthStore.getState().reset()
  })

  afterEach(() => {
    useAuthStore.getState().reset()
  })

  it('should return association code from active occupation', () => {
    act(() => {
      useAuthStore.getState().setUser({
        id: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        occupations: [{ id: 'occ-1', type: 'referee', associationCode: 'RVNO' }],
      })
    })

    expect(getActiveAssociationCode()).toBe('RVNO')
  })

  it('should return undefined when no active occupation', () => {
    expect(getActiveAssociationCode()).toBeUndefined()
  })
})

describe('filterRefereeOccupations', () => {
  it('should filter to only referee and linesmen types', () => {
    const occupations: Occupation[] = [
      { id: '1', type: 'referee', associationCode: 'RVNO' },
      { id: '2', type: 'player' },
      { id: '3', type: 'linesmen' },
      { id: '4', type: 'clubAdmin' },
      { id: '5', type: 'associationAdmin' },
    ]

    const filtered = filterRefereeOccupations(occupations)

    expect(filtered).toHaveLength(2)
    expect(filtered.map((o) => o.type)).toEqual(['referee', 'linesmen'])
  })

  it('should return empty array when no referee occupations', () => {
    const occupations: Occupation[] = [
      { id: '1', type: 'player' },
      { id: '2', type: 'clubAdmin' },
    ]

    expect(filterRefereeOccupations(occupations)).toEqual([])
  })

  it('should return empty array for empty input', () => {
    expect(filterRefereeOccupations([])).toEqual([])
  })
})
