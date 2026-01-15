/**
 * Root navigator with auth flow handling
 *
 * Handles authentication flow and biometric re-authentication on session expiry.
 */

import { useCallback } from 'react';
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '@volleykit/shared/hooks';
import { useTranslation } from '@volleykit/shared/i18n';

import { LoginScreen } from '../screens/LoginScreen';
import { LoadingScreen } from '../screens/LoadingScreen';
import { AssignmentDetailScreen } from '../screens/AssignmentDetailScreen';
import { BiometricSettingsScreen } from '../screens/BiometricSettingsScreen';
import { CalendarSettingsScreen } from '../screens/CalendarSettingsScreen';
import { TabNavigator } from './TabNavigator';
import { BiometricPrompt } from '../components/BiometricPrompt';
import { useSessionMonitorContext } from '../contexts';
import { useBiometricAuth } from '../hooks/useBiometricAuth';
import { MAX_BIOMETRIC_ATTEMPTS } from '../constants';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

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
};

export function RootNavigator() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const { t } = useTranslation();

  // Biometric authentication state
  const {
    biometricType,
    biometricTypeName,
    failedAttempts,
    isAuthenticating,
    authenticate,
    resetAttempts,
  } = useBiometricAuth();

  // Session monitoring from context (integrates with QueryClient error handling)
  const {
    showBiometricPrompt,
    handleBiometricSuccess,
    dismissBiometricPrompt,
  } = useSessionMonitorContext();

  // Handle biometric authentication attempt
  const handleBiometricAuthenticate = useCallback(async () => {
    const result = await authenticate(t('auth.biometricPrompt'));

    if (result.success && result.credentials) {
      // Biometric verified - credentials retrieved successfully
      // TODO(#47): Implement actual re-login with credentials when auth API is ready
      // For now, just mark the session as refreshed
      handleBiometricSuccess();
      resetAttempts();
    }
  }, [authenticate, handleBiometricSuccess, resetAttempts, t]);

  // Handle fallback to password entry (logs out to show login screen)
  const handleFallbackToPassword = useCallback(() => {
    dismissBiometricPrompt();
    resetAttempts();
    logout();
  }, [dismissBiometricPrompt, resetAttempts, logout]);

  // Handle cancel (just dismiss the prompt)
  const handleCancel = useCallback(() => {
    dismissBiometricPrompt();
  }, [dismissBiometricPrompt]);

  return (
    <NavigationContainer linking={linking}>
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
  );
}
