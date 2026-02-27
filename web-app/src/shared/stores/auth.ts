import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { clearSession, setCsrfToken } from '@/api/client'
import { fetchCalendarAssignments } from '@/features/assignments/api/calendar-api'
import {
  hasMultipleAssociations,
  type AttributeValue,
  type RoleDefinition,
} from '@/features/auth/utils/active-party-parser'
import {
  performApiLogin,
  performApiLogout,
  performApiSessionCheck,
  filterRefereeOccupations,
  SESSION_CHECK_GRACE_PERIOD_MS,
} from '@/features/auth/utils/api-auth-flow'
import { logger } from '@/shared/utils/logger'

import { useDemoStore } from './demo'
import { useSettingsStore, DEMO_HOME_LOCATION } from './settings'

/**
 * Callback function to clear the React Query cache.
 * Registered by App.tsx to ensure cache is cleared synchronously during logout.
 */
let cacheCleanupCallback: (() => void) | null = null

/**
 * Register a callback to clear the React Query cache.
 * Called by App.tsx with queryClient.resetQueries.
 */
export function registerCacheCleanup(callback: () => void): () => void {
  cacheCleanupCallback = callback
  return () => {
    cacheCleanupCallback = null
  }
}

/**
 * Storage version for the auth store.
 * Increment this to invalidate all cached auth state and force re-login.
 *
 * Version history:
 * - 1: Initial version (pre-groupedEligibleAttributeValues)
 * - 2: Added groupedEligibleAttributeValues for multi-association detection
 */
const AUTH_STORE_VERSION = 2

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'error'

/**
 * Data source for assignments and compensations.
 * - 'api': Real SwissVolley API (full authentication)
 * - 'demo': Demo mode with simulated data
 * - 'calendar': Calendar mode with read-only iCal feed access
 */
export type DataSource = 'api' | 'demo' | 'calendar'

export interface UserProfile {
  id: string
  firstName: string
  lastName: string
  email?: string
  occupations: Occupation[]
  profilePictureUrl?: string
}

export interface Occupation {
  id: string
  type: 'referee' | 'player' | 'clubAdmin' | 'associationAdmin'
  associationCode?: string
  clubName?: string
}

export interface AuthState {
  status: AuthStatus
  user: UserProfile | null
  error: string | null
  /** Seconds until lockout expires (for 423 Locked response from proxy) */
  lockedUntil: number | null
  csrfToken: string | null
  /** The current data source for assignments and compensations */
  dataSource: DataSource
  /** Calendar code for calendar mode (6 characters) */
  calendarCode: string | null
  activeOccupationId: string | null
  /** True while switching associations - pages should show loading state */
  isAssociationSwitching: boolean
  _checkSessionPromise: Promise<boolean> | null
  /** Timestamp of the last successful authentication (login or session check) */
  _lastAuthTimestamp: number | null
  // Active party data from embedded HTML (contains association memberships)
  eligibleAttributeValues: AttributeValue[] | null
  /** All associations the user belongs to, grouped by role - use this for multi-association detection */
  groupedEligibleAttributeValues: AttributeValue[] | null
  eligibleRoles: Record<string, RoleDefinition> | null

  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  checkSession: (signal?: AbortSignal) => Promise<boolean>
  setUser: (user: UserProfile | null) => void
  setDemoAuthenticated: () => void
  setActiveOccupation: (id: string) => void
  setAssociationSwitching: (isSwitching: boolean) => void
  hasMultipleAssociations: () => boolean
  /**
   * Clears stale session data (CSRF token and session token).
   * Call this when the login page is displayed to prevent stale tokens
   * from causing authentication errors.
   */
  clearStaleSession: () => void
  /** Returns true if in calendar mode */
  isCalendarMode: () => boolean
  /** Login with a calendar code. Validates the code format and fetches calendar data. */
  loginWithCalendar: (code: string) => Promise<void>
  /** Logout from calendar mode (alias for logout) */
  logoutCalendar: () => Promise<void>
  /** Get the current authentication mode */
  getAuthMode: () => 'full' | 'calendar' | 'demo' | 'none'
}

