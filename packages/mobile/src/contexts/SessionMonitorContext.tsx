/**
 * Session monitoring context
 *
 * Provides session monitoring state and actions throughout the app.
 * Integrates with TanStack Query to detect 401/403 errors and trigger
 * biometric re-authentication when enabled.
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

import { AppState, type AppStateStatus } from 'react-native'

import { useStorage } from '@volleykit/shared/adapters'

import { BIOMETRIC_ENABLED_KEY } from '../constants'
import { biometrics } from '../platform/biometrics'
import { onAppForeground } from '../services/departure-reminder'

export interface SessionMonitorState {
  /** Whether the session has expired */
  isSessionExpired: boolean
  /** Whether we're showing the biometric prompt */
  showBiometricPrompt: boolean
  /** Whether biometric is enabled */
  biometricEnabled: boolean
}

export interface SessionMonitorContextValue extends SessionMonitorState {
  /** Mark session as expired (e.g., from 401 response) */
  handleSessionExpired: () => void
  /** Called when biometric auth succeeds */
  handleBiometricSuccess: () => void
  /** Called when user dismisses biometric prompt */
  dismissBiometricPrompt: () => void
  /** Check and update biometric enabled status */
  checkBiometricStatus: () => Promise<void>
}

const SessionMonitorContext = createContext<SessionMonitorContextValue | null>(null)

interface SessionMonitorProviderProps {
  children: ReactNode
}

export function SessionMonitorProvider({ children }: SessionMonitorProviderProps) {
  const { storage, secureStorage } = useStorage()

  const [state, setState] = useState<SessionMonitorState>({
    isSessionExpired: false,
    showBiometricPrompt: false,
    biometricEnabled: false,
  })

  const checkBiometricStatus = useCallback(async () => {
    try {
      const available = await biometrics.isAvailable()
      if (!available) {
        setState((prev) => ({ ...prev, biometricEnabled: false }))
        return
      }

      const storedEnabled = await storage.getItem(BIOMETRIC_ENABLED_KEY)
      const hasCredentials = await secureStorage.hasCredentials()

      setState((prev) => ({
        ...prev,
        biometricEnabled: storedEnabled === 'true' && hasCredentials,
      }))
    } catch {
      setState((prev) => ({ ...prev, biometricEnabled: false }))
    }
  }, [storage, secureStorage])

  // Check biometric status when app becomes active
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkBiometricStatus()
        onAppForeground().catch(() => {
          // Ignore cleanup errors on foreground
        })
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
      showBiometricPrompt: prev.biometricEnabled,
    }))
  }, [])

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

  const value: SessionMonitorContextValue = {
    ...state,
    handleSessionExpired,
    handleBiometricSuccess,
    dismissBiometricPrompt,
    checkBiometricStatus,
  }

  return <SessionMonitorContext.Provider value={value}>{children}</SessionMonitorContext.Provider>
}

/**
 * Hook to access session monitoring context.
 * Must be used within a SessionMonitorProvider.
 */
export function useSessionMonitorContext(): SessionMonitorContextValue {
  const context = useContext(SessionMonitorContext)
  if (!context) {
    throw new Error('useSessionMonitorContext must be used within a SessionMonitorProvider')
  }
  return context
}
