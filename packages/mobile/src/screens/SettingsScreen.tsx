/**
 * Settings screen
 */

import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { useSettingsStore } from '@volleykit/shared/stores';
import { useTranslation, LANGUAGE_NAMES } from '@volleykit/shared/i18n';
import type { MainTabScreenProps } from '../navigation/types';

type Props = MainTabScreenProps<'Settings'>;

interface SettingRowProps {
  icon: React.ReactNode;
  title: string;
  value?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

function SettingRow({
  icon,
  title,
  value,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: SettingRowProps) {
  return (
    <TouchableOpacity
      className="flex-row items-center py-4 px-4 bg-white"
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !onPress }}
    >
      <View className="mr-4" accessibilityElementsHidden>
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-gray-900 text-base">{title}</Text>
      </View>
      {value && <Text className="text-gray-500 mr-2">{value}</Text>}
      {onPress && (
        <Feather name="chevron-right" size={20} color="#9ca3af" accessibilityElementsHidden importantForAccessibility="no" />
      )}
    </TouchableOpacity>
  );
}

export function SettingsScreen({ navigation: _navigation }: Props) {
  const { t } = useTranslation();
  const language = useSettingsStore((state) => state.language);

  const showComingSoon = () => {
    Alert.alert(t('settings.comingSoon'), undefined, [{ text: t('common.close') }]);
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="mt-6">
        <Text className="text-sm font-medium text-gray-500 px-4 mb-2 uppercase">
          {t('settings.general')}
        </Text>
        <View className="bg-white border-y border-gray-200">
          <SettingRow
            icon={<Feather name="globe" size={24} color="#6b7280" />}
            title={t('settings.language')}
            value={LANGUAGE_NAMES[language]}
            onPress={() => {
              // TODO(#48): Implement language picker modal in Phase 3
              showComingSoon();
            }}
            accessibilityHint={t('settings.comingSoon')}
          />
        </View>
      </View>

      <View className="mt-6">
        <Text className="text-sm font-medium text-gray-500 px-4 mb-2 uppercase">
          {t('settings.security')}
        </Text>
        <View className="bg-white border-y border-gray-200">
          <SettingRow
            icon={<MaterialCommunityIcons name="fingerprint" size={24} color="#6b7280" />}
            title={t('settings.biometric.title')}
            onPress={showComingSoon}
            accessibilityHint={t('settings.comingSoon')}
          />
        </View>
      </View>

      <View className="mt-6">
        <Text className="text-sm font-medium text-gray-500 px-4 mb-2 uppercase">
          {t('settings.features')}
        </Text>
        <View className="bg-white border-y border-gray-200">
          <SettingRow
            icon={<Feather name="calendar" size={24} color="#6b7280" />}
            title={t('settings.calendarIntegration')}
            onPress={showComingSoon}
            accessibilityHint={t('settings.comingSoon')}
          />
          <View className="h-px bg-gray-200 ml-14" />
          <SettingRow
            icon={<Feather name="clock" size={24} color="#6b7280" />}
            title={t('settings.departure.title')}
            onPress={showComingSoon}
            accessibilityHint={t('settings.comingSoon')}
          />
        </View>
      </View>

      <View className="mt-6">
        <Text className="text-sm font-medium text-gray-500 px-4 mb-2 uppercase">
          {t('settings.about')}
        </Text>
        <View className="bg-white border-y border-gray-200">
          <SettingRow
            icon={<Feather name="info" size={24} color="#6b7280" />}
            title={t('settings.version')}
            value="1.0.0"
          />
        </View>
      </View>
    </ScrollView>
  );
}
