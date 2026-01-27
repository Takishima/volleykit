/**
 * Store Cross-Interactions Integration Tests
 *
 * Tests the coordination between multiple Zustand stores:
 * - Auth + Demo store interactions
 * - Store reset coordination during logout
 * - Demo mode activation flows
 * - Settings store interactions (if applicable)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act } from '@testing-library/react'

import { useAuthStore } from './auth'
import { useDemoStore } from './demo'
import { useSettingsStore } from './settings'

describe('Auth + Demo Store Integration', () => {
  beforeEach(() => {
    useAuthStore.getState().reset()
    useDemoStore.getState().setDemoMode(false)
    useSettingsStore.getState().reset()
  })

  afterEach(() => {
    useAuthStore.getState().reset()
    useDemoStore.getState().setDemoMode(false)
    useSettingsStore.getState().reset()
  })

  describe('demo mode activation flow', () => {
    it('should coordinate auth and demo stores when entering demo mode', () => {
      // Step 1: Enable demo mode in demo store
      act(() => {
        useDemoStore.getState().setDemoMode(true)
      })

      expect(useDemoStore.getState().isDemoMode).toBe(true)

      // Step 2: Set auth store data source to demo
      act(() => {
        useAuthStore.getState().setDataSource('demo')
      })

      expect(useAuthStore.getState().dataSource).toBe('demo')
      expect(useAuthStore.getState().isDemoMode()).toBe(true)

      // Step 3: Set demo user in auth store
      act(() => {
        useAuthStore.getState().setUser({
          id: 'demo-user',
          firstName: 'Demo',
          lastName: 'User',
          occupations: [
            { id: 'demo-occ-sv', type: 'referee', associationCode: 'SV' },
            { id: 'demo-occ-rvno', type: 'referee', associationCode: 'RVNO' },
          ],
        })
      })

      // Verify coordinated state
      expect(useAuthStore.getState().status).toBe('authenticated')
      expect(useAuthStore.getState().getAuthMode()).toBe('demo')
      expect(useDemoStore.getState().isDemoMode).toBe(true)
    })

    it('should toggle demo mode correctly', () => {
      expect(useDemoStore.getState().isDemoMode).toBe(false)

      act(() => {
        useDemoStore.getState().toggleDemoMode()
      })

      expect(useDemoStore.getState().isDemoMode).toBe(true)

      act(() => {
        useDemoStore.getState().toggleDemoMode()
      })

      expect(useDemoStore.getState().isDemoMode).toBe(false)
    })
  })

  describe('logout flow coordination', () => {
    it('should coordinate store resets on logout', () => {
      // Setup authenticated demo state
      act(() => {
        useDemoStore.getState().setDemoMode(true)
        useAuthStore.getState().setDataSource('demo')
        useAuthStore.getState().setUser({
          id: 'demo-user',
          firstName: 'Demo',
          lastName: 'User',
          occupations: [{ id: 'occ-1', type: 'referee', associationCode: 'SV' }],
        })
      })

      expect(useAuthStore.getState().status).toBe('authenticated')
      expect(useDemoStore.getState().isDemoMode).toBe(true)

      // Logout from auth store
      act(() => {
        useAuthStore.getState().logout()
      })

      // Auth should be cleared but dataSource preserved
      expect(useAuthStore.getState().status).toBe('idle')
      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().dataSource).toBe('demo') // Preserved

      // Demo store should be cleared separately (by the app)
      act(() => {
        useDemoStore.getState().setDemoMode(false)
      })

      expect(useDemoStore.getState().isDemoMode).toBe(false)
    })

    it('should handle full reset across stores', () => {
      // Setup state across stores
      act(() => {
        useAuthStore.getState().setUser({
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
          occupations: [{ id: 'occ-1', type: 'referee' }],
        })
        useDemoStore.getState().setDemoMode(true)
        useSettingsStore.getState().setLanguage('fr')
      })

      // Full reset
      act(() => {
        useAuthStore.getState().reset()
        useDemoStore.getState().setDemoMode(false)
        useSettingsStore.getState().reset()
      })

      expect(useAuthStore.getState().status).toBe('idle')
      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().dataSource).toBe('api')
      expect(useDemoStore.getState().isDemoMode).toBe(false)
      expect(useSettingsStore.getState().language).toBe('de')
    })
  })

  describe('data source transitions', () => {
    it('should transition from API to demo mode', () => {
      // Start in API mode (authenticated)
      act(() => {
        useAuthStore.getState().setUser({
          id: 'api-user',
          firstName: 'Real',
          lastName: 'User',
          occupations: [{ id: 'api-occ', type: 'referee', associationCode: 'SV' }],
        })
      })

      expect(useAuthStore.getState().dataSource).toBe('api')
      expect(useAuthStore.getState().getAuthMode()).toBe('full')

      // Logout and switch to demo
      act(() => {
        useAuthStore.getState().logout()
      })

      expect(useAuthStore.getState().status).toBe('idle')

      // Switch to demo mode
      act(() => {
        useDemoStore.getState().setDemoMode(true)
        useAuthStore.getState().setDataSource('demo')
        useAuthStore.getState().setUser({
          id: 'demo-user',
          firstName: 'Demo',
          lastName: 'User',
          occupations: [{ id: 'demo-occ', type: 'referee', associationCode: 'SV' }],
        })
      })

      expect(useAuthStore.getState().getAuthMode()).toBe('demo')
      expect(useDemoStore.getState().isDemoMode).toBe(true)
    })

    it('should transition from demo to calendar mode', () => {
      // Start in demo mode
      act(() => {
        useDemoStore.getState().setDemoMode(true)
        useAuthStore.getState().setDataSource('demo')
        useAuthStore.getState().setUser({
          id: 'demo-user',
          firstName: 'Demo',
          lastName: 'User',
          occupations: [],
        })
      })

      expect(useAuthStore.getState().getAuthMode()).toBe('demo')

      // Logout from demo
      act(() => {
        useAuthStore.getState().logout()
        useDemoStore.getState().setDemoMode(false)
      })

      // Switch to calendar mode
      act(() => {
        useAuthStore.getState().setDataSource('calendar')
        useAuthStore.getState().setCalendarCode('ABC123')
        useAuthStore.getState().setUser({
          id: 'calendar-user',
          firstName: 'Calendar',
          lastName: 'User',
          occupations: [{ id: 'cal-occ', type: 'referee' }],
        })
      })

      expect(useAuthStore.getState().getAuthMode()).toBe('calendar')
      expect(useAuthStore.getState().calendarCode).toBe('ABC123')
      expect(useDemoStore.getState().isDemoMode).toBe(false)
    })
  })
})

describe('Auth + Settings Store Integration', () => {
  beforeEach(() => {
    useAuthStore.getState().reset()
    useSettingsStore.getState().reset()
  })

  afterEach(() => {
    useAuthStore.getState().reset()
    useSettingsStore.getState().reset()
  })

  it('should preserve settings across auth state changes', () => {
    // Set language preference
    act(() => {
      useSettingsStore.getState().setLanguage('fr')
    })

    expect(useSettingsStore.getState().language).toBe('fr')

    // Authenticate
    act(() => {
      useAuthStore.getState().setUser({
        id: 'user-1',
        firstName: 'Jean',
        lastName: 'Dupont',
        occupations: [{ id: 'occ-1', type: 'referee' }],
      })
    })

    expect(useAuthStore.getState().status).toBe('authenticated')
    expect(useSettingsStore.getState().language).toBe('fr') // Preserved

    // Logout
    act(() => {
      useAuthStore.getState().logout()
    })

    expect(useAuthStore.getState().status).toBe('idle')
    expect(useSettingsStore.getState().language).toBe('fr') // Still preserved
  })

  it('should allow independent settings updates while authenticated', () => {
    // Authenticate
    act(() => {
      useAuthStore.getState().setUser({
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        occupations: [{ id: 'occ-1', type: 'referee' }],
      })
    })

    // Change settings while authenticated
    act(() => {
      useSettingsStore.getState().setLanguage('it')
      useSettingsStore.getState().setBiometricEnabled(true)
    })

    expect(useSettingsStore.getState().language).toBe('it')
    expect(useSettingsStore.getState().biometricEnabled).toBe(true)

    // Auth state unchanged
    expect(useAuthStore.getState().status).toBe('authenticated')
    expect(useAuthStore.getState().user?.firstName).toBe('John')
  })
})

describe('Association switching coordination', () => {
  beforeEach(() => {
    useAuthStore.getState().reset()
  })

  afterEach(() => {
    useAuthStore.getState().reset()
  })

  it('should set association switching flag during switch', () => {
    act(() => {
      useAuthStore.getState().setUser({
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        occupations: [
          { id: 'occ-sv', type: 'referee', associationCode: 'SV' },
          { id: 'occ-rvno', type: 'referee', associationCode: 'RVNO' },
        ],
      })
    })

    expect(useAuthStore.getState().isAssociationSwitching).toBe(false)

    // Start switching
    act(() => {
      useAuthStore.getState().setAssociationSwitching(true)
    })

    expect(useAuthStore.getState().isAssociationSwitching).toBe(true)

    // Change occupation
    act(() => {
      useAuthStore.getState().setActiveOccupation('occ-rvno')
    })

    expect(useAuthStore.getState().activeOccupationId).toBe('occ-rvno')
    expect(useAuthStore.getState().getActiveOccupation()?.associationCode).toBe('RVNO')

    // Finish switching
    act(() => {
      useAuthStore.getState().setAssociationSwitching(false)
    })

    expect(useAuthStore.getState().isAssociationSwitching).toBe(false)
  })

  it('should update active occupation and reflect in getters', () => {
    act(() => {
      useAuthStore.getState().setUser({
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        occupations: [
          { id: 'occ-1', type: 'referee', associationCode: 'SV', level: 'National' },
          { id: 'occ-2', type: 'referee', associationCode: 'RVNO', level: 'Regional' },
        ],
      })
    })

    // First occupation selected by default (referee type)
    let activeOcc = useAuthStore.getState().getActiveOccupation()
    expect(activeOcc?.id).toBe('occ-1')
    expect(activeOcc?.associationCode).toBe('SV')

    // Switch occupation
    act(() => {
      useAuthStore.getState().setActiveOccupation('occ-2')
    })

    activeOcc = useAuthStore.getState().getActiveOccupation()
    expect(activeOcc?.id).toBe('occ-2')
    expect(activeOcc?.associationCode).toBe('RVNO')
    expect(activeOcc?.level).toBe('Regional')
  })
})
