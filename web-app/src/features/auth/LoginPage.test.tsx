import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import * as calendarHelpers from '@/features/assignments/utils/calendar-helpers'
import * as authStore from '@/shared/stores/auth'
import * as demoStore from '@/shared/stores/demo'

import { LoginPage } from './LoginPage'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('@/shared/stores/auth')
vi.mock('@/shared/stores/demo')
vi.mock('@/features/assignments/utils/calendar-helpers')
vi.mock('@/shared/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: 'en',
  }),
}))

const mockLogin = vi.fn()
const mockLoginWithCalendar = vi.fn()
const mockSetDemoAuthenticated = vi.fn()
const mockClearStaleSession = vi.fn()
const mockInitializeDemoData = vi.fn()

function mockAuthStoreState(overrides = {}) {
  const state = {
    login: mockLogin,
    loginWithCalendar: mockLoginWithCalendar,
    status: 'idle' as const,
    error: null,
    lockedUntil: null,
    setDemoAuthenticated: mockSetDemoAuthenticated,
    clearStaleSession: mockClearStaleSession,
    ...overrides,
  }
  vi.mocked(authStore.useAuthStore).mockImplementation((selector?: unknown) => {
    if (typeof selector === 'function') {
      return selector(state)
    }
    return state as ReturnType<typeof authStore.useAuthStore>
  })
}

function mockDemoStoreState() {
  const state = {
    initializeDemoData: mockInitializeDemoData,
  }
  vi.mocked(demoStore.useDemoStore).mockImplementation((selector?: unknown) => {
    if (typeof selector === 'function') {
      return selector(state)
    }
    return state as ReturnType<typeof demoStore.useDemoStore>
  })
}

