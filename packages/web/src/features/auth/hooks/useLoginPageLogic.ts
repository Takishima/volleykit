/**
 * Login page logic hook — extracts all state, effects, and handlers
 * from LoginPage.tsx into a single hook following the use*PageLogic pattern.
 */

import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react'

import { useNavigate } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'

import { useTranslation } from '@/common/hooks/useTranslation'
import {
  extractCalendarCode,
  validateCalendarCode,
} from '@/common/services/calendar/calendar-helpers'
import { useAuthStore, NO_REFEREE_ROLE_ERROR_KEY } from '@/common/stores/auth'
import { useDemoStore } from '@/common/stores/demo'
import { usePWA } from '@/contexts/PWAContext'

/** Interval for lockout countdown timer (1 second in milliseconds) */
const LOCKOUT_COUNTDOWN_INTERVAL_MS = 1000

export type LoginMode = 'full' | 'calendar'

export function useLoginPageLogic() {
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
  const isSubmittingRef = useRef(false)
  // AbortController ref for cancelling calendar validation on unmount
  const calendarValidationAbortRef = useRef<AbortController | null>(null)

  const isLoading = status === 'loading' || isValidatingCalendar

  const handleDemoLogin = useCallback(() => {
    initializeDemoData('SV')
    setDemoAuthenticated()
    navigate('/')
  }, [initializeDemoData, setDemoAuthenticated, navigate])

  // Cleanup: abort any pending calendar validation on unmount
  useEffect(() => {
    return () => {
      calendarValidationAbortRef.current?.abort()
    }
  }, [])

  // Clear stale session data on mount and when app resumes from suspension.
  useEffect(() => {
    clearStaleSession()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        clearStaleSession()
      }
    }

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

  // Countdown timer for lockout
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

  // Check for updates when login fails
  useEffect(() => {
    const hasError = error || calendarError
    if (hasError && !checkedForUpdateAfterError && !needRefresh) {
      setCheckedForUpdateAfterError(true)
      checkForUpdate()
    }
    if (!hasError) {
      setCheckedForUpdateAfterError(false)
    }
  }, [error, calendarError, checkedForUpdateAfterError, needRefresh, checkForUpdate])

  const handleUpdate = useCallback(async () => {
    if (isUpdating) return
    setIsUpdating(true)
    try {
      await updateApp()
    } finally {
      setIsUpdating(false)
    }
  }, [isUpdating, updateApp])

  const isLockedOut = lockoutCountdown !== null && lockoutCountdown > 0

  function handleCalendarInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCalendarInput(e.target.value)
    if (calendarError) {
      setCalendarError(null)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    await performLogin()
  }

  async function performLogin() {
    if (isSubmittingRef.current || isLoading) return

    if (formRef.current && !formRef.current.reportValidity()) {
      return
    }

    isSubmittingRef.current = true

    try {
      const password = passwordRef.current?.value || ''
      const success = await login(username, password)
      if (success) {
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
    await performCalendarLoginFlow()
  }

  async function performCalendarLoginFlow() {
    if (isSubmittingRef.current || isLoading) return

    if (calendarFormRef.current && !calendarFormRef.current.reportValidity()) {
      return
    }

    const code = extractCalendarCode(calendarInput)
    if (!code) {
      setCalendarError('auth.invalidCalendarCode')
      return
    }

    calendarValidationAbortRef.current?.abort()
    const abortController = new AbortController()
    calendarValidationAbortRef.current = abortController

    isSubmittingRef.current = true
    setIsValidatingCalendar(true)
    setCalendarError(null)

    try {
      const result = await validateCalendarCode(code, abortController.signal)

      if (abortController.signal.aborted) {
        return
      }

      if (!result.valid) {
        setCalendarError(result.error ?? 'auth.calendarValidationFailed')
        return
      }

      await loginWithCalendar(code)
      navigate('/')
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      setCalendarError('auth.calendarValidationFailed')
    } finally {
      isSubmittingRef.current = false
      if (!abortController.signal.aborted) {
        setIsValidatingCalendar(false)
      }
    }
  }

  function handlePasswordKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault()
      performLogin()
    }
  }

  function handleCalendarInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault()
      performCalendarLoginFlow()
    }
  }

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
    if (isLockedOut && lockoutCountdown) {
      return `${t('auth.accountLocked')} - ${t('auth.lockoutRemainingTime')} ${lockoutCountdown} ${t('auth.lockoutSeconds')}`
    }
    return errorKey
  }

  const displayError = loginMode === 'calendar' ? calendarError : error

  return {
    // State
    loginMode,
    setLoginMode,
    username,
    setUsername,
    calendarInput,
    isLoading,
    isLockedOut,
    isUpdating,
    isCheckingForUpdate,
    checkedForUpdateAfterError,
    needRefresh,
    displayError,
    lockoutCountdown,

    // Refs (for form elements)
    passwordRef,
    formRef,
    calendarFormRef,

    // Handlers
    handleSubmit,
    handleCalendarSubmit,
    performLogin,
    performCalendarLogin: performCalendarLoginFlow,
    handleDemoLogin,
    handleUpdate,
    handleCalendarInputChange,
    handlePasswordKeyDown,
    handleCalendarInputKeyDown,
    getErrorMessage,
    updateApp,
    t,
  }
}
