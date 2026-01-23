/**
 * Session monitoring hook
 *
 * Monitors API responses for session expiration (401/403 errors)
 * and triggers biometric re-authentication when enabled.
 */

import { useState, useCallback, useEffect } from 'react'

import { AppState, type AppStateStatus } from 'react-native'

import { useBiometricAuth } from './useBiometricAuth'

export interface SessionMonitorState {
  /** Whether the session has expired */
  isSessionExpired: boolean
  /** Whether we're showing the biometric prompt */
  showBiometricPrompt: boolean
}

export interface UseSessionMonitorResult extends SessionMonitorState {
  /** Mark session as expired (e.g., from 401 response) */
  handleSessionExpired: () => void
  /** Called when biometric auth succeeds */
  handleBiometricSuccess: () => void
  /** Called when user dismisses biometric prompt */
  dismissBiometricPrompt: () => void
}

export function useSessionMonitor(): UseSessionMonitorResult {
  const { isEnabled: biometricEnabled, checkBiometricStatus } = useBiometricAuth()

  const [state, setState] = useState<SessionMonitorState>({
    isSessionExpired: false,
    showBiometricPrompt: false,
  })

  // Check biometric status when app becomes active
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkBiometricStatus()
      }
    })

    // Initial check
    checkBiometricStatus()

    return () => {
      subscription.remove()
    }
  }, [checkBiometricStatus])

  const handleSessionExpired = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isSessionExpired: true,
      showBiometricPrompt: biometricEnabled,
    }))
  }, [biometricEnabled])

  const handleBiometricSuccess = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isSessionExpired: false,
      showBiometricPrompt: false,
    }))
  }, [])

  const dismissBiometricPrompt = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showBiometricPrompt: false,
    }))
  }, [])

  return {
    ...state,
    handleSessionExpired,
    handleBiometricSuccess,
    dismissBiometricPrompt,
  }
}
