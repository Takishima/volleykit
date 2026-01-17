/**
 * Assignment detail screen
 */

import { View, Text, ScrollView } from 'react-native';

import { useTranslation } from '@volleykit/shared/i18n';
import type { RootStackScreenProps } from '../navigation/types';

type Props = RootStackScreenProps<'AssignmentDetail'>;

export function AssignmentDetailScreen({ route }: Props) {
  const { t } = useTranslation();
  const { id } = route.params;

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-6">
        <Text className="text-2xl font-bold text-gray-900">{t('assignments.details')}</Text>
        <Text className="text-gray-600 mt-2">ID: {id}</Text>

        <View className="mt-6 gap-4">
          <View className="bg-gray-50 rounded-lg p-4">
            <Text className="text-sm font-medium text-gray-500">{t('common.dateTime')}</Text>
            <Text className="text-gray-900 mt-1">{t('common.tbd')}</Text>
          </View>

          <View className="bg-gray-50 rounded-lg p-4">
            <Text className="text-sm font-medium text-gray-500">{t('assignments.venue')}</Text>
            <Text className="text-gray-900 mt-1">{t('common.tbd')}</Text>
          </View>

          <View className="bg-gray-50 rounded-lg p-4">
            <Text className="text-sm font-medium text-gray-500">{t('assignments.teams')}</Text>
            <Text className="text-gray-900 mt-1">{t('common.home')} {t('common.vs')} {t('common.away')}</Text>
          </View>

          <View className="bg-gray-50 rounded-lg p-4">
            <Text className="text-sm font-medium text-gray-500">{t('common.position')}</Text>
            <Text className="text-gray-900 mt-1">{t('common.tbd')}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
