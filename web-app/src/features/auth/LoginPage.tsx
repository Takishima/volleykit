import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react'

import { useNavigate } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'

import { usePWA } from '@/contexts/PWAContext'
import {
  extractCalendarCode,
  validateCalendarCode,
} from '@/features/assignments/utils/calendar-helpers'
import { LoginErrorWithUpdateHint } from '@/features/auth/components/LoginErrorWithUpdateHint'
import { LoginUpdateBanner } from '@/features/auth/components/LoginUpdateBanner'
import { Button } from '@/shared/components/Button'
import { Volleyball } from '@/shared/components/icons'
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { useAuthStore, NO_REFEREE_ROLE_ERROR_KEY } from '@/shared/stores/auth'
import { useDemoStore } from '@/shared/stores/demo'
import { getHelpSiteUrl } from '@/shared/utils/constants'

// Demo-only mode restricts the app to demo mode (used in PR preview deployments)
const DEMO_MODE_ONLY = import.meta.env.VITE_DEMO_MODE_ONLY === 'true'

/** Interval for lockout countdown timer (1 second in milliseconds) */
const LOCKOUT_COUNTDOWN_INTERVAL_MS = 1000

type LoginMode = 'full' | 'calendar'

export function LoginPage() {
  const navigate = useNavigate()
  const {
    login,
    loginWithCalendar,
    status,
    error,
    lockedUntil,
    setDemoAuthenticated,
    clearStaleSession,
  } = useAuthStore(
    useShallow((state) => ({
      login: state.login,
      loginWithCalendar: state.loginWithCalendar,
      status: state.status,
      error: state.error,
      lockedUntil: state.lockedUntil,
      setDemoAuthenticated: state.setDemoAuthenticated,
      clearStaleSession: state.clearStaleSession,
    }))
  )
  const initializeDemoData = useDemoStore((state) => state.initializeDemoData)
  const { t } = useTranslation()
  const { needRefresh, updateApp, checkForUpdate, isChecking: isCheckingForUpdate } = usePWA()

  // Track if we've checked for updates after a login failure
  // This helps show the update hint to users on iOS PWA where service worker
  // update detection is unreliable
  const [checkedForUpdateAfterError, setCheckedForUpdateAfterError] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const [loginMode, setLoginMode] = useState<LoginMode>('calendar')
  const [username, setUsername] = useState('')
  const [calendarInput, setCalendarInput] = useState('')
  const [calendarError, setCalendarError] = useState<string | null>(null)
  const [isValidatingCalendar, setIsValidatingCalendar] = useState(false)
  const [lockoutCountdown, setLockoutCountdown] = useState<number | null>(null)
  // Use ref for password to minimize memory exposure (avoids re-renders with password in state)
  const passwordRef = useRef<HTMLInputElement>(null)
  // Form ref for manual validation trigger (needed since button is type="button")
  const formRef = useRef<HTMLFormElement>(null)
  const calendarFormRef = useRef<HTMLFormElement>(null)
  // Ref to prevent race condition with double submission
  // State updates are async, so we need a synchronous guard
  const isSubmittingRef = useRef(false)
  // AbortController ref for cancelling calendar validation on unmount
  const calendarValidationAbortRef = useRef<AbortController | null>(null)

  const isLoading = status === 'loading' || isValidatingCalendar

  const handleDemoLogin = useCallback(() => {
    // Initialize with SV (Swiss Volley national) association as default
    // User can switch to other associations via the occupation dropdown
    initializeDemoData('SV')
    setDemoAuthenticated()
    navigate('/')
  }, [initializeDemoData, setDemoAuthenticated, navigate])

  // In demo-only mode (PR previews), calendar mode is allowed but full login is not
  // No auto-redirect - let users choose between calendar mode and demo mode

  // Cleanup: abort any pending calendar validation on unmount
  useEffect(() => {
    return () => {
      calendarValidationAbortRef.current?.abort()
    }
  }, [])

  // Clear stale session data on mount and when app resumes from suspension.
  // On iOS PWA, cached CSRF tokens can become stale and cause "invalid credentials"
  // errors even with correct username/password. This also handles the case where
  // the app was suspended and resumed - the component doesn't remount, but the
  // visibilitychange/pageshow events fire.
  useEffect(() => {
    // Clear on mount
    clearStaleSession()

    // Also clear when app resumes from background (iOS PWA suspension)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        clearStaleSession()
      }
    }

    // pageshow event is more reliable on iOS Safari PWA for detecting
    // app resume from suspension. The persisted property indicates if
    // the page was restored from bfcache (back-forward cache).
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        clearStaleSession()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pageshow', handlePageShow)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [clearStaleSession])

  // Countdown timer for lockout - ticks every second until lockout expires
  useEffect(() => {
    if (!lockedUntil || lockedUntil <= 0) {
      setLockoutCountdown(null)
      return
    }

    setLockoutCountdown(lockedUntil)

    const interval = setInterval(() => {
      setLockoutCountdown((prev) => {
        if (!prev || prev <= 1) {
          clearInterval(interval)
          return null
        }
        return prev - 1
      })
    }, LOCKOUT_COUNTDOWN_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [lockedUntil])

  // Check for updates when login fails - helps detect updates on iOS PWA
  // where service worker update detection is unreliable
  useEffect(() => {
    const hasError = error || calendarError
    if (hasError && !checkedForUpdateAfterError && !needRefresh) {
      setCheckedForUpdateAfterError(true)
      // Trigger update check - if an update is found, needRefresh will become true
      checkForUpdate()
    }
    // Reset when error clears (user trying again)
    if (!hasError) {
      setCheckedForUpdateAfterError(false)
    }
  }, [error, calendarError, checkedForUpdateAfterError, needRefresh, checkForUpdate])

  // Handle update button click
  const handleUpdate = useCallback(async () => {
    if (isUpdating) return
    setIsUpdating(true)
    try {
      await updateApp()
    } finally {
      // Note: updateApp() typically reloads, so this may not execute
      setIsUpdating(false)
    }
  }, [isUpdating, updateApp])

  // Determine if login should be disabled due to lockout
  const isLockedOut = lockoutCountdown !== null && lockoutCountdown > 0

  function handleCalendarInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCalendarInput(e.target.value)
    // Clear error when user starts typing
    if (calendarError) {
      setCalendarError(null)
    }
  }

  async function handleSubmit(e: FormEvent) {
    // Prevent native form submission - critical for iOS autofill compatibility
    // iOS Safari's password autofill can trigger native form submission,
    // bypassing React's event handling in some cases
    e.preventDefault()
    e.stopPropagation()
    await performLogin()
  }

  async function performLogin() {
    // Use ref for synchronous double-submit prevention (state updates are async)
    if (isSubmittingRef.current || isLoading) return

    // Trigger HTML5 form validation (needed since button is type="button")
    // reportValidity() shows validation messages and returns false if invalid
    if (formRef.current && !formRef.current.reportValidity()) {
      return
    }

    isSubmittingRef.current = true

    try {
      const password = passwordRef.current?.value || ''
      const success = await login(username, password)
      if (success) {
        // Clear password field after successful login
        if (passwordRef.current) {
          passwordRef.current.value = ''
        }
        navigate('/')
      }
    } finally {
      isSubmittingRef.current = false
    }
  }

  async function handleCalendarSubmit(e: FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    await performCalendarLogin()
  }

  async function performCalendarLogin() {
    if (isSubmittingRef.current || isLoading) return

    if (calendarFormRef.current && !calendarFormRef.current.reportValidity()) {
      return
    }

    // Extract calendar code from input (could be URL or just code)
    const code = extractCalendarCode(calendarInput)
    if (!code) {
      setCalendarError('auth.invalidCalendarCode')
      return
    }

    // Abort any previous validation request
    calendarValidationAbortRef.current?.abort()
    const abortController = new AbortController()
    calendarValidationAbortRef.current = abortController

    isSubmittingRef.current = true
    setIsValidatingCalendar(true)
    setCalendarError(null)

    try {
      // Validate the calendar code by checking the API
      const result = await validateCalendarCode(code, abortController.signal)

      // Don't update state if the request was aborted (component unmounted)
      if (abortController.signal.aborted) {
        return
      }

      if (!result.valid) {
        setCalendarError(result.error ?? 'auth.calendarValidationFailed')
        return
      }

      // Login with the validated calendar code
      await loginWithCalendar(code)
      navigate('/')
    } catch (error) {
      // Ignore AbortError - component was unmounted or new request started
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      setCalendarError('auth.calendarValidationFailed')
    } finally {
      isSubmittingRef.current = false
      // Only update state if this controller wasn't aborted
      if (!abortController.signal.aborted) {
        setIsValidatingCalendar(false)
      }
    }
  }

  // Handle Enter key on password field to trigger login
  // This provides keyboard submit without relying on form submission
  function handlePasswordKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault()
      performLogin()
    }
  }

  function handleCalendarInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault()
      performCalendarLogin()
    }
  }

  // Get translated error message
  function getErrorMessage(errorKey: string): string {
    if (errorKey === NO_REFEREE_ROLE_ERROR_KEY) {
      return t('auth.noRefereeRole')
    }
    if (errorKey === 'auth.invalidCalendarCode') {
      return t('auth.invalidCalendarCode')
    }
    if (errorKey === 'auth.calendarNotFound') {
      return t('auth.calendarNotFound')
    }
    if (errorKey === 'auth.calendarValidationFailed') {
      return t('auth.calendarValidationFailed')
    }
    // Handle lockout error with countdown
    if (isLockedOut && lockoutCountdown) {
      return `${t('auth.accountLocked')} - ${t('auth.lockoutRemainingTime')} ${lockoutCountdown} ${t('auth.lockoutSeconds')}`
    }
    return errorKey
  }

  // In demo-only mode (PR previews), we show the login form but only with
  // Calendar mode and Demo options - Full Login is hidden for security
  // (full login would require real credentials)

  const displayError = loginMode === 'calendar' ? calendarError : error

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-page dark:bg-surface-page-dark px-4">
      <div className="w-full max-w-md">
        {/* Language Switcher */}
        <LanguageSwitcher className="mb-6" />

        {/* Logo */}
        <div className="text-center mb-8">
          <Volleyball
            className="w-16 h-16 text-primary-600 dark:text-primary-400 mx-auto"
            aria-hidden="true"
          />
          <h1 className="mt-4 text-3xl font-bold text-text-primary dark:text-text-primary-dark">
            VolleyKit
          </h1>
          <p className="mt-2 text-text-muted dark:text-text-muted-dark">{t('auth.subtitle')}</p>
        </div>

        {/* Update banner - shown when PWA needs update to prevent login errors */}
        {needRefresh && <LoginUpdateBanner onUpdate={updateApp} />}

        {/* Login form */}
        <div className="card p-6">
          {/* Login mode tabs - hidden in demo-only mode since only calendar is allowed */}
          {!DEMO_MODE_ONLY && (
            <div
              className="flex mb-6 bg-surface-subtle dark:bg-surface-subtle-dark rounded-lg p-1"
              role="tablist"
              aria-label="Login mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={loginMode === 'calendar'}
                aria-controls="calendar-login-panel"
                id="calendar-login-tab"
                data-testid="calendar-login-tab"
                onClick={() => setLoginMode('calendar')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  loginMode === 'calendar'
                    ? 'bg-surface-card dark:bg-surface-card-dark text-text-primary dark:text-text-primary-dark shadow-sm'
                    : 'text-text-muted dark:text-text-muted-dark hover:text-text-secondary dark:hover:text-text-secondary-dark'
                }`}
              >
                {t('auth.calendarMode')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={loginMode === 'full'}
                aria-controls="full-login-panel"
                id="full-login-tab"
                data-testid="full-login-tab"
                onClick={() => setLoginMode('full')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  loginMode === 'full'
                    ? 'bg-surface-card dark:bg-surface-card-dark text-text-primary dark:text-text-primary-dark shadow-sm'
                    : 'text-text-muted dark:text-text-muted-dark hover:text-text-secondary dark:hover:text-text-secondary-dark'
                }`}
              >
                {t('auth.fullLogin')}
              </button>
            </div>
          )}

          {/* Full Login Panel - only shown when tab is selected (tabs hidden in demo-only mode) */}
          {loginMode === 'full' && (
            <div id="full-login-panel" role="tabpanel" aria-labelledby="full-login-tab">
              {/* method="post" is defensive fallback if native submission somehow occurs */}
              <form ref={formRef} onSubmit={handleSubmit} method="post" className="space-y-6">
                <div>
                  <label
                    htmlFor="username"
                    className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-2"
                  >
                    {t('auth.username')}
                  </label>
                  <input
                    id="username"
                    data-testid="username-input"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                    disabled={isLoading}
                    className="input"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-2"
                  >
                    {t('auth.password')}
                  </label>
                  <input
                    id="password"
                    data-testid="password-input"
                    type="password"
                    ref={passwordRef}
                    autoComplete="current-password"
                    required
                    disabled={isLoading}
                    onKeyDown={handlePasswordKeyDown}
                    className="input"
                  />
                </div>

                {displayError && (
                  <LoginErrorWithUpdateHint
                    errorMessage={getErrorMessage(displayError)}
                    showUpdateHint={checkedForUpdateAfterError && !isLockedOut}
                    updateAvailable={needRefresh}
                    onUpdate={handleUpdate}
                    isUpdating={isUpdating}
                    isCheckingForUpdate={isCheckingForUpdate}
                  />
                )}

                <Button
                  type="button"
                  variant="primary"
                  fullWidth
                  loading={isLoading}
                  disabled={isLockedOut || needRefresh}
                  onClick={performLogin}
                  data-testid="login-button"
                >
                  {isLoading ? t('auth.loggingIn') : t('auth.loginButton')}
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border-strong dark:border-border-strong-dark" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-surface-card dark:bg-surface-card-dark px-2 text-text-muted dark:text-text-muted-dark">
                      {t('auth.or')}
                    </span>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  onClick={handleDemoLogin}
                  disabled={isLoading}
                  fullWidth
                  data-testid="demo-button"
                >
                  {t('auth.demoMode')}
                </Button>
              </form>
            </div>
          )}

          {/* Calendar Mode Panel */}
          {loginMode === 'calendar' && (
            <div id="calendar-login-panel" role="tabpanel" aria-labelledby="calendar-login-tab">
              <form
                ref={calendarFormRef}
                onSubmit={handleCalendarSubmit}
                method="post"
                className="space-y-6"
              >
                {/* Info box */}
                <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                  <p className="text-sm text-primary-700 dark:text-primary-300">
                    {t('auth.calendarModeInfo')}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="calendar-input"
                    className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-2"
                  >
                    {t('auth.calendarInputLabel')}
                  </label>
                  <input
                    id="calendar-input"
                    data-testid="calendar-input"
                    type="text"
                    value={calendarInput}
                    onChange={handleCalendarInputChange}
                    placeholder={t('auth.calendarInputPlaceholder')}
                    required
                    disabled={isLoading}
                    onKeyDown={handleCalendarInputKeyDown}
                    className="input"
                  />
                  <p className="mt-2 text-xs text-text-muted dark:text-text-muted-dark">
                    {t('auth.calendarModeHint')}
                  </p>
                </div>

                {displayError && (
                  <LoginErrorWithUpdateHint
                    errorMessage={getErrorMessage(displayError)}
                    showUpdateHint={checkedForUpdateAfterError}
                    updateAvailable={needRefresh}
                    onUpdate={handleUpdate}
                    isUpdating={isUpdating}
                    isCheckingForUpdate={isCheckingForUpdate}
                  />
                )}

                <Button
                  type="button"
                  variant="primary"
                  fullWidth
                  loading={isLoading}
                  disabled={needRefresh}
                  onClick={performCalendarLogin}
                  data-testid="calendar-login-button"
                >
                  {isLoading ? t('auth.enteringCalendarMode') : t('auth.enterCalendarMode')}
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border-strong dark:border-border-strong-dark" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-surface-card dark:bg-surface-card-dark px-2 text-text-muted dark:text-text-muted-dark">
                      {t('auth.or')}
                    </span>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  onClick={handleDemoLogin}
                  disabled={isLoading}
                  fullWidth
                  data-testid="demo-button"
                >
                  {t('auth.demoMode')}
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Info */}
        <p className="mt-6 text-center text-xs text-text-subtle dark:text-text-subtle-dark">
          {loginMode === 'full' ? (
            <>
              {t('auth.loginInfo')}
              <br />
              {t('auth.privacyNote')}
            </>
          ) : (
            t('auth.calendarModeInfo')
          )}
        </p>

        {/* Help link */}
        <p className="mt-4 text-center">
          <a
            href={getHelpSiteUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-text-muted dark:text-text-muted-dark hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            {t('auth.learnHowItWorks')} &rarr;
          </a>
        </p>
      </div>
    </div>
  )
}
