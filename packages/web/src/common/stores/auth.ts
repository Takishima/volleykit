import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { clearSession } from '@/api/session'
import type { AttributeValue, RoleDefinition } from '@/common/types/active-party'
import { logger } from '@/common/utils/logger'

import { getAuthActions } from './auth-actions-registry'
import {
  AUTH_STORE_NAME,
  AUTH_STORE_VERSION,
  partializeAuthState,
  migrateAuthState,
  mergeAuthState,
} from './auth-persistence'
import { useDemoStore } from './demo'
import { useSettingsStore, DEMO_HOME_LOCATION } from './settings'

// Re-export types so existing consumers still work
export type { AttributeValue, RoleDefinition } from '@/common/types/active-party'
export type { AuthActions } from './auth-actions-registry'
export { registerAuthActions } from './auth-actions-registry'

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

/**
 * Error key for users without a referee role.
 * Defined here to avoid importing from features/.
 */
export const NO_REFEREE_ROLE_ERROR_KEY = 'auth.noRefereeRole'

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
          const actions = getAuthActions()
          return await actions.performLogin(username, password, get, set)
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
          const actions = getAuthActions()
          await actions.performLogout()
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
        const actions = getAuthActions()
        const lastAuth = get()._lastAuthTimestamp
        if (lastAuth && Date.now() - lastAuth < actions.sessionCheckGracePeriodMs) {
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
            return await actions.performSessionCheck(get, set, signal)
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

        // Filter inline for demo mode to avoid requiring auth actions registration
        const demoOccupations = rawDemoOccupations.filter((occ) => occ.type === 'referee')

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
        const actions = getAuthActions()
        return actions.hasMultipleAssociations(get().groupedEligibleAttributeValues)
      },

      clearStaleSession: () => {
        clearSession()
        set({ csrfToken: null })
      },

      isCalendarMode: () => {
        return get().dataSource === 'calendar'
      },

      loginWithCalendar: async (code: string): Promise<void> => {
        const actions = getAuthActions()
        await actions.performCalendarLogin(code, set)
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
