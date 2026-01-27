/**
 * Biometric authentication adapter using expo-local-authentication
 *
 * Supports Face ID, Touch ID (iOS), and fingerprint (Android).
 * Used for quick re-authentication after session expiry.
 */

import { Platform } from 'react-native'

import * as LocalAuthentication from 'expo-local-authentication'

import type { BiometricAdapter } from '@volleykit/shared/types/platform'

/**
 * Map LocalAuthentication authentication type to our BiometricType
 */
function mapAuthenticationType(
  types: LocalAuthentication.AuthenticationType[]
): 'faceId' | 'touchId' | 'fingerprint' | null {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'faceId'
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    // Use platform detection to distinguish iOS Touch ID from Android fingerprint
    return Platform.OS === 'ios' ? 'touchId' : 'fingerprint'
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    // Treat iris as fingerprint for simplicity
    return 'fingerprint'
  }
  return null
}

/**
 * Biometric authentication adapter
 * Implements BiometricAdapter interface from shared types
 */
export const biometrics: BiometricAdapter = {
  /**
   * Check if biometric authentication is available on this device
   * Requires both hardware support and enrolled biometrics
   */
  async isAvailable(): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync()
    if (!hasHardware) {
      return false
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync()
    return isEnrolled
  },

  /**
   * Authenticate using biometrics
   * Shows the system biometric prompt with the provided message
   *
   * @param promptMessage - Message to display in the biometric prompt
   * @returns true if authentication succeeded, false otherwise
   */
  async authenticate(promptMessage: string): Promise<boolean> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: true, // Don't fall back to passcode
      fallbackLabel: '', // Hide the fallback option
    })

    return result.success
  },

  /**
   * Get the type of biometric authentication available
   * Returns the primary biometric type available on the device
   */
  async getBiometricType(): Promise<'faceId' | 'touchId' | 'fingerprint' | null> {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync()
    return mapAuthenticationType(types)
  },
}

/**
 * Get user-friendly name for biometric type
 * Used for displaying in UI
 */
export function getBiometricTypeName(type: 'faceId' | 'touchId' | 'fingerprint' | null): string {
  switch (type) {
    case 'faceId':
      return 'Face ID'
    case 'touchId':
      return 'Touch ID'
    case 'fingerprint':
      return 'Fingerprint'
    default:
      return 'Biometric'
  }
}
