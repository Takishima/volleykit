import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { setLocale } from '@/i18n'
import { useAuthStore } from '@/shared/stores/auth'
import { useDemoStore } from '@/shared/stores/demo'
import {
  useSettingsStore,
  DEMO_HOME_LOCATION,
  DEFAULT_MAX_DISTANCE_KM,
  DEFAULT_MAX_TRAVEL_TIME_MINUTES,
} from '@/shared/stores/settings'
import { useToastStore } from '@/shared/stores/toast'

import { SettingsPage } from './SettingsPage'

/**
 * Settings Integration Tests
 *
 * Tests the settings page workflow including:
 * - Settings changes propagating to stores
 * - Mode-specific settings (API vs demo mode)
 * - Safe mode toggle affecting validation behavior
 * - Home location changes affecting distance/travel filters
 * - Demo mode specific sections
 * - Logout flow from settings
 */

describe('Settings Integration', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    setLocale('en')
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    // Reset stores to initial state
    useAuthStore.setState({
      status: 'idle',
      user: null,
      dataSource: 'api',
      activeOccupationId: null,
      isAssociationSwitching: false,
      error: null,
      csrfToken: null,
      calendarCode: null,
      eligibleAttributeValues: null,
      groupedEligibleAttributeValues: null,
      eligibleRoles: null,
      _checkSessionPromise: null,
      _lastAuthTimestamp: null,
    })
    useDemoStore.getState().clearDemoData()
    useToastStore.getState().clearToasts()

    // Reset settings store - need to reset the persisted state
    useSettingsStore.setState({
      isSafeModeEnabled: true,
      isOCREnabled: false,
      preventZoom: false,
      currentMode: 'api',
      homeLocation: null,
      distanceFilter: {
        enabled: false,
        maxDistanceKm: DEFAULT_MAX_DISTANCE_KM,
      },
      distanceFilterByAssociation: {},
      transportEnabled: false,
      transportEnabledByAssociation: {},
      travelTimeFilter: {
        enabled: false,
        maxTravelTimeMinutes: DEFAULT_MAX_TRAVEL_TIME_MINUTES,
        maxTravelTimeByAssociation: {},
        arrivalBufferMinutes: 30,
        arrivalBufferByAssociation: {},
        cacheInvalidatedAt: null,
        sbbDestinationType: 'address',
      },
      levelFilterEnabled: false,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    queryClient.clear()
    useToastStore.getState().clearToasts()
  })

  function renderSettingsPage() {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  describe('demo mode specific sections', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('shows demo section when in demo mode', async () => {
      renderSettingsPage()

      // Demo section should be visible - look for the heading specifically
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Demo Data/i })).toBeInTheDocument()
      })
    })

    it('shows refresh data button in demo mode', async () => {
      renderSettingsPage()

      await waitFor(() => {
        const refreshButton = screen.queryByRole('button', { name: /reset.*demo.*data/i })
        expect(refreshButton).toBeInTheDocument()
      })
    })

    it('hides data protection section in demo mode', async () => {
      renderSettingsPage()

      await waitFor(() => {
        // Data protection section should NOT be visible in demo mode
        expect(screen.queryByText(/Safe Mode/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('API mode specific sections', () => {
    beforeEach(() => {
      useAuthStore.setState({
        status: 'authenticated',
        dataSource: 'api',
        user: {
          firstName: 'Test',
          lastName: 'User',
          occupations: [
            {
              id: 'occ-1',
              type: 'referee',
              attributeValueName: 'Referee',
              associationCode: 'SV',
            },
          ],
        },
        activeOccupationId: 'occ-1',
      })
    })

    it('safe mode state is readable in API mode', () => {
      // When in API mode, safe mode setting should be accessible
      // Default should be true (safe mode enabled)
      expect(useSettingsStore.getState().isSafeModeEnabled).toBe(true)

      // Toggle should work
      useSettingsStore.getState().setSafeMode(false)
      expect(useSettingsStore.getState().isSafeModeEnabled).toBe(false)
    })

    it('hides demo section in API mode', async () => {
      renderSettingsPage()

      await waitFor(() => {
        // Demo section should NOT be visible
        expect(screen.queryByText(/Demo Data/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('safe mode toggle', () => {
    beforeEach(() => {
      useAuthStore.setState({
        status: 'authenticated',
        dataSource: 'api',
        user: {
          firstName: 'Test',
          lastName: 'User',
          occupations: [
            {
              id: 'occ-1',
              type: 'referee',
              attributeValueName: 'Referee',
              associationCode: 'SV',
            },
          ],
        },
        activeOccupationId: 'occ-1',
      })
    })

    it('toggles safe mode in settings store', () => {
      // Test store mutation directly (more reliable than UI)
      // Verify initial state
      expect(useSettingsStore.getState().isSafeModeEnabled).toBe(true)

      // Toggle via store setter
      useSettingsStore.getState().setSafeMode(false)

      // Verify change
      expect(useSettingsStore.getState().isSafeModeEnabled).toBe(false)

      // Toggle back
      useSettingsStore.getState().setSafeMode(true)
      expect(useSettingsStore.getState().isSafeModeEnabled).toBe(true)
    })
  })

  describe('home location and filters', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('displays home location section', async () => {
      renderSettingsPage()

      await waitFor(
        () => {
          expect(screen.getByRole('heading', { name: /Home Location/i })).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })

    it('setting home location invalidates travel time cache', async () => {
      // Get initial cache timestamp
      const initialCacheTimestamp = useSettingsStore.getState().travelTimeFilter.cacheInvalidatedAt

      // Set home location
      useSettingsStore.getState().setHomeLocation(DEMO_HOME_LOCATION)

      // Cache should be invalidated
      const newCacheTimestamp = useSettingsStore.getState().travelTimeFilter.cacheInvalidatedAt
      expect(newCacheTimestamp).not.toBe(initialCacheTimestamp)
      expect(newCacheTimestamp).toBeDefined()
    })

    it('home location is persisted per mode', () => {
      // Set home location in demo mode
      useSettingsStore.getState()._setCurrentMode('demo')
      useSettingsStore.getState().setHomeLocation(DEMO_HOME_LOCATION)

      // Verify it's set for demo mode
      expect(useSettingsStore.getState().homeLocation).toEqual(DEMO_HOME_LOCATION)
      expect(useSettingsStore.getState().settingsByMode.demo.homeLocation).toEqual(
        DEMO_HOME_LOCATION
      )

      // Switch to API mode
      useSettingsStore.getState()._setCurrentMode('api')

      // API mode should have no location (different from demo)
      expect(useSettingsStore.getState().homeLocation).toBeNull()

      // Switch back to demo mode
      useSettingsStore.getState()._setCurrentMode('demo')

      // Demo location should still be there
      expect(useSettingsStore.getState().homeLocation).toEqual(DEMO_HOME_LOCATION)
    })
  })

  describe('travel settings', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('displays travel settings section', async () => {
      renderSettingsPage()

      await waitFor(() => {
        // Travel settings should be visible - uses "Travel" or "Transport" in heading
        expect(screen.getByText(/Travel Settings|Transport/i)).toBeInTheDocument()
      })
    })

    it('per-association travel time overrides work correctly', () => {
      const customMinutes = 90

      // Set max travel time for SV association
      useSettingsStore.getState().setMaxTravelTimeForAssociation('SV', customMinutes)

      // Get travel time for SV - should return custom value
      expect(useSettingsStore.getState().getMaxTravelTimeForAssociation('SV')).toBe(customMinutes)

      // Get travel time for different association - should return default
      expect(useSettingsStore.getState().getMaxTravelTimeForAssociation('SVRBA')).toBe(
        DEFAULT_MAX_TRAVEL_TIME_MINUTES
      )
    })

    it('per-association arrival buffer overrides work correctly', () => {
      const customBuffer = 45

      // Set arrival buffer for SV association
      useSettingsStore.getState().setArrivalBufferForAssociation('SV', customBuffer)

      // Get arrival buffer for SV - should return custom value
      expect(useSettingsStore.getState().getArrivalBufferForAssociation('SV')).toBe(customBuffer)

      // Get arrival buffer for different association - should return default (60 for SV, 45 for regional)
      expect(useSettingsStore.getState().getArrivalBufferForAssociation('SVRBA')).toBe(45) // regional default
    })
  })

  describe('distance filter', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('per-association distance filter overrides work correctly', () => {
      const customDistance = 30

      // Set distance filter for SV association
      useSettingsStore.getState().setDistanceFilterForAssociation('SV', {
        enabled: true,
        maxDistanceKm: customDistance,
      })

      // Get distance filter for SV - should return custom value
      const svFilter = useSettingsStore.getState().getDistanceFilterForAssociation('SV')
      expect(svFilter.enabled).toBe(true)
      expect(svFilter.maxDistanceKm).toBe(customDistance)

      // Get distance filter for different association - should return default
      const otherFilter = useSettingsStore.getState().getDistanceFilterForAssociation('SVRBA')
      expect(otherFilter.enabled).toBe(false)
      expect(otherFilter.maxDistanceKm).toBe(DEFAULT_MAX_DISTANCE_KM)
    })

    it('global distance filter is used when no per-association override exists', () => {
      // Reset the distanceFilter to default state first
      useSettingsStore.setState({
        distanceFilter: { enabled: false, maxDistanceKm: DEFAULT_MAX_DISTANCE_KM },
        distanceFilterByAssociation: {},
      })

      // Set global distance filter
      useSettingsStore.getState().setDistanceFilterEnabled(true)
      useSettingsStore.getState().setMaxDistanceKm(75)

      // Get filter for association without override - should fall back to global
      const filter = useSettingsStore.getState().getDistanceFilterForAssociation('SV')
      expect(filter.enabled).toBe(true)
      expect(filter.maxDistanceKm).toBe(75)
    })
  })

  describe('mode switching and settings isolation', () => {
    it('settings are isolated between API and demo modes', () => {
      // Ensure we have fresh default state for settingsByMode
      const defaultModeSettings = {
        homeLocation: null,
        distanceFilter: { enabled: false, maxDistanceKm: DEFAULT_MAX_DISTANCE_KM },
        distanceFilterByAssociation: {},
        transportEnabled: false,
        transportEnabledByAssociation: {},
        travelTimeFilter: {
          enabled: false,
          maxTravelTimeMinutes: DEFAULT_MAX_TRAVEL_TIME_MINUTES,
          maxTravelTimeByAssociation: {},
          arrivalBufferMinutes: 30,
          arrivalBufferByAssociation: {},
          cacheInvalidatedAt: null,
          sbbDestinationType: 'address' as const,
        },
        levelFilterEnabled: false,
        notificationSettings: {
          enabled: false,
          reminderTimes: ['1h' as const],
          deliveryPreference: 'native' as const,
        },
        gameGapFilter: { enabled: false, minGapMinutes: 120 },
        hideOwnExchangesByAssociation: {},
      }

      // Reset settingsByMode to ensure clean state
      useSettingsStore.setState({
        currentMode: 'api',
        settingsByMode: {
          api: { ...defaultModeSettings },
          demo: { ...defaultModeSettings },
          calendar: { ...defaultModeSettings },
        },
        ...defaultModeSettings,
      })

      // Configure settings in API mode
      useSettingsStore.getState()._setCurrentMode('api')
      useSettingsStore.getState().setDistanceFilterEnabled(true)
      useSettingsStore.getState().setMaxDistanceKm(100)

      // Verify API mode settings
      expect(useSettingsStore.getState().distanceFilter.enabled).toBe(true)
      expect(useSettingsStore.getState().distanceFilter.maxDistanceKm).toBe(100)

      // Switch to demo mode
      useSettingsStore.getState()._setCurrentMode('demo')

      // Demo mode should have default settings (isolated from API)
      expect(useSettingsStore.getState().distanceFilter.enabled).toBe(false)
      expect(useSettingsStore.getState().distanceFilter.maxDistanceKm).toBe(DEFAULT_MAX_DISTANCE_KM)

      // Modify demo mode settings
      useSettingsStore.getState().setDistanceFilterEnabled(true)
      useSettingsStore.getState().setMaxDistanceKm(25)

      // Switch back to API mode
      useSettingsStore.getState()._setCurrentMode('api')

      // API mode settings should be preserved
      expect(useSettingsStore.getState().distanceFilter.enabled).toBe(true)
      expect(useSettingsStore.getState().distanceFilter.maxDistanceKm).toBe(100)
    })

    it('global settings are shared across modes', () => {
      // Safe mode is a global setting
      expect(useSettingsStore.getState().isSafeModeEnabled).toBe(true)

      // Change in API mode
      useSettingsStore.getState()._setCurrentMode('api')
      useSettingsStore.getState().setSafeMode(false)

      // Should still be false in demo mode
      useSettingsStore.getState()._setCurrentMode('demo')
      expect(useSettingsStore.getState().isSafeModeEnabled).toBe(false)
    })
  })

  describe('logout flow', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('displays logout button', async () => {
      renderSettingsPage()

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /logout|sign out/i })).toBeInTheDocument()
      })
    })

    it('calls logout when button is clicked', async () => {
      const user = userEvent.setup()
      renderSettingsPage()

      // Find and click logout button
      const logoutButton = await screen.findByRole('button', { name: /logout|sign out/i })
      await user.click(logoutButton)

      // Auth store should be reset
      await waitFor(() => {
        expect(useAuthStore.getState().status).toBe('idle')
      })
    })

    it('clears demo data on logout', async () => {
      const user = userEvent.setup()

      // Verify demo data exists
      expect(useDemoStore.getState().assignments.length).toBeGreaterThan(0)

      renderSettingsPage()

      const logoutButton = await screen.findByRole('button', { name: /logout|sign out/i })
      await user.click(logoutButton)

      // Demo store should be cleared
      await waitFor(() => {
        expect(useDemoStore.getState().assignments.length).toBe(0)
      })
    })
  })

  describe('profile section', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
    })

    it('displays user name in profile section', async () => {
      renderSettingsPage()

      await waitFor(() => {
        // Demo user name should be visible
        expect(screen.getByText(/Demo User/i)).toBeInTheDocument()
      })
    })
  })

  describe('preferences section', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('displays preferences section', async () => {
      renderSettingsPage()

      await waitFor(
        () => {
          expect(screen.getByRole('heading', { name: /Preferences/i })).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })

    it('prevent zoom toggle updates settings store', () => {
      // Test store mutation directly (more reliable than UI)
      // Initial state
      expect(useSettingsStore.getState().preventZoom).toBe(false)

      // Toggle via store setter
      useSettingsStore.getState().setPreventZoom(true)

      // Verify change
      expect(useSettingsStore.getState().preventZoom).toBe(true)

      // Toggle back
      useSettingsStore.getState().setPreventZoom(false)
      expect(useSettingsStore.getState().preventZoom).toBe(false)
    })
  })

  describe('hide own exchanges setting', () => {
    it('per-association hide own exchanges setting works correctly', () => {
      // Default should be true (hide own exchanges)
      expect(useSettingsStore.getState().isHideOwnExchangesForAssociation('SV')).toBe(true)

      // Disable for SV
      useSettingsStore.getState().setHideOwnExchangesForAssociation('SV', false)

      // SV should now be false
      expect(useSettingsStore.getState().isHideOwnExchangesForAssociation('SV')).toBe(false)

      // Other associations should still default to true
      expect(useSettingsStore.getState().isHideOwnExchangesForAssociation('SVRBA')).toBe(true)
    })
  })

  describe('game gap filter', () => {
    it('game gap filter settings work correctly', () => {
      // Default state
      expect(useSettingsStore.getState().gameGapFilter.enabled).toBe(false)
      expect(useSettingsStore.getState().gameGapFilter.minGapMinutes).toBe(120)

      // Enable and set custom gap
      useSettingsStore.getState().setGameGapFilterEnabled(true)
      useSettingsStore.getState().setMinGameGapMinutes(180)

      // Verify changes
      expect(useSettingsStore.getState().gameGapFilter.enabled).toBe(true)
      expect(useSettingsStore.getState().gameGapFilter.minGapMinutes).toBe(180)
    })
  })

  describe('notification settings', () => {
    it('notification settings work correctly', () => {
      // Default state
      expect(useSettingsStore.getState().notificationSettings.enabled).toBe(false)
      expect(useSettingsStore.getState().notificationSettings.deliveryPreference).toBe('native')

      // Enable notifications
      useSettingsStore.getState().setNotificationsEnabled(true)
      expect(useSettingsStore.getState().notificationSettings.enabled).toBe(true)

      // Set reminder times
      useSettingsStore.getState().setNotificationReminderTimes(['1h', '24h'])
      expect(useSettingsStore.getState().notificationSettings.reminderTimes).toEqual(['1h', '24h'])

      // Set delivery preference
      useSettingsStore.getState().setNotificationDeliveryPreference('in-app')
      expect(useSettingsStore.getState().notificationSettings.deliveryPreference).toBe('in-app')
    })
  })

  describe('SBB destination type', () => {
    it('SBB destination type setting works correctly', () => {
      // Default state
      expect(useSettingsStore.getState().travelTimeFilter.sbbDestinationType).toBe('address')

      // Change to station
      useSettingsStore.getState().setSbbDestinationType('station')
      expect(useSettingsStore.getState().travelTimeFilter.sbbDestinationType).toBe('station')

      // Change back to address
      useSettingsStore.getState().setSbbDestinationType('address')
      expect(useSettingsStore.getState().travelTimeFilter.sbbDestinationType).toBe('address')
    })
  })

  describe('transport enabled per association', () => {
    it('transport enabled per association works correctly', () => {
      // Default: falls back to global transportEnabled (false)
      expect(useSettingsStore.getState().isTransportEnabledForAssociation('SV')).toBe(false)

      // Enable for SV
      useSettingsStore.getState().setTransportEnabledForAssociation('SV', true)
      expect(useSettingsStore.getState().isTransportEnabledForAssociation('SV')).toBe(true)

      // Other associations still fall back to global
      expect(useSettingsStore.getState().isTransportEnabledForAssociation('SVRBA')).toBe(false)

      // Enable global
      useSettingsStore.getState().setTransportEnabled(true)
      expect(useSettingsStore.getState().isTransportEnabledForAssociation('SVRBA')).toBe(true)
    })
  })
})
