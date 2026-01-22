/**
 * Login screen with SwissVolley credential form
 *
 * Supports biometric quick login when enabled and available.
 * Falls back to password entry after 3 failed biometric attempts.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useTranslation } from '@volleykit/shared/i18n';

import { COLORS } from '../constants';
import { useBiometricAuth } from '../hooks/useBiometricAuth';
import { login } from '../services/authService';

import type { RootStackScreenProps } from '../navigation/types';

type Props = RootStackScreenProps<'Login'>;

export function LoginScreen(_props: Props) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track pending auto-login after biometric authentication
  const pendingBiometricLoginRef = useRef(false);

  // Biometric authentication
  const {
    isEnabled: biometricEnabled,
    biometricType,
    biometricTypeName,
    shouldFallbackToPassword,
    isAuthenticating,
    checkBiometricStatus,
    authenticate,
    resetAttempts,
  } = useBiometricAuth();

  // Check biometric status on mount
  useEffect(() => {
    checkBiometricStatus();
  }, [checkBiometricStatus]);

  // Show biometric option if enabled and not fallen back to password
  const showBiometricOption = biometricEnabled && !shouldFallbackToPassword;

  // Get biometric icon name
  const biometricIcon: 'face-recognition' | 'fingerprint' =
    biometricType === 'faceId' ? 'face-recognition' : 'fingerprint';

  // Handle biometric login
  const handleBiometricLogin = useCallback(async () => {
    const result = await authenticate(t('auth.biometricPrompt'));

    if (result.success && result.credentials) {
      // Clear any existing credentials first to ensure clean state,
      // preventing race conditions if user had partially filled the form
      setUsername('');
      setPassword('');
      setError(null);
      // Mark pending auto-login - the useEffect will trigger handleLogin
      // once the credentials state is updated
      pendingBiometricLoginRef.current = true;
      setUsername(result.credentials.username);
      setPassword(result.credentials.password);
    } else if (!result.success) {
      setError(t('auth.biometricFailed'));
    }
  }, [authenticate, t]);

  // Reset biometric attempts when user starts typing (manual password entry)
  const handleUsernameChange = useCallback(
    (text: string) => {
      setUsername(text);
      if (shouldFallbackToPassword) {
        resetAttempts();
      }
    },
    [shouldFallbackToPassword, resetAttempts]
  );

  const handleLogin = useCallback(async () => {
    // Guard against concurrent calls (e.g., biometric auto-login + manual tap)
    if (isLoading) return;

    if (!username || !password) {
      setError(t('auth.enterCredentials'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await login(username, password);

      if (!result.success) {
        // Handle specific error messages
        if (result.lockedUntil) {
          setError(t('auth.accountLocked'));
        } else if (result.error.includes('Two-factor')) {
          setError(t('auth.tfaNotSupported'));
        } else if (result.error.includes('No referee role')) {
          setError(t('auth.noRefereeRole'));
        } else {
          setError(t('auth.invalidCredentials'));
        }
      }
      // On success, the auth store is updated and navigation will happen automatically
    } catch {
      setError(t('auth.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [username, password, t, isLoading]);

  // Auto-login after biometric authentication fills credentials
  useEffect(() => {
    if (pendingBiometricLoginRef.current && username && password) {
      pendingBiometricLoginRef.current = false;
      handleLogin();
    }
  }, [username, password, handleLogin]);

  return (
    <View className="flex-1 bg-white px-6 pt-20">
      <View className="mb-8">
        <Text className="text-3xl font-bold text-gray-900">VolleyKit</Text>
        <Text className="text-lg text-gray-600 mt-2">{t('auth.subtitle')}</Text>
      </View>

      {error && (
        <View
          className="bg-red-50 p-4 rounded-lg mb-4"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <Text className="text-red-700">{error}</Text>
        </View>
      )}

      <View className="gap-4">
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">{t('auth.username')}</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 text-base"
            value={username}
            onChangeText={handleUsernameChange}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            placeholder={t('auth.usernamePlaceholder')}
            accessibilityLabel={t('auth.username')}
            accessibilityHint={t('auth.usernamePlaceholder')}
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">{t('auth.password')}</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 text-base"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            placeholder={t('auth.passwordPlaceholder')}
            accessibilityLabel={t('auth.password')}
            accessibilityHint={t('auth.passwordPlaceholder')}
          />
        </View>

        <TouchableOpacity
          className="bg-primary-600 rounded-lg py-4 mt-4"
          onPress={handleLogin}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel={t('auth.loginButton')}
          accessibilityState={{ disabled: isLoading }}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center font-semibold text-base">
              {t('auth.loginButton')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Biometric quick login option */}
        {showBiometricOption && (
          <TouchableOpacity
            className="flex-row items-center justify-center py-4 mt-2"
            onPress={handleBiometricLogin}
            disabled={isAuthenticating}
            accessibilityRole="button"
            accessibilityLabel={t('auth.authenticateWith', { biometricType: biometricTypeName })}
          >
            <MaterialCommunityIcons
              name={biometricIcon}
              size={24}
              color={isAuthenticating ? COLORS.gray400 : COLORS.primary}
            />
            <Text
              className={`ml-2 font-medium ${isAuthenticating ? 'text-gray-400' : 'text-sky-500'}`}
            >
              {isAuthenticating ? t('common.loading') : t('auth.useBiometric', { biometricType: biometricTypeName })}
            </Text>
          </TouchableOpacity>
        )}

        {/* Fallback notice when biometric failed too many times */}
        {shouldFallbackToPassword && biometricEnabled && (
          <Text className="text-center text-gray-500 text-sm mt-2">
            {t('auth.biometricFailed')}. {t('auth.enterCredentials')}.
          </Text>
        )}
      </View>
    </View>
  );
}
