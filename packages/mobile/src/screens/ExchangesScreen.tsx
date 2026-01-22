/**
 * Exchanges list screen
 *
 * Displays available referee exchanges fetched via the shared useExchanges hook.
 */

import { useCallback } from 'react';

import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';

import type { GameExchange } from '@volleykit/shared/api';
import { useExchanges } from '@volleykit/shared/hooks';
import { useTranslation, type TranslationKey } from '@volleykit/shared/i18n';


import { useApiClient } from '../contexts';
import { formatDate } from '../utils';

import type { MainTabScreenProps } from '../navigation/types';

type Props = MainTabScreenProps<'Exchanges'>;

// Status badge color mappings
const STATUS_COLORS = {
  open: { bg: 'bg-green-100', text: 'text-green-700' },
  applied: { bg: 'bg-blue-100', text: 'text-blue-700' },
  closed: { bg: 'bg-gray-100', text: 'text-gray-700' },
} as const;

/**
 * Get display data from an exchange.
 */
function getExchangeDisplay(
  exchange: GameExchange,
  language: string,
  tbd: string
): {
  id: string;
  game: string;
  date: string;
  venue: string;
  status: 'open' | 'applied' | 'closed';
} {
  const game = exchange.refereeGame?.game;
  const homeTeam = game?.teamHome?.name ?? tbd;
  const awayTeam = game?.teamAway?.name ?? tbd;

  return {
    id: exchange.__identity,
    game: `${homeTeam} vs ${awayTeam}`,
    date: formatDate(game?.startingDateTime, language),
    venue: game?.hall?.name ?? '',
    status: exchange.status,
  };
}

export function ExchangesScreen(_props: Props) {
  const { t, language } = useTranslation();
  const apiClient = useApiClient();

  const {
    data: exchanges = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useExchanges({
    apiClient,
    status: 'open',
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Loading state
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" accessibilityLabel={t('common.loading')} />
      </View>
    );
  }

  // Error state
  if (isError) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-red-600 text-center mb-4">
          {error?.message ?? t('common.error')}
        </Text>
        <TouchableOpacity
          className="bg-primary-600 rounded-lg px-6 py-3"
          onPress={() => refetch()}
          accessibilityRole="button"
          accessibilityLabel={t('common.retry')}
        >
          <Text className="text-white font-medium">{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty state
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
      keyExtractor={(item) => item.__identity}
      refreshControl={
        <RefreshControl refreshing={isFetching && !isLoading} onRefresh={onRefresh} />
      }
      renderItem={({ item }) => {
        const display = getExchangeDisplay(item, language, t('common.tbd'));
        const colors = STATUS_COLORS[display.status];

        return (
          <View className="bg-white rounded-lg p-4 shadow-sm">
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-900 font-medium">{display.game}</Text>
              <View className={`px-2 py-1 rounded ${colors.bg}`}>
                <Text className={`text-xs font-medium ${colors.text}`}>
                  {t(`exchange.${display.status}` as TranslationKey)}
                </Text>
              </View>
            </View>
            <Text className="text-gray-500 text-sm mt-1">
              {display.date}{display.venue ? ` - ${display.venue}` : ''}
            </Text>
          </View>
        );
      }}
    />
  );
}
