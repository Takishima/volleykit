/**
 * Biometric settings screen
 *
 * Allows users to enable/disable biometric authentication for quick re-login.
 */

import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Switch, Alert } from 'react-native';

import { useTranslation } from '@volleykit/shared/i18n';
import { useStorage } from '@volleykit/shared/adapters';
import { biometrics, getBiometricTypeName } from '../platform/biometrics';
import type { RootStackScreenProps } from '../navigation/types';
import { COLORS, BIOMETRIC_ENABLED_KEY } from '../constants';

type Props = RootStackScreenProps<'BiometricSettings'>;

export function BiometricSettingsScreen({ navigation: _navigation }: Props) {
  const { t } = useTranslation();
  const { storage, secureStorage } = useStorage();

  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<'faceId' | 'touchId' | 'fingerprint' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCredentials, setHasCredentials] = useState(false);

  // Check biometric availability and current settings
  useEffect(() => {
    async function checkBiometricStatus() {
      try {
        const available = await biometrics.isAvailable();
        setIsAvailable(available);

        if (available) {
          const type = await biometrics.getBiometricType();
          setBiometricType(type);

          const storedEnabled = await storage.getItem(BIOMETRIC_ENABLED_KEY);
          setIsEnabled(storedEnabled === 'true');

          const hasCreds = await secureStorage.hasCredentials();
          setHasCredentials(hasCreds);
        }
      } catch {
        setIsAvailable(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkBiometricStatus();
  }, [storage, secureStorage]);

  const handleToggle = useCallback(
    async (value: boolean) => {
      if (value) {
        // Enabling biometric - verify it works first
        const success = await biometrics.authenticate(
          t('auth.biometricPrompt')
        );

        if (!success) {
          Alert.alert(
            t('settings.biometric.title'),
            t('auth.biometricFailed'),
            [{ text: t('common.close') }]
          );
          return;
        }

        // Check if we have stored credentials
        if (!hasCredentials) {
          Alert.alert(
            t('settings.biometric.title'),
            t('auth.enterCredentials'),
            [{ text: t('common.close') }]
          );
          return;
        }
      }

      await storage.setItem(BIOMETRIC_ENABLED_KEY, value ? 'true' : 'false');
      setIsEnabled(value);
    },
    [storage, hasCredentials, t]
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-500">{t('common.loading')}</Text>
      </View>
    );
  }

  const biometricName = getBiometricTypeName(biometricType);

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="mt-6 px-4">
        <Text className="text-sm font-medium text-gray-500 mb-2 uppercase">
          {t('settings.biometric.title')}
        </Text>
      </View>

      {!isAvailable ? (
        <View className="bg-white border-y border-gray-200 px-4 py-4">
          <Text className="text-gray-900 font-medium mb-2">
            {t('settings.biometric.notAvailable')}
          </Text>
          <Text className="text-gray-500 text-sm">
            {t('settings.biometric.notEnrolled')}
          </Text>
        </View>
      ) : (
        <>
          <View className="bg-white border-y border-gray-200">
            <View className="flex-row items-center justify-between px-4 py-4">
              <View className="flex-1 mr-4">
                <Text className="text-gray-900 font-medium">
                  {t('settings.biometric.enable')} {biometricName}
                </Text>
                <Text className="text-gray-500 text-sm mt-1">
                  {t('settings.biometric.description')}
                </Text>
              </View>
              <Switch
                value={isEnabled}
                onValueChange={handleToggle}
                trackColor={{ false: COLORS.gray200, true: COLORS.primary }}
                ios_backgroundColor={COLORS.gray200}
                accessibilityRole="switch"
                accessibilityLabel={`${t('settings.biometric.enable')} ${biometricName}`}
                accessibilityState={{ checked: isEnabled }}
              />
            </View>
          </View>

          {!hasCredentials && (
            <View className="px-4 mt-4">
              <Text className="text-orange-600 text-sm">
                {t('auth.enterCredentials')}
              </Text>
            </View>
          )}
        </>
      )}

      <View className="px-4 mt-6">
        <Text className="text-gray-500 text-sm">
          {t('settings.biometric.description')}
        </Text>
      </View>
    </ScrollView>
  );
}