/** Calendar codes are exactly 6 alphanumeric characters */
const CALENDAR_CODE_PATTERN = /^[a-zA-Z0-9]{6}$/

/**
 * Dummy association code for calendar mode transport settings.
 * Using a dedicated code ensures calendar mode settings don't interfere
 * with real API association settings if the user logs in later.
 */
export const CALENDAR_ASSOCIATION = 'CAL'

// Re-export for consumers that import from auth store
export { NO_REFEREE_ROLE_ERROR_KEY } from '@/features/auth/utils/api-auth-flow'

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      status: 'idle',
      user: null,
      error: null,
      lockedUntil: null,
      csrfToken: null,
      dataSource: 'api',
      calendarCode: null,
      activeOccupationId: null,
      isAssociationSwitching: false,
      _checkSessionPromise: null,
      _lastAuthTimestamp: null,
      eligibleAttributeValues: null,
      groupedEligibleAttributeValues: null,
      eligibleRoles: null,

      login: async (username: string, password: string): Promise<boolean> => {
        set({ status: 'loading', error: null, lockedUntil: null })
        try {
          return await performApiLogin(username, password, get, set)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed'
          set({ status: 'error', error: message, lockedUntil: null })
          return false
        }
      },

      logout: async () => {
        const currentDataSource = get().dataSource

        // Only call server logout for API mode
        if (currentDataSource === 'api') {
          await performApiLogout()
        }

        if (currentDataSource === 'demo') {
          useDemoStore.getState().clearDemoData()
        }

        clearSession()

        // Clear React Query cache synchronously to prevent stale data.
        // This is called BEFORE updating state to ensure cache is cleared
        // before any React re-renders can trigger new queries.
        if (cacheCleanupCallback) {
          cacheCleanupCallback()
          logger.info('Query cache cleared during logout')
        }

        // Preserve activeOccupationId across logout/login so users return to their
        // last-used association. The deriveUserWithOccupations function validates
        // that the preserved ID exists in the new user's occupations, falling back
        // to the first occupation if the ID is invalid (e.g., different user logs in).
        set({
          status: 'idle',
          user: null,
          error: null,
          csrfToken: null,
          dataSource: 'api',
          calendarCode: null,
          eligibleAttributeValues: null,
          groupedEligibleAttributeValues: null,
          eligibleRoles: null,
          _lastAuthTimestamp: null,
          // Note: activeOccupationId intentionally NOT cleared - see comment above
        })
      },

      checkSession: async (signal?: AbortSignal): Promise<boolean> => {
        // Check if already aborted before starting
        if (signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError')
        }

        const currentDataSource = get().dataSource
        // Demo and calendar modes don't need session verification
        if (currentDataSource === 'demo' || currentDataSource === 'calendar') {
          return true
        }

        // Skip session check if authentication happened very recently.
        // This prevents redundant network requests right after login.
        const lastAuth = get()._lastAuthTimestamp
        if (lastAuth && Date.now() - lastAuth < SESSION_CHECK_GRACE_PERIOD_MS) {
          logger.info('Session check: skipping, authenticated recently')
          return true
        }

        const existingPromise = get()._checkSessionPromise
        if (existingPromise) {
          // If caller provided a signal, wrap the promise to handle abortion
          if (signal) {
            return new Promise<boolean>((resolve, reject) => {
              const onAbort = () => reject(new DOMException('Aborted', 'AbortError'))
              signal.addEventListener('abort', onAbort, { once: true })

              existingPromise
                .then(resolve)
                .catch(reject)
                .finally(() => signal.removeEventListener('abort', onAbort))
            })
          }
          return existingPromise
        }

        const promise = (async () => {
          try {
            return await performApiSessionCheck(get, set, signal)
          } finally {
            set({ _checkSessionPromise: null })
          }
        })()

        set({ _checkSessionPromise: promise })

        // If caller provided a signal, wrap the promise to handle abortion
        if (signal) {
          return new Promise<boolean>((resolve, reject) => {
            const onAbort = () => reject(new DOMException('Aborted', 'AbortError'))
            signal.addEventListener('abort', onAbort, { once: true })

            promise
              .then(resolve)
              .catch(reject)
              .finally(() => signal.removeEventListener('abort', onAbort))
          })
        }

        return promise
      },

      setUser: (user: UserProfile | null) => {
        set({ user })
      },

      setDemoAuthenticated: () => {
        const rawDemoOccupations: Occupation[] = [
          { id: 'demo-referee-sv', type: 'referee', associationCode: 'SV' },
          { id: 'demo-referee-svrba', type: 'referee', associationCode: 'SVRBA' },
          { id: 'demo-referee-svrz', type: 'referee', associationCode: 'SVRZ' },
          { id: 'demo-player', type: 'player', clubName: 'VBC Demo' },
        ]

        const demoOccupations = filterRefereeOccupations(rawDemoOccupations)

        // Set auth state to demo mode first
        set({
          status: 'authenticated',
          dataSource: 'demo',
          user: {
            id: 'demo-user',
            firstName: 'Demo',
            lastName: 'User',
            email: 'demo@example.com',
            occupations: demoOccupations,
          },
          activeOccupationId: demoOccupations[0]!.id,
          error: null,
        })

        // Set demo home location for distance filtering showcase
        // Must be called after dataSource is set to "demo" so the settings
        // store's mode is synced and the location is stored in demo settings.
        // Note: We explicitly call _setCurrentMode here for immediate sync because
        // the App.tsx subscription fires asynchronously after state updates.
        // The idempotent nature of _setCurrentMode makes this double-call safe.
        const settingsStore = useSettingsStore.getState()
        settingsStore._setCurrentMode('demo')
        settingsStore.setHomeLocation(DEMO_HOME_LOCATION)
      },

      setActiveOccupation: (id: string) => {
        set({ activeOccupationId: id })
      },

      setAssociationSwitching: (isSwitching: boolean) => {
        set({ isAssociationSwitching: isSwitching })
      },

      hasMultipleAssociations: () => {
        // Use groupedEligibleAttributeValues which contains all user associations
        return hasMultipleAssociations(get().groupedEligibleAttributeValues)
      },

      clearStaleSession: () => {
        // Clear both the API client session (CSRF token + session token) and the store's csrfToken.
        // This prevents stale tokens from causing authentication errors when the user
        // arrives at the login page with outdated cached credentials.
        clearSession()
        set({ csrfToken: null })
      },

      isCalendarMode: () => {
        return get().dataSource === 'calendar'
      },

      loginWithCalendar: async (code: string): Promise<void> => {
        const trimmedCode = code.trim()

        // Validate calendar code format (6 alphanumeric characters)
        // Note: The calendar code should already be validated by LoginPage before
        // calling this function. This is just a safeguard for direct API calls.
        if (!CALENDAR_CODE_PATTERN.test(trimmedCode)) {
          set({ status: 'error', error: 'auth.invalidCalendarCode' })
          return
        }

        set({ status: 'loading', error: null })

        try {
          // Fetch calendar data to extract associations for transport settings
          // This unifies calendar mode with regular API mode - both have occupations
          const assignments = await fetchCalendarAssignments(trimmedCode)

          // Extract unique associations from calendar assignments
          const uniqueAssociations = new Set<string>()
          for (const assignment of assignments) {
            if (assignment.association) {
              uniqueAssociations.add(assignment.association)
            }
          }

          // Create synthetic occupations from associations found in calendar
          // This allows transport settings to work per-association like regular mode
          const occupations: Occupation[] = Array.from(uniqueAssociations)
            .sort()
            .map((assoc) => ({
              id: `calendar-${assoc}`,
              type: 'referee' as const,
              associationCode: assoc,
            }))

          // Set authenticated state with occupations derived from calendar data
          set({
            status: 'authenticated',
            dataSource: 'calendar',
            calendarCode: trimmedCode,
            user: {
              id: `calendar-${trimmedCode}`,
              firstName: 'Calendar',
              lastName: 'User',
              occupations,
            },
            // Set first occupation as active if any found
            activeOccupationId: occupations[0]?.id ?? null,
            error: null,
          })
        } catch (error) {
          // If fetching fails, fall back to no occupations
          // This allows login to succeed even if calendar is empty or fails
          logger.warn('Failed to fetch calendar for associations:', error)

          set({
            status: 'authenticated',
            dataSource: 'calendar',
            calendarCode: trimmedCode,
            user: {
              id: `calendar-${trimmedCode}`,
              firstName: 'Calendar',
              lastName: 'User',
              occupations: [],
            },
            activeOccupationId: null,
            error: null,
          })
        }
      },

      logoutCalendar: async () => {
        // Separate method for API clarity and future extensibility
        // (e.g., calendar-specific cleanup or analytics)
        await get().logout()
      },

      getAuthMode: () => {
        const state = get()
        if (state.status !== 'authenticated') {
          return 'none'
        }
        switch (state.dataSource) {
          case 'demo':
            return 'demo'
          case 'calendar':
            return 'calendar'
          case 'api':
            return 'full'
        }
      },
    }),
    {
      name: 'volleykit-auth',
      version: AUTH_STORE_VERSION,
      partialize: (state) => ({
        // Persist minimal user data for UX (immediate name display).
        // Session cookies are HttpOnly and managed by browser.
        // CSRF token is persisted to enable POST requests after page reload.
        // groupedEligibleAttributeValues persisted for hasMultipleAssociations() on refresh.
        user: state.user,
        csrfToken: state.csrfToken,
        _wasAuthenticated: state.status === 'authenticated',
        dataSource: state.dataSource,
        calendarCode: state.calendarCode,
        activeOccupationId: state.activeOccupationId,
        eligibleAttributeValues: state.eligibleAttributeValues,
        groupedEligibleAttributeValues: state.groupedEligibleAttributeValues,
      }),
      // Clean break: invalidate old cached state when version changes
      // Users will need to re-login to get fresh association data
      migrate: (persistedState, version) => {
        if (version < AUTH_STORE_VERSION) {
          // Return undefined to use defaults (forces re-login)
          return undefined
        }
        return persistedState
      },
      merge: (persisted, current) => {
        const persistedState = persisted as
          | {
              user?: UserProfile | null
              csrfToken?: string | null
              _wasAuthenticated?: boolean
              dataSource?: DataSource
              calendarCode?: string | null
              isDemoMode?: boolean
              activeOccupationId?: string | null
              eligibleAttributeValues?: AttributeValue[] | null
              groupedEligibleAttributeValues?: AttributeValue[] | null
            }
          | undefined

        const restoredCsrfToken = persistedState?.csrfToken ?? null
        if (restoredCsrfToken) {
          setCsrfToken(restoredCsrfToken)
        }

        // Derive dataSource from isDemoMode for backwards compatibility with old persisted state
        const dataSource: DataSource =
          persistedState?.dataSource ?? (persistedState?.isDemoMode ? 'demo' : 'api')

        return {
          ...current,
          user: persistedState?.user ?? null,
          csrfToken: restoredCsrfToken,
          status: persistedState?._wasAuthenticated ? 'authenticated' : 'idle',
          dataSource,
          calendarCode: persistedState?.calendarCode ?? null,
          activeOccupationId: persistedState?.activeOccupationId ?? null,
          eligibleAttributeValues: persistedState?.eligibleAttributeValues ?? null,
          groupedEligibleAttributeValues: persistedState?.groupedEligibleAttributeValues ?? null,
          _checkSessionPromise: null,
        }
      },
    }
  )
)
