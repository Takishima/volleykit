/**
 * Biometric prompt component
 *
 * Displays a modal prompt for biometric authentication.
 * Used when session expires and biometric re-auth is enabled.
 */

import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useTranslation } from '@volleykit/shared/i18n';
import { COLORS, BIOMETRIC_ICON_SIZE } from '../constants';

interface BiometricPromptProps {
  /** Whether the prompt is visible */
  visible: boolean;
  /** Biometric type for display */
  biometricType: 'faceId' | 'touchId' | 'fingerprint' | null;
  /** Biometric type name for display */
  biometricTypeName: string;
  /** Number of failed attempts */
  failedAttempts: number;
  /** Maximum attempts before fallback */
  maxAttempts: number;
  /** Whether authentication is in progress */
  isAuthenticating: boolean;
  /** Called when user taps to authenticate */
  onAuthenticate: () => void;
  /** Called when user chooses to enter password instead */
  onFallbackToPassword: () => void;
  /** Called when user cancels */
  onCancel: () => void;
}

/**
 * Get the icon name for the biometric type
 */
function getBiometricIcon(type: 'faceId' | 'touchId' | 'fingerprint' | null): 'face-recognition' | 'fingerprint' {
  switch (type) {
    case 'faceId':
      return 'face-recognition';
    case 'touchId':
    case 'fingerprint':
    default:
      return 'fingerprint';
  }
}

export function BiometricPrompt({
  visible,
  biometricType,
  biometricTypeName,
  failedAttempts,
  maxAttempts,
  isAuthenticating,
  onAuthenticate,
  onFallbackToPassword,
  onCancel,
}: BiometricPromptProps) {
  const { t } = useTranslation();
  const iconName = getBiometricIcon(biometricType);
  const remainingAttempts = maxAttempts - failedAttempts;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View
        className="flex-1 bg-black/50 items-center justify-center px-6"
        accessibilityElementsHidden={true}
      >
        <View className="bg-white rounded-2xl w-full max-w-sm p-6">
          {/* Icon */}
          <View className="items-center mb-4">
            <MaterialCommunityIcons
              name={iconName}
              size={BIOMETRIC_ICON_SIZE}
              color={isAuthenticating ? COLORS.primary : COLORS.gray500}
            />
          </View>

          {/* Title */}
          <Text className="text-xl font-semibold text-center text-gray-900 mb-2">
            {t('auth.biometricPrompt')}
          </Text>

          {/* Description */}
          <Text className="text-gray-500 text-center mb-6">
            {t('auth.sessionExpired')}
          </Text>

          {/* Failed attempts warning */}
          {failedAttempts > 0 && (
            <Text className="text-orange-600 text-center text-sm mb-4">
              {t('auth.biometricFailed')} ({t('auth.attemptsRemaining', { count: remainingAttempts })})
            </Text>
          )}

          {/* Authenticate button */}
          <TouchableOpacity
            className={`py-4 rounded-xl mb-3 ${isAuthenticating ? 'bg-sky-300' : 'bg-sky-500'}`}
            onPress={onAuthenticate}
            disabled={isAuthenticating}
            accessibilityRole="button"
            accessibilityLabel={t('auth.authenticateWith', { biometricType: biometricTypeName })}
          >
            <Text className="text-white font-semibold text-center">
              {isAuthenticating ? t('common.loading') : t('auth.useBiometric', { biometricType: biometricTypeName })}
            </Text>
          </TouchableOpacity>

          {/* Fallback to password */}
          <TouchableOpacity
            className="py-3"
            onPress={onFallbackToPassword}
            accessibilityRole="button"
            accessibilityLabel={t('auth.enterCredentials')}
          >
            <Text className="text-sky-500 font-medium text-center">
              {t('auth.enterCredentials')}
            </Text>
          </TouchableOpacity>

          {/* Cancel button */}
          <TouchableOpacity
            className="py-3 mt-2"
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
          >
            <Text className="text-gray-500 text-center">
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
