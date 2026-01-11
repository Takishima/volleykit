import type { ReactNode } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import * as pwaContext from '@/contexts/PWAContext'
import * as authStore from '@/shared/stores/auth'
import * as settingsStore from '@/shared/stores/settings'

import { SettingsPage } from './SettingsPage'

vi.mock('@/shared/stores/auth')
vi.mock('@/shared/stores/settings')
vi.mock('@/contexts/PWAContext')
vi.mock('@/shared/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: 'en',
  }),
}))
vi.mock('@/shared/hooks/useTravelTime', () => ({
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

const mockUser = {
  id: 'user-1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  occupations: [{ id: 'occ-1', type: 'referee', associationCode: 'SV' }],
}

const mockLogout = vi.fn()
const mockSetSafeMode = vi.fn()

function mockAuthStore(overrides: Record<string, unknown> = {}) {
  const dataSource = (overrides.dataSource ?? 'api') as 'api' | 'demo' | 'calendar'
  const state = {
    user: mockUser,
    logout: mockLogout,
    dataSource,
    isCalendarMode: () => dataSource === 'calendar',
    ...overrides,
  }
  vi.mocked(authStore.useAuthStore).mockImplementation((selector?: unknown) => {
    if (typeof selector === 'function') {
      return selector(state)
    }
    return state as ReturnType<typeof authStore.useAuthStore>
  })
}

function mockSettingsStore(overrides = {}) {
  const state = {
    isSafeModeEnabled: true,
    setSafeMode: mockSetSafeMode,
    ...overrides,
  }
  vi.mocked(settingsStore.useSettingsStore).mockReturnValue(
    state as ReturnType<typeof settingsStore.useSettingsStore>
  )
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
      expect(screen.queryByText('settings.safeMode')).not.toBeInTheDocument()
    })

    it('hides safe mode section in calendar mode', () => {
      mockAuthStore({ dataSource: 'calendar' })
      render(<SettingsPage />, { wrapper: createWrapper() })
      expect(screen.queryByText('settings.safeMode')).not.toBeInTheDocument()
    })

    it('shows safe mode section when not in demo or calendar mode', () => {
      render(<SettingsPage />, { wrapper: createWrapper() })
      expect(screen.getByText('settings.safeMode')).toBeInTheDocument()
    })
  })

  describe('About Section', () => {
    it('displays version info', () => {
      render(<SettingsPage />, { wrapper: createWrapper() })
      expect(screen.getByText('1.0.2')).toBeInTheDocument()
    })
  })

  describe('Logout', () => {
    it('renders logout button', () => {
      render(<SettingsPage />, { wrapper: createWrapper() })
      expect(screen.getByText('auth.logout')).toBeInTheDocument()
    })
  })
})