// Helper to switch to full login mode (calendar mode is now the default)
function switchToFullLogin() {
  fireEvent.click(screen.getByRole('tab', { name: /fullLogin/i }))
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockAuthStoreState()
    mockDemoStoreState()
  })

  describe('Form Rendering', () => {
    it('renders calendar mode by default', () => {
      render(<LoginPage />)

      // Calendar mode should be visible by default
      expect(screen.getByLabelText(/calendarInputLabel/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /enterCalendarMode/i })).toBeInTheDocument()
    })

    it('renders login form with username and password fields when in full login mode', () => {
      render(<LoginPage />)
      switchToFullLogin()

      expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    })

    it('renders login button in full login mode', () => {
      render(<LoginPage />)
      switchToFullLogin()

      expect(screen.getByRole('button', { name: /loginButton/i })).toBeInTheDocument()
    })

    it('renders demo mode button', () => {
      render(<LoginPage />)

      expect(screen.getByRole('button', { name: /demo/i })).toBeInTheDocument()
    })

    it('renders VolleyKit branding', () => {
      render(<LoginPage />)

      expect(screen.getByRole('heading', { name: /volleykit/i })).toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('calls login with username and password on submit', async () => {
      mockLogin.mockResolvedValue(true)

      render(<LoginPage />)
      switchToFullLogin()

      fireEvent.change(screen.getByLabelText(/username/i), {
        target: { value: 'testuser' },
      })
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'testpass' },
      })
      fireEvent.click(screen.getByRole('button', { name: /loginButton/i }))

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('testuser', 'testpass')
      })
    })

    it('navigates to home on successful login', async () => {
      mockLogin.mockResolvedValue(true)

      render(<LoginPage />)
      switchToFullLogin()

      fireEvent.change(screen.getByLabelText(/username/i), {
        target: { value: 'testuser' },
      })
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'testpass' },
      })
      fireEvent.click(screen.getByRole('button', { name: /loginButton/i }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/')
      })
    })

    it('does not navigate on failed login', async () => {
      mockLogin.mockResolvedValue(false)

      render(<LoginPage />)
      switchToFullLogin()

      fireEvent.change(screen.getByLabelText(/username/i), {
        target: { value: 'testuser' },
      })
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'wrongpass' },
      })
      fireEvent.click(screen.getByRole('button', { name: /loginButton/i }))

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled()
      })

      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('Loading State', () => {
    it('disables form fields while loading in full login mode', () => {
      mockAuthStoreState({ status: 'loading' })

      render(<LoginPage />)
      switchToFullLogin()

      expect(screen.getByLabelText(/username/i)).toBeDisabled()
      expect(screen.getByLabelText(/password/i)).toBeDisabled()
    })

    it('disables calendar input while loading', () => {
      mockAuthStoreState({ status: 'loading' })

      render(<LoginPage />)

      expect(screen.getByLabelText(/calendarInputLabel/i)).toBeDisabled()
    })

    it('disables login button while loading in full login mode', () => {
      mockAuthStoreState({ status: 'loading' })

      render(<LoginPage />)
      switchToFullLogin()

      // When loading, button shows "loggingIn" text
      const loginButton = screen.getByTestId('login-button')
      expect(loginButton).toBeDisabled()
    })

    it('disables demo button while loading', () => {
      mockAuthStoreState({ status: 'loading' })

      render(<LoginPage />)

      const demoButton = screen.getByRole('button', { name: /demo/i })
      expect(demoButton).toBeDisabled()
    })
  })

  describe('Error State', () => {
    it('displays error message when error exists in full login mode', () => {
      mockAuthStoreState({ status: 'error', error: 'Invalid credentials' })

      render(<LoginPage />)
      switchToFullLogin()

      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })

    it('error message has proper styling', () => {
      mockAuthStoreState({ status: 'error', error: 'Login failed' })

      render(<LoginPage />)
      switchToFullLogin()

      const errorElement = screen.getByText('Login failed')
      expect(errorElement.closest('div')).toHaveClass('bg-danger-50')
    })
  })

  describe('Demo Mode', () => {
    it('initializes demo data and navigates on demo button click', () => {
      render(<LoginPage />)

      fireEvent.click(screen.getByRole('button', { name: /demo/i }))

      expect(mockInitializeDemoData).toHaveBeenCalledWith('SV')
      expect(mockSetDemoAuthenticated).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  describe('Accessibility', () => {
    it('has required attribute on calendar input field', () => {
      render(<LoginPage />)

      expect(screen.getByLabelText(/calendarInputLabel/i)).toHaveAttribute('required')
    })

    it('has required attribute on username field in full login mode', () => {
      render(<LoginPage />)
      switchToFullLogin()

      expect(screen.getByLabelText(/username/i)).toHaveAttribute('required')
    })

    it('has required attribute on password field in full login mode', () => {
      render(<LoginPage />)
      switchToFullLogin()

      expect(screen.getByLabelText(/password/i)).toHaveAttribute('required')
    })

    it('has proper autocomplete attributes in full login mode', () => {
      render(<LoginPage />)
      switchToFullLogin()

      expect(screen.getByLabelText(/username/i)).toHaveAttribute('autocomplete', 'username')
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('autocomplete', 'current-password')
    })

    it('has credential association attributes for password managers in full login mode', () => {
      render(<LoginPage />)
      switchToFullLogin()

      // name attributes help password managers recognize credential fields
      expect(screen.getByLabelText(/username/i)).toHaveAttribute('name', 'username')
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('name', 'password')

      // form action associates credentials with volleymanager.volleyball.ch
      // (mirrors native app's associatedDomains configuration)
      const form = screen.getByLabelText(/username/i).closest('form')
      expect(form).toHaveAttribute('action', 'https://volleymanager.volleyball.ch')
    })

    it('has proper input types in full login mode', () => {
      render(<LoginPage />)
      switchToFullLogin()

      expect(screen.getByLabelText(/username/i)).toHaveAttribute('type', 'text')
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password')
    })

    it('has proper tab roles for login mode switcher', () => {
      render(<LoginPage />)

      expect(screen.getByRole('tablist')).toBeInTheDocument()
      expect(screen.getAllByRole('tab')).toHaveLength(2)
    })
  })

  describe('Calendar Mode', () => {
    beforeEach(() => {
      // Default mocks for calendar helpers
      vi.mocked(calendarHelpers.extractCalendarCode).mockReturnValue(null)
      vi.mocked(calendarHelpers.validateCalendarCode).mockResolvedValue({
        valid: false,
        error: 'auth.calendarNotFound',
      })
    })

    afterEach(() => {
      vi.clearAllMocks()
    })

    describe('Tab Switching', () => {
      it('renders login mode tabs', () => {
        render(<LoginPage />)

        expect(screen.getByRole('tablist')).toBeInTheDocument()
        // Tab names are translation keys since useTranslation is mocked
        expect(screen.getByRole('tab', { name: 'auth.fullLogin' })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: 'auth.calendarMode' })).toBeInTheDocument()
      })

      it('defaults to calendar mode tab', () => {
        render(<LoginPage />)

        const calendarTab = screen.getByRole('tab', { name: 'auth.calendarMode' })
        expect(calendarTab).toHaveAttribute('aria-selected', 'true')
        expect(screen.getByTestId('calendar-input')).toBeInTheDocument()
      })

      it('switches to full login tab when clicked', () => {
        render(<LoginPage />)

        const fullTab = screen.getByRole('tab', {
          name: 'auth.fullLogin',
        })
        fireEvent.click(fullTab)

        expect(fullTab).toHaveAttribute('aria-selected', 'true')
        expect(screen.getByTestId('username-input')).toBeInTheDocument()
      })

      it('shows calendar input field in calendar mode', () => {
        render(<LoginPage />)

        fireEvent.click(screen.getByRole('tab', { name: 'auth.calendarMode' }))

        expect(screen.getByTestId('calendar-input')).toBeInTheDocument()
        expect(screen.getByTestId('calendar-login-button')).toBeInTheDocument()
      })

      it('hides username/password fields in calendar mode', () => {
        render(<LoginPage />)

        fireEvent.click(screen.getByRole('tab', { name: 'auth.calendarMode' }))

        expect(screen.queryByLabelText(/username/i)).not.toBeInTheDocument()
        expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument()
      })

      it('shows info box in calendar mode', () => {
        render(<LoginPage />)

        fireEvent.click(screen.getByRole('tab', { name: 'auth.calendarMode' }))

        // Info box appears in the form area (also appears at bottom of page)
        const infoTexts = screen.getAllByText('auth.calendarModeInfo')
        expect(infoTexts.length).toBeGreaterThanOrEqual(1)
      })
    })

    describe('Calendar Code Validation', () => {
      it('shows error for invalid calendar code format', async () => {
        vi.mocked(calendarHelpers.extractCalendarCode).mockReturnValue(null)

        render(<LoginPage />)

        fireEvent.click(screen.getByRole('tab', { name: 'auth.calendarMode' }))
        fireEvent.change(screen.getByTestId('calendar-input'), {
          target: { value: 'invalid' },
        })
        fireEvent.click(screen.getByTestId('calendar-login-button'))

        await waitFor(() => {
          expect(screen.getByText(/invalidCalendarCode/i)).toBeInTheDocument()
        })
      })

      it('validates calendar code and shows not found error', async () => {
        vi.mocked(calendarHelpers.extractCalendarCode).mockReturnValue('ABC123')
        vi.mocked(calendarHelpers.validateCalendarCode).mockResolvedValue({
          valid: false,
          error: 'auth.calendarNotFound',
        })

        render(<LoginPage />)

        fireEvent.click(screen.getByRole('tab', { name: 'auth.calendarMode' }))
        fireEvent.change(screen.getByTestId('calendar-input'), {
          target: { value: 'ABC123' },
        })
        fireEvent.click(screen.getByTestId('calendar-login-button'))

        await waitFor(() => {
          expect(calendarHelpers.validateCalendarCode).toHaveBeenCalledWith(
            'ABC123',
            expect.any(AbortSignal)
          )
        })
      })

      it('calls loginWithCalendar on valid code', async () => {
        vi.mocked(calendarHelpers.extractCalendarCode).mockReturnValue('ABC123')
        vi.mocked(calendarHelpers.validateCalendarCode).mockResolvedValue({
          valid: true,
        })
        mockLoginWithCalendar.mockResolvedValue(undefined)

        render(<LoginPage />)

        fireEvent.click(screen.getByRole('tab', { name: 'auth.calendarMode' }))
        fireEvent.change(screen.getByTestId('calendar-input'), {
          target: { value: 'ABC123' },
        })
        fireEvent.click(screen.getByTestId('calendar-login-button'))

        await waitFor(() => {
          expect(mockLoginWithCalendar).toHaveBeenCalledWith('ABC123')
        })

        expect(mockNavigate).toHaveBeenCalledWith('/')
      })

      it('extracts code from URL input', async () => {
        vi.mocked(calendarHelpers.extractCalendarCode).mockReturnValue('XYZ789')
        vi.mocked(calendarHelpers.validateCalendarCode).mockResolvedValue({
          valid: true,
        })
        mockLoginWithCalendar.mockResolvedValue(undefined)

        render(<LoginPage />)

        fireEvent.click(screen.getByRole('tab', { name: 'auth.calendarMode' }))
        fireEvent.change(screen.getByTestId('calendar-input'), {
          target: {
            value: 'https://volleymanager.volleyball.ch/calendar/XYZ789',
          },
        })
        fireEvent.click(screen.getByTestId('calendar-login-button'))

        await waitFor(() => {
          expect(calendarHelpers.extractCalendarCode).toHaveBeenCalledWith(
            'https://volleymanager.volleyball.ch/calendar/XYZ789'
          )
          expect(mockLoginWithCalendar).toHaveBeenCalledWith('XYZ789')
        })
      })
    })

    describe('Calendar Mode Loading State', () => {
      it('disables calendar input while validating', async () => {
        vi.mocked(calendarHelpers.extractCalendarCode).mockReturnValue('ABC123')
        // Use definite assignment assertion - resolve is assigned in Promise constructor
        let resolveValidation!: (value: { valid: boolean }) => void
        vi.mocked(calendarHelpers.validateCalendarCode).mockReturnValue(
          new Promise((resolve) => {
            resolveValidation = resolve
          })
        )

        render(<LoginPage />)

        fireEvent.click(screen.getByRole('tab', { name: 'auth.calendarMode' }))
        fireEvent.change(screen.getByTestId('calendar-input'), {
          target: { value: 'ABC123' },
        })
        fireEvent.click(screen.getByTestId('calendar-login-button'))

        await waitFor(() => {
          expect(screen.getByTestId('calendar-input')).toBeDisabled()
        })

        // Cleanup: resolve the validation
        resolveValidation({ valid: false })
      })

      it('shows loading text while validating', async () => {
        vi.mocked(calendarHelpers.extractCalendarCode).mockReturnValue('ABC123')
        let resolveValidation!: (value: { valid: boolean }) => void
        vi.mocked(calendarHelpers.validateCalendarCode).mockReturnValue(
          new Promise((resolve) => {
            resolveValidation = resolve
          })
        )

        render(<LoginPage />)

        fireEvent.click(screen.getByRole('tab', { name: 'auth.calendarMode' }))
        fireEvent.change(screen.getByTestId('calendar-input'), {
          target: { value: 'ABC123' },
        })
        fireEvent.click(screen.getByTestId('calendar-login-button'))

        await waitFor(() => {
          expect(screen.getByText(/enteringCalendarMode/i)).toBeInTheDocument()
        })

        // Cleanup
        resolveValidation({ valid: false })
      })
    })

    describe('Calendar Mode Error Handling', () => {
      it('shows validation failed error on network error', async () => {
        vi.mocked(calendarHelpers.extractCalendarCode).mockReturnValue('ABC123')
        vi.mocked(calendarHelpers.validateCalendarCode).mockRejectedValue(
          new Error('Network error')
        )

        render(<LoginPage />)

        fireEvent.click(screen.getByRole('tab', { name: 'auth.calendarMode' }))
        fireEvent.change(screen.getByTestId('calendar-input'), {
          target: { value: 'ABC123' },
        })
        fireEvent.click(screen.getByTestId('calendar-login-button'))

        await waitFor(() => {
          expect(screen.getByText(/calendarValidationFailed/i)).toBeInTheDocument()
        })
      })

      it('clears error when user starts typing', async () => {
        vi.mocked(calendarHelpers.extractCalendarCode).mockReturnValue(null)

        render(<LoginPage />)

        fireEvent.click(screen.getByRole('tab', { name: 'auth.calendarMode' }))
        fireEvent.change(screen.getByTestId('calendar-input'), {
          target: { value: 'bad' },
        })
        fireEvent.click(screen.getByTestId('calendar-login-button'))

        await waitFor(() => {
          expect(screen.getByText(/invalidCalendarCode/i)).toBeInTheDocument()
        })

        // Start typing again
        fireEvent.change(screen.getByTestId('calendar-input'), {
          target: { value: 'ABC123' },
        })

        expect(screen.queryByText(/invalidCalendarCode/i)).not.toBeInTheDocument()
      })
    })

    describe('Calendar Mode Accessibility', () => {
      it('has proper tab accessibility attributes', () => {
        render(<LoginPage />)

        const tablist = screen.getByRole('tablist')
        expect(tablist).toHaveAttribute('aria-label', 'Login mode')

        const fullTab = screen.getByRole('tab', { name: 'auth.fullLogin' })
        expect(fullTab).toHaveAttribute('aria-controls', 'full-login-panel')

        const calendarTab = screen.getByRole('tab', { name: 'auth.calendarMode' })
        expect(calendarTab).toHaveAttribute('aria-controls', 'calendar-login-panel')
      })

      it('has proper tabpanel accessibility attributes', () => {
        render(<LoginPage />)

        fireEvent.click(screen.getByRole('tab', { name: 'auth.calendarMode' }))

        const panel = screen.getByRole('tabpanel')
        expect(panel).toHaveAttribute('id', 'calendar-login-panel')
        expect(panel).toHaveAttribute('aria-labelledby', 'calendar-login-tab')
      })

      it('calendar input has required attribute', () => {
        render(<LoginPage />)

        fireEvent.click(screen.getByRole('tab', { name: 'auth.calendarMode' }))

        expect(screen.getByTestId('calendar-input')).toHaveAttribute('required')
      })
    })

    describe('Demo Mode in Calendar Tab', () => {
      it('demo button works in calendar mode tab', () => {
        render(<LoginPage />)

        fireEvent.click(screen.getByRole('tab', { name: 'auth.calendarMode' }))
        fireEvent.click(screen.getByRole('button', { name: /demo/i }))

        expect(mockInitializeDemoData).toHaveBeenCalledWith('SV')
        expect(mockSetDemoAuthenticated).toHaveBeenCalled()
        expect(mockNavigate).toHaveBeenCalledWith('/')
      })
    })
  })
})
