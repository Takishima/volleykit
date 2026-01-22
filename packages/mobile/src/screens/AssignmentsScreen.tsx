/**
 * Assignments list screen
 *
 * Displays upcoming referee assignments fetched via the shared useAssignments hook.
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

import type { Assignment } from '@volleykit/shared/api';
import { useAssignments } from '@volleykit/shared/hooks';
import { useTranslation, type TranslationKey } from '@volleykit/shared/i18n';


import { useApiClient } from '../contexts';
import { formatDate } from '../utils';

import type { MainTabScreenProps } from '../navigation/types';

type Props = MainTabScreenProps<'Assignments'>;

// Status badge color mappings
const STATUS_COLORS = {
  active: { bg: 'bg-green-100', text: 'text-green-700' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700' },
  archived: { bg: 'bg-gray-100', text: 'text-gray-700' },
} as const;

/**
 * Get display data from an assignment.
 */
function getAssignmentDisplay(
  assignment: Assignment,
  language: string,
  tbd: string
): {
  id: string;
  title: string;
  date: string;
  venue: string;
  status: 'active' | 'cancelled' | 'archived';
} {
  const game = assignment.refereeGame?.game;
  const homeTeam = game?.teamHome?.name ?? tbd;
  const awayTeam = game?.teamAway?.name ?? tbd;

  return {
    id: assignment.__identity,
    title: `${homeTeam} vs ${awayTeam}`,
    date: formatDate(game?.startingDateTime, language),
    venue: game?.hall?.name ?? tbd,
    status: assignment.refereeConvocationStatus,
  };
}

export function AssignmentsScreen({ navigation }: Props) {
  const { t, language } = useTranslation();
  const apiClient = useApiClient();

  const {
    data: assignments = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useAssignments({
    apiClient,
    period: 'upcoming',
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
  if (assignments.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-gray-600 text-center">{t('assignments.noAssignments')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-3"
      data={assignments}
      keyExtractor={(item) => item.__identity}
      refreshControl={
        <RefreshControl refreshing={isFetching && !isLoading} onRefresh={onRefresh} />
      }
      renderItem={({ item }) => {
        const display = getAssignmentDisplay(item, language, t('common.tbd'));
        const colors = STATUS_COLORS[display.status];

        return (
          <TouchableOpacity
            className="bg-white rounded-lg p-4 shadow-sm"
            onPress={() => navigation.navigate('AssignmentDetail', { id: display.id })}
            accessibilityRole="button"
            accessibilityLabel={`${display.title}, ${display.date}, ${display.venue}`}
            accessibilityHint={t('assignments.tapForDetails')}
          >
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-900 font-medium">{display.title}</Text>
              <View className={`px-2 py-1 rounded ${colors.bg}`}>
                <Text className={`text-xs font-medium ${colors.text}`}>
                  {t(`assignments.${display.status}` as TranslationKey)}
                </Text>
              </View>
            </View>
            <Text className="text-gray-500 text-sm mt-1">{display.date} - {display.venue}</Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}
