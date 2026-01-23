/**
 * Settings screen
 */

import { useMemo, useState } from 'react'

import { View, Text, ScrollView, TouchableOpacity } from 'react-native'

import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'

import { useTranslation, LANGUAGE_NAMES } from '@volleykit/shared/i18n'
import { useSettingsStore } from '@volleykit/shared/stores'

import { LanguagePicker } from '../components/LanguagePicker'
import { COLORS, SETTINGS_ICON_SIZE, SMALL_ICON_SIZE } from '../constants'
import { getAppVersion } from '../utils/version'

import type { MainTabScreenProps } from '../navigation/types'

type Props = MainTabScreenProps<'Settings'>

interface SettingRowProps {
  icon: React.ReactNode
  title: string
  value?: string
  onPress?: () => void
  accessibilityLabel?: string
  accessibilityHint?: string
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
        <Feather
          name="chevron-right"
          size={SMALL_ICON_SIZE}
          color={COLORS.gray400}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      )}
    </TouchableOpacity>
  )
}

export function SettingsScreen({ navigation }: Props) {
  const { t } = useTranslation()
  const language = useSettingsStore((state) => state.language)
  const setLanguage = useSettingsStore((state) => state.setLanguage)
  const appVersion = useMemo(() => getAppVersion(), [])
  const [isLanguagePickerVisible, setLanguagePickerVisible] = useState(false)

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="mt-6">
        <Text className="text-sm font-medium text-gray-500 px-4 mb-2 uppercase">
          {t('settings.general')}
        </Text>
        <View className="bg-white border-y border-gray-200">
          <SettingRow
            icon={<Feather name="globe" size={SETTINGS_ICON_SIZE} color={COLORS.gray500} />}
            title={t('settings.language')}
            value={LANGUAGE_NAMES[language]}
            onPress={() => setLanguagePickerVisible(true)}
            accessibilityHint={t('settings.language')}
          />
        </View>
      </View>

      <View className="mt-6">
        <Text className="text-sm font-medium text-gray-500 px-4 mb-2 uppercase">
          {t('settings.security')}
        </Text>
        <View className="bg-white border-y border-gray-200">
          <SettingRow
            icon={
              <MaterialCommunityIcons
                name="fingerprint"
                size={SETTINGS_ICON_SIZE}
                color={COLORS.gray500}
              />
            }
            title={t('settings.biometric.title')}
            onPress={() => navigation.navigate('BiometricSettings')}
            accessibilityHint={t('settings.biometric.description')}
          />
        </View>
      </View>

      <View className="mt-6">
        <Text className="text-sm font-medium text-gray-500 px-4 mb-2 uppercase">
          {t('settings.features')}
        </Text>
        <View className="bg-white border-y border-gray-200">
          <SettingRow
            icon={<Feather name="calendar" size={SETTINGS_ICON_SIZE} color={COLORS.gray500} />}
            title={t('settings.calendarIntegration')}
            onPress={() => navigation.navigate('CalendarSettings')}
            accessibilityHint={t('settings.calendar.description')}
          />
          <View className="h-px bg-gray-200 ml-14" />
          <SettingRow
            icon={<Feather name="clock" size={SETTINGS_ICON_SIZE} color={COLORS.gray500} />}
            title={t('settings.departure.title')}
            onPress={() => navigation.navigate('DepartureReminderSettings')}
            accessibilityHint={t('settings.departure.description')}
          />
        </View>
      </View>

      <View className="mt-6">
        <Text className="text-sm font-medium text-gray-500 px-4 mb-2 uppercase">
          {t('settings.about')}
        </Text>
        <View className="bg-white border-y border-gray-200">
          <SettingRow
            icon={<Feather name="info" size={SETTINGS_ICON_SIZE} color={COLORS.gray500} />}
            title={t('settings.version')}
            value={appVersion}
          />
        </View>
      </View>

      <LanguagePicker
        visible={isLanguagePickerVisible}
        selectedLanguage={language}
        onSelect={setLanguage}
        onClose={() => setLanguagePickerVisible(false)}
      />
    </ScrollView>
  )
}
