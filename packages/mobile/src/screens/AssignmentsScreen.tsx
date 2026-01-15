/**
 * Assignments list screen
 *
 * TODO(#US1): Connect to API client when implemented
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';

import { useTranslation } from '@volleykit/shared/i18n';
import type { MainTabScreenProps } from '../navigation/types';
import { PLACEHOLDER_REFRESH_DELAY_MS } from '../constants';

type Props = MainTabScreenProps<'Assignments'>;

// Placeholder data until API client is implemented
const PLACEHOLDER_ASSIGNMENTS = [
  { id: '1', title: 'Game 1', date: '2026-01-20', venue: 'Sports Hall A' },
  { id: '2', title: 'Game 2', date: '2026-01-25', venue: 'Sports Hall B' },
  { id: '3', title: 'Game 3', date: '2026-02-01', venue: 'Sports Hall C' },
];

export function AssignmentsScreen(_props: Props) {
  const { t } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const assignments = PLACEHOLDER_ASSIGNMENTS;
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
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
      renderItem={({ item }) => (
        <View className="bg-white rounded-lg p-4 shadow-sm">
          <Text className="text-gray-900 font-medium">{item.title}</Text>
          <Text className="text-gray-500 text-sm mt-1">{item.date} - {item.venue}</Text>
        </View>
      )}
    />
  );
}
