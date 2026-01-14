/**
 * Compensations list screen
 */

import { View, Text, FlatList, RefreshControl } from 'react-native';

import { useCompensations } from '@volleykit/shared/hooks';
import type { MainTabScreenProps } from '../navigation/types';

type Props = MainTabScreenProps<'Compensations'>;

export function CompensationsScreen(_props: Props) {
  const { data: compensations, isLoading, refetch, isRefetching } = useCompensations();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-600">Loading compensations...</Text>
      </View>
    );
  }

  if (!compensations || compensations.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-gray-600 text-center">No compensations found</Text>
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-3"
      data={compensations}
      keyExtractor={(item) => String(item)}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
      renderItem={({ item }) => (
        <View className="bg-white rounded-lg p-4 shadow-sm">
          <Text className="text-gray-900 font-medium">Compensation {String(item)}</Text>
          <Text className="text-gray-500 text-sm mt-1">Placeholder - will be populated in Phase 3</Text>
        </View>
      )}
    />
  );
}
