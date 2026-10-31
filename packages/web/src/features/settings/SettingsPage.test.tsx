import type { ReactNode } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import * as pwaContext from '@/contexts/PWAContext'
import * as authStore from '@/common/stores/auth'
import type { AuthState, UserProfile } from '@/common/stores/auth'
import { partialMock } from '@/test/partial-mock'
import * as settingsStore from '@/common/stores/settings'

import { SettingsPage } from './SettingsPage'

vi.mock('@/common/stores/auth')
vi.mock('@/common/stores/settings')
vi.mock('@/contexts/PWAContext')
vi.mock('@/common/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: 'en',
  }),
}))
vi.mock('@/common/hooks/useTravelTime', () => ({
  useTravelTimeAvailable: () => false,
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

// Disable PWA for tests by default
vi.stubGlobal('__PWA_ENABLED__', false)

// Stub app version to avoid test failures on version bumps
vi.stubGlobal('__APP_VERSION__', '1.0.0-test')

const mockUser: UserProfile = {
  id: 'user-1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  occupations: [{ id: 'occ-1', type: 'referee', associationCode: 'SV' }],
}

const mockLogout = vi.fn()
const mockSetSafeMode = vi.fn()

function mockAuthStore(overrides: Partial<AuthState> = {}) {
  const dataSource = overrides.dataSource ?? 'api'
  const state = partialMock<AuthState>({
    user: mockUser,
    logout: mockLogout,
    dataSource,
    isCalendarMode: () => dataSource === 'calendar',
    ...overrides,
  })
  vi.mocked(authStore.useAuthStore).mockImplementation(
    (selector?: (state: AuthState) => unknown) => (selector ? selector(state) : state)
  )
}

function mockSettingsStore(overrides = {}) {
  const state = {
    isSafeModeEnabled: true,
    setSafeMode: mockSetSafeMode,
    settingsGroupExpanded: {},
    setSettingsGroupExpanded: vi.fn(),
    ...overrides,
  }
  vi.mocked(settingsStore.useSettingsStore).mockReturnValue(state)
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockAuthStore()
    mockSettingsStore()

    vi.mocked(pwaContext.usePWA).mockReturnValue({
      offlineReady: false,
      needRefresh: false,
      isChecking: false,
      lastChecked: null,
      checkError: null,
      registrationError: null,
      checkForUpdate: vi.fn(),
      updateApp: vi.fn(),
      dismissPrompt: vi.fn(),
    })
  })

  describe('Profile Section', () => {
    it('displays user name', () => {
      render(<SettingsPage />, { wrapper: createWrapper() })
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('displays user initials', () => {
      render(<SettingsPage />, { wrapper: createWrapper() })
      expect(screen.getByText('JD')).toBeInTheDocument()
    })

    it('displays user email', () => {
      render(<SettingsPage />, { wrapper: createWrapper() })
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
    })

    it('does not render profile when user is null', () => {
      mockAuthStore({ user: null })
      render(<SettingsPage />, { wrapper: createWrapper() })
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    })
  })

  describe('Language Section', () => {
    it('renders language section with heading', () => {
      render(<SettingsPage />, { wrapper: createWrapper() })
      // Language section header should be present
      expect(screen.getByText('settings.language')).toBeInTheDocument()
    })
  })

  describe('Safe Mode Section', () => {
    it('hides safe mode section in demo mode', () => {
      mockAuthStore({ dataSource: 'demo' })
      render(<SettingsPage />, { wrapper: createWrapper() })
      expect(screen.queryByText('settings.safeModeDescription')).not.toBeInTheDocument()
    })

    it('hides safe mode section in calendar mode', () => {
      mockAuthStore({ dataSource: 'calendar' })
      render(<SettingsPage />, { wrapper: createWrapper() })
      expect(screen.queryByText('settings.safeModeDescription')).not.toBeInTheDocument()
    })

    it('shows safe mode section when not in demo or calendar mode', () => {
      render(<SettingsPage />, { wrapper: createWrapper() })
      expect(screen.getByText('settings.safeModeDescription')).toBeInTheDocument()
    })
  })

  describe('About Section', () => {
    it('displays version info', () => {
      render(<SettingsPage />, { wrapper: createWrapper() })
      expect(screen.getByText('1.0.0-test')).toBeInTheDocument()
    })
  })

  describe('Logout', () => {
    it('renders logout button', () => {
      render(<SettingsPage />, { wrapper: createWrapper() })
      expect(screen.getByText('auth.logout')).toBeInTheDocument()
    })
  })
})
