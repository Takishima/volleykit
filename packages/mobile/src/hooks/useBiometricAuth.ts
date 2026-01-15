/**
 * Hook for biometric authentication
 *
 * Handles biometric check and credential retrieval for quick re-login.
 */

import { useState, useCallback } from 'react';
import { useStorage } from '@volleykit/shared/adapters';
import { biometrics, getBiometricTypeName } from '../platform/biometrics';
import { BIOMETRIC_ENABLED_KEY, MAX_BIOMETRIC_ATTEMPTS } from '../constants';

export interface BiometricAuthState {
  /** Whether biometric is available and enabled */
  isEnabled: boolean;
  /** Whether biometric hardware is available */
  isAvailable: boolean;
  /** The type of biometric available */
  biometricType: 'faceId' | 'touchId' | 'fingerprint' | null;
  /** User-friendly name for biometric type */
  biometricTypeName: string;
  /** Number of failed attempts */
  failedAttempts: number;
  /** Whether we should fall back to password entry */
  shouldFallbackToPassword: boolean;
  /** Whether authentication is in progress */
  isAuthenticating: boolean;
}

export interface UseBiometricAuthResult extends BiometricAuthState {
  /** Check biometric status */
  checkBiometricStatus: () => Promise<void>;
  /** Attempt biometric authentication */
  authenticate: (promptMessage: string) => Promise<{ success: boolean; credentials?: { username: string; password: string } }>;
  /** Reset failed attempts counter */
  resetAttempts: () => void;
}

export function useBiometricAuth(): UseBiometricAuthResult {
  const { storage, secureStorage } = useStorage();

  const [state, setState] = useState<BiometricAuthState>({
    isEnabled: false,
    isAvailable: false,
    biometricType: null,
    biometricTypeName: 'Biometric',
    failedAttempts: 0,
    shouldFallbackToPassword: false,
    isAuthenticating: false,
  });

  const checkBiometricStatus = useCallback(async () => {
    try {
      const available = await biometrics.isAvailable();

      if (!available) {
        setState(prev => ({
          ...prev,
          isAvailable: false,
          isEnabled: false,
          biometricType: null,
          biometricTypeName: 'Biometric',
        }));
        return;
      }

      const type = await biometrics.getBiometricType();
      const storedEnabled = await storage.getItem(BIOMETRIC_ENABLED_KEY);
      const hasCredentials = await secureStorage.hasCredentials();

      setState(prev => ({
        ...prev,
        isAvailable: true,
        isEnabled: storedEnabled === 'true' && hasCredentials,
        biometricType: type,
        biometricTypeName: getBiometricTypeName(type),
      }));
    } catch {
      setState(prev => ({
        ...prev,
        isAvailable: false,
        isEnabled: false,
      }));
    }
  }, [storage, secureStorage]);

  const authenticate = useCallback(async (promptMessage: string): Promise<{ success: boolean; credentials?: { username: string; password: string } }> => {
    if (!state.isEnabled || state.shouldFallbackToPassword) {
      return { success: false };
    }

    setState(prev => ({ ...prev, isAuthenticating: true }));

    try {
      const success = await biometrics.authenticate(promptMessage);

      if (!success) {
        const newFailedAttempts = state.failedAttempts + 1;
        setState(prev => ({
          ...prev,
          failedAttempts: newFailedAttempts,
          shouldFallbackToPassword: newFailedAttempts >= MAX_BIOMETRIC_ATTEMPTS,
          isAuthenticating: false,
        }));
        return { success: false };
      }

      // Get stored credentials
      const credentials = await secureStorage.getCredentials();

      if (!credentials) {
        setState(prev => ({ ...prev, isAuthenticating: false }));
        return { success: false };
      }

      setState(prev => ({
        ...prev,
        failedAttempts: 0,
        isAuthenticating: false,
      }));

      return { success: true, credentials };
    } catch {
      setState(prev => ({ ...prev, isAuthenticating: false }));
      return { success: false };
    }
  }, [state.isEnabled, state.shouldFallbackToPassword, state.failedAttempts, secureStorage]);

  const resetAttempts = useCallback(() => {
    setState(prev => ({
      ...prev,
      failedAttempts: 0,
      shouldFallbackToPassword: false,
    }));
  }, []);

  return {
    ...state,
    checkBiometricStatus,
    authenticate,
    resetAttempts,
  };
}
