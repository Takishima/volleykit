/**
 * Compensations list screen
 *
 * TODO(#US1): Connect to API client when implemented
 */

import { useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';

import { useTranslation } from '@volleykit/shared/i18n';
import type { MainTabScreenProps } from '../navigation/types';

type Props = MainTabScreenProps<'Compensations'>;

// Placeholder data until API client is implemented
const PLACEHOLDER_COMPENSATIONS = [
  { id: '1', game: 'Game 1', amount: '120.00', status: 'paid' },
  { id: '2', game: 'Game 2', amount: '95.00', status: 'pending' },
  { id: '3', game: 'Game 3', amount: '110.00', status: 'paid' },
];

export function CompensationsScreen(_props: Props) {
  const { t } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const compensations = PLACEHOLDER_COMPENSATIONS;

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    // TODO(#US1): Implement actual refresh when API client is ready
    setTimeout(() => setIsRefreshing(false), 1000);
  }, []);

  if (compensations.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-gray-600 text-center">{t('compensations.noCompensations')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-3"
      data={compensations}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
      renderItem={({ item }) => (
        <View className="bg-white rounded-lg p-4 shadow-sm">
          <View className="flex-row justify-between items-center">
            <Text className="text-gray-900 font-medium">{item.game}</Text>
            <Text className="text-gray-900 font-semibold">CHF {item.amount}</Text>
          </View>
          <Text className="text-gray-500 text-sm mt-1 capitalize">{item.status}</Text>
        </View>
      )}
    />
  );
}
