/**
 * Loading screen for app initialization
 */

import { View, Text, ActivityIndicator } from 'react-native'

import { useTranslation } from '@volleykit/shared/i18n'

import type { RootStackScreenProps } from '../navigation/types'

type Props = RootStackScreenProps<'Loading'>

export function LoadingScreen(_props: Props) {
  const { t } = useTranslation()

  return (
    <View className="flex-1 bg-white items-center justify-center">
      <ActivityIndicator size="large" color="#0ea5e9" />
      <Text className="text-gray-600 mt-4">{t('common.loading')}</Text>
    </View>
  )
}
