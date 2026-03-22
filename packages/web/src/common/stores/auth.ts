import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { clearSession } from '@/api/session'
import { logger } from '@/common/utils/logger'
import { performCalendarLogin } from '@/features/auth/services/calendar-auth'
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

import {
  AUTH_STORE_NAME,
  AUTH_STORE_VERSION,
  partializeAuthState,
  migrateAuthState,
  mergeAuthState,
} from './auth-persistence'
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
  clearStaleSession: () => void
  isCalendarMode: () => boolean
  loginWithCalendar: (code: string) => Promise<void>
  logoutCalendar: () => Promise<void>
  getAuthMode: () => 'full' | 'calendar' | 'demo' | 'none'
}

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
        return hasMultipleAssociations(get().groupedEligibleAttributeValues)
      },

      clearStaleSession: () => {
        clearSession()
        set({ csrfToken: null })
      },

      isCalendarMode: () => {
        return get().dataSource === 'calendar'
      },

      loginWithCalendar: async (code: string): Promise<void> => {
        await performCalendarLogin(code, set)
      },

      logoutCalendar: async () => {
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
      name: AUTH_STORE_NAME,
      version: AUTH_STORE_VERSION,
      partialize: partializeAuthState,
      migrate: migrateAuthState,
      merge: mergeAuthState,
    }
  )
)
