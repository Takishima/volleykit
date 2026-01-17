/**
 * Compensations list screen
 *
 * Displays referee compensation records fetched via the shared useCompensations hook.
 */

import { useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator } from 'react-native';

import { useTranslation, type TranslationKey } from '@volleykit/shared/i18n';
import { useCompensations } from '@volleykit/shared/hooks';
import type { CompensationRecord } from '@volleykit/shared/api';
import type { MainTabScreenProps } from '../navigation/types';
import { useApiClient } from '../contexts';

type Props = MainTabScreenProps<'Compensations'>;

/**
 * Get display data from a compensation record.
 */
function getCompensationDisplay(record: CompensationRecord): {
  id: string;
  game: string;
  amount: string;
  status: 'paid' | 'pending';
} {
  const game = record.refereeGame?.game;
  const homeTeam = game?.teamHome?.name ?? 'TBD';
  const awayTeam = game?.teamAway?.name ?? 'TBD';
  const compensation = record.convocationCompensation;

  // Calculate total compensation
  const gameComp = compensation?.gameCompensation ?? 0;
  const travelExp = compensation?.travelExpenses ?? 0;
  const total = gameComp + travelExp;

  return {
    id: record.__identity,
    game: `${homeTeam} vs ${awayTeam}`,
    amount: total.toFixed(2),
    status: compensation?.paymentDone ? 'paid' : 'pending',
  };
}

export function CompensationsScreen(_props: Props) {
  const { t } = useTranslation();
  const apiClient = useApiClient();

  const {
    data: compensations = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useCompensations({
    apiClient,
    status: 'all',
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Loading state
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Error state
  if (isError) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-red-600 text-center">
          {error?.message ?? t('common.error')}
        </Text>
      </View>
    );
  }

  // Empty state
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
      keyExtractor={(item) => item.__identity}
      refreshControl={
        <RefreshControl refreshing={isFetching && !isLoading} onRefresh={onRefresh} />
      }
      renderItem={({ item }) => {
        const display = getCompensationDisplay(item);

        return (
          <View className="bg-white rounded-lg p-4 shadow-sm">
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-900 font-medium">{display.game}</Text>
              <Text className="text-gray-900 font-semibold">CHF {display.amount}</Text>
            </View>
            <Text className="text-gray-500 text-sm mt-1">
              {t(`compensations.${display.status}` as TranslationKey)}
            </Text>
          </View>
        );
      }}
    />
  );
}
