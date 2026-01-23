/**
 * Root navigator with auth flow handling
 *
 * Handles authentication flow and biometric re-authentication on session expiry.
 */

import { useCallback } from 'react'

import { NavigationContainer, type LinkingOptions } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { useAuth } from '@volleykit/shared/hooks'
import { useTranslation } from '@volleykit/shared/i18n'

import { TabNavigator } from './TabNavigator'
import { BiometricPrompt } from '../components/BiometricPrompt'
import { OfflineBanner } from '../components/OfflineBanner'
import { MAX_BIOMETRIC_ATTEMPTS } from '../constants'
import { useSessionMonitorContext } from '../contexts'
import { useBiometricAuth } from '../hooks/useBiometricAuth'
import { AssignmentDetailScreen } from '../screens/AssignmentDetailScreen'
import { BiometricSettingsScreen } from '../screens/BiometricSettingsScreen'
import { CalendarSettingsScreen } from '../screens/CalendarSettingsScreen'
import { DepartureReminderSettingsScreen } from '../screens/DepartureReminderSettingsScreen'
import { LoadingScreen } from '../screens/LoadingScreen'
import { LoginScreen } from '../screens/LoginScreen'
import { login } from '../services/authService'

import type { RootStackParamList } from './types'

const Stack = createNativeStackNavigator<RootStackParamList>()

// Deep linking configuration
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['volleykit://'],
  config: {
    screens: {
      Login: 'login',
      Loading: 'loading',
      Main: {
        screens: {
          Assignments: 'assignments',
          Compensations: 'compensations',
          Exchanges: 'exchanges',
          Settings: 'settings',
        },
      },
      AssignmentDetail: 'assignment/:id',
      BiometricSettings: 'settings/biometric',
      CalendarSettings: 'settings/calendar',
      DepartureReminderSettings: 'settings/departure',
    },
  },
}

export function RootNavigator() {
  const { isAuthenticated, isLoading, logout } = useAuth()
  const { t } = useTranslation()

  // Biometric authentication state
  const {
    biometricType,
    biometricTypeName,
    failedAttempts,
    isAuthenticating,
    authenticate,
    resetAttempts,
  } = useBiometricAuth()

  // Session monitoring from context (integrates with QueryClient error handling)
  const { showBiometricPrompt, handleBiometricSuccess, dismissBiometricPrompt } =
    useSessionMonitorContext()

  // Handle fallback to password entry (logs out to show login screen)
  const handleFallbackToPassword = useCallback(() => {
    dismissBiometricPrompt()
    resetAttempts()
    logout()
  }, [dismissBiometricPrompt, resetAttempts, logout])

  // Handle biometric authentication attempt
  const handleBiometricAuthenticate = useCallback(async () => {
    const result = await authenticate(t('auth.biometricPrompt'))

    if (result.success && result.credentials) {
      // Biometric verified - credentials retrieved, now re-login
      // Note: `login` is a module-level import and stable, so not included in deps
      const loginResult = await login(
        result.credentials.username,
        result.credentials.password,
        false // Don't save credentials again
      )

      if (loginResult.success) {
        handleBiometricSuccess()
        resetAttempts()
      } else {
        // Login failed (e.g., password changed on server) - fall back to password entry
        handleFallbackToPassword()
      }
    }
  }, [authenticate, handleBiometricSuccess, resetAttempts, t, handleFallbackToPassword])

  // Handle cancel (just dismiss the prompt)
  const handleCancel = useCallback(() => {
    dismissBiometricPrompt()
  }, [dismissBiometricPrompt])

  return (
    <NavigationContainer linking={linking}>
      {/* Global offline indicator */}
      <OfflineBanner />

      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoading ? (
          <Stack.Screen name="Loading" component={LoadingScreen} />
        ) : isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen
              name="AssignmentDetail"
              component={AssignmentDetailScreen}
              options={{ headerShown: true, title: 'Assignment' }}
            />
            <Stack.Screen
              name="BiometricSettings"
              component={BiometricSettingsScreen}
              options={{ headerShown: true, title: 'Biometric Login' }}
            />
            <Stack.Screen
              name="CalendarSettings"
              component={CalendarSettingsScreen}
              options={{ headerShown: true, title: 'Calendar Sync' }}
            />
            <Stack.Screen
              name="DepartureReminderSettings"
              component={DepartureReminderSettingsScreen}
              options={{ headerShown: true, title: 'Smart Departure' }}
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>

      {/* Biometric re-authentication prompt */}
      <BiometricPrompt
        visible={showBiometricPrompt}
        biometricType={biometricType}
        biometricTypeName={biometricTypeName}
        failedAttempts={failedAttempts}
        maxAttempts={MAX_BIOMETRIC_ATTEMPTS}
        isAuthenticating={isAuthenticating}
        onAuthenticate={handleBiometricAuthenticate}
        onFallbackToPassword={handleFallbackToPassword}
        onCancel={handleCancel}
      />
    </NavigationContainer>
  )
}
