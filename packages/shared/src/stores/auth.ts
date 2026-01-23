/**
 * Authentication store - Platform-agnostic auth state management.
 *
 * This store manages authentication state without platform-specific logic.
 * Platform adapters (web, mobile) handle actual login/logout operations
 * and call the store methods to update state.
 *
 * Extracted from web-app/src/shared/stores/auth.ts
 */

import { create } from 'zustand'

/**
 * Authentication status states.
 */
export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'error'

/**
 * Data source for assignments and compensations.
 * - 'api': Real SwissVolley API (full authentication)
 * - 'demo': Demo mode with simulated data
 * - 'calendar': Calendar mode with read-only iCal feed access
 */
export type DataSource = 'api' | 'demo' | 'calendar'

/**
 * Occupation types for volleyball referees and administrators.
 */
export type OccupationType = 'referee' | 'linesmen' | 'player' | 'clubAdmin' | 'associationAdmin'

/**
 * User occupation (role within an association or club).
 */
export interface Occupation {
  /** Unique identifier for this occupation */
  id: string
  /** Type of occupation */
  type: OccupationType
  /** Association code (e.g., 'SV', 'RVNO', 'RVSZ') */
  associationCode?: string
  /** Association name */
  associationName?: string
  /** Club name (for club-level occupations) */
  clubName?: string
  /** Referee level (e.g., 'National', 'Regional') */
  level?: string
}

/**
 * User profile information.
 */
export interface UserProfile {
  /** Unique identifier (SwissVolley person ID) */
  id: string
  /** First name */
  firstName: string
  /** Last name */
  lastName: string
  /** Email address */
  email?: string
  /** SwissVolley license number */
  svNumber?: string
  /** User's occupations/roles */
  occupations: Occupation[]
  /** Profile picture URL */
  profilePictureUrl?: string
}

/**
 * Authentication error details.
 */
export interface AuthError {
  /** Error message */
  message: string
  /** Error code (for programmatic handling) */
  code?: 'invalid_credentials' | 'session_expired' | 'network_error' | 'locked' | 'unknown'
  /** Seconds until lockout expires (for rate limiting) */
  lockedUntilSeconds?: number
}

/**
 * Authentication state interface.
 */
export interface AuthState {
  /** Current authentication status */
  status: AuthStatus
  /** Authenticated user profile (null if not authenticated) */
  user: UserProfile | null
  /** Current data source */
  dataSource: DataSource
  /** Authentication error (null if no error) */
  error: AuthError | null
  /** Currently active occupation ID */
  activeOccupationId: string | null
  /** Calendar code for calendar mode (6 characters) */
  calendarCode: string | null
  /** True while switching associations */
  isAssociationSwitching: boolean

  // === Actions ===

  /** Set authenticated user */
  setUser: (user: UserProfile) => void
  /** Set authentication status */
  setStatus: (status: AuthStatus) => void
  /** Set authentication error */
  setError: (error: AuthError | null) => void
  /** Set data source */
  setDataSource: (source: DataSource) => void
  /** Set active occupation */
  setActiveOccupation: (id: string) => void
  /** Set calendar code (for calendar mode) */
  setCalendarCode: (code: string | null) => void
  /** Set association switching state */
  setAssociationSwitching: (isSwitching: boolean) => void
  /** Clear auth state (logout) */
  logout: () => void
  /** Reset to initial state */
  reset: () => void

  // === Derived getters ===

  /** Check if user has multiple associations */
  hasMultipleAssociations: () => boolean
  /** Check if in calendar mode */
  isCalendarMode: () => boolean
  /** Check if in demo mode */
  isDemoMode: () => boolean
  /** Get current auth mode */
  getAuthMode: () => 'full' | 'calendar' | 'demo' | 'none'
  /** Get active occupation */
  getActiveOccupation: () => Occupation | null
}

/**
 * Initial auth state.
 */
const initialState = {
  status: 'idle' as AuthStatus,
  user: null as UserProfile | null,
  dataSource: 'api' as DataSource,
  error: null as AuthError | null,
  activeOccupationId: null as string | null,
  calendarCode: null as string | null,
  isAssociationSwitching: false,
}

/**
 * Authentication store.
 *
 * Platform-agnostic store for managing authentication state.
 * Login/logout logic is handled by platform-specific adapters.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  ...initialState,

  setUser: (user) =>
    set({
      user,
      status: 'authenticated',
      error: null,
      // Set first referee occupation as active by default
      activeOccupationId:
        get().activeOccupationId ??
        user.occupations.find((o) => o.type === 'referee' || o.type === 'linesmen')?.id ??
        user.occupations[0]?.id ??
        null,
    }),

  setStatus: (status) => set({ status }),

  setError: (error) =>
    set({
      error,
      status: error ? 'error' : get().status,
    }),

  setDataSource: (dataSource) => set({ dataSource }),

  setActiveOccupation: (id) => set({ activeOccupationId: id }),

  setCalendarCode: (calendarCode) => set({ calendarCode }),

  setAssociationSwitching: (isAssociationSwitching) => set({ isAssociationSwitching }),

  logout: () =>
    set({
      ...initialState,
      dataSource: get().dataSource, // Preserve data source
    }),

  reset: () => set(initialState),

  hasMultipleAssociations: () => {
    const { user } = get()
    if (!user) return false

    const associations = new Set(
      user.occupations.filter((o) => o.associationCode).map((o) => o.associationCode)
    )
    return associations.size > 1
  },

  isCalendarMode: () => get().dataSource === 'calendar',

  isDemoMode: () => get().dataSource === 'demo',

  getAuthMode: () => {
    const { status, dataSource } = get()
    if (status !== 'authenticated') return 'none'
    if (dataSource === 'demo') return 'demo'
    if (dataSource === 'calendar') return 'calendar'
    return 'full'
  },

  getActiveOccupation: () => {
    const { user, activeOccupationId } = get()
    if (!user || !activeOccupationId) return null
    return user.occupations.find((o) => o.id === activeOccupationId) ?? null
  },
}))

/**
 * Get the active association code from the current occupation.
 */
export function getActiveAssociationCode(): string | undefined {
  const occupation = useAuthStore.getState().getActiveOccupation()
  return occupation?.associationCode
}

/**
 * Filter occupations to only include referee-type occupations.
 */
export function filterRefereeOccupations(occupations: Occupation[]): Occupation[] {
  return occupations.filter((o) => o.type === 'referee' || o.type === 'linesmen')
}
