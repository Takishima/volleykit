/**
 * Exchanges list screen
 *
 * TODO(#US1): Connect to API client when implemented
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';

import { useTranslation, type TranslationKey } from '@volleykit/shared/i18n';
import type { MainTabScreenProps } from '../navigation/types';
import { PLACEHOLDER_REFRESH_DELAY_MS } from '../constants';

type Props = MainTabScreenProps<'Exchanges'>;

// Placeholder exchange type (matches API exchangeStatusSchema values)
type PlaceholderExchange = {
  id: string;
  game: string;
  date: string;
  status: 'open' | 'applied' | 'closed';
};

// Placeholder data until API client is implemented
const PLACEHOLDER_EXCHANGES: PlaceholderExchange[] = [
  { id: '1', game: 'Game A', date: '2026-01-22', status: 'open' },
  { id: '2', game: 'Game B', date: '2026-01-28', status: 'applied' },
  { id: '3', game: 'Game C', date: '2026-02-05', status: 'open' },
];

// Status badge color mappings
const STATUS_COLORS = {
  open: { bg: 'bg-green-100', text: 'text-green-700' },
  applied: { bg: 'bg-blue-100', text: 'text-blue-700' },
  closed: { bg: 'bg-gray-100', text: 'text-gray-700' },
} as const;

export function ExchangesScreen(_props: Props) {
  const { t } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const exchanges = PLACEHOLDER_EXCHANGES;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    // TODO(#US1): Replace with TanStack Query refetch when API client is ready
    timeoutRef.current = setTimeout(() => setIsRefreshing(false), PLACEHOLDER_REFRESH_DELAY_MS);
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
      renderItem={({ item }) => {
        const colors = STATUS_COLORS[item.status];

        return (
          <View className="bg-white rounded-lg p-4 shadow-sm">
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-900 font-medium">{item.game}</Text>
              <View className={`px-2 py-1 rounded ${colors.bg}`}>
                <Text className={`text-xs font-medium ${colors.text}`}>
                  {t(`exchange.${item.status}` as TranslationKey)}
                </Text>
              </View>
            </View>
            <Text className="text-gray-500 text-sm mt-1">{item.date}</Text>
          </View>
        );
      }}
    />
  );
}
