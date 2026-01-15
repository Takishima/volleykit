/**
 * Exchanges list screen
 *
 * TODO(#US1): Connect to API client when implemented
 */

import { useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';

import { useTranslation } from '@volleykit/shared/i18n';
import type { MainTabScreenProps } from '../navigation/types';

type Props = MainTabScreenProps<'Exchanges'>;

// Placeholder data until API client is implemented
const PLACEHOLDER_EXCHANGES = [
  { id: '1', game: 'Game A', date: '2026-01-22', status: 'open' },
  { id: '2', game: 'Game B', date: '2026-01-28', status: 'applied' },
  { id: '3', game: 'Game C', date: '2026-02-05', status: 'open' },
];

export function ExchangesScreen(_props: Props) {
  const { t } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const exchanges = PLACEHOLDER_EXCHANGES;

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    // TODO(#US1): Implement actual refresh when API client is ready
    setTimeout(() => setIsRefreshing(false), 1000);
  }, []);

  if (exchanges.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-gray-600 text-center">{t('exchange.noExchanges')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-3"
      data={exchanges}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
      renderItem={({ item }) => (
        <View className="bg-white rounded-lg p-4 shadow-sm">
          <View className="flex-row justify-between items-center">
            <Text className="text-gray-900 font-medium">{item.game}</Text>
            <View className={`px-2 py-1 rounded ${item.status === 'open' ? 'bg-green-100' : 'bg-blue-100'}`}>
              <Text className={`text-xs font-medium ${item.status === 'open' ? 'text-green-700' : 'text-blue-700'}`}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text className="text-gray-500 text-sm mt-1">{item.date}</Text>
        </View>
      )}
    />
  );
}
