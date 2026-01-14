/**
 * Assignments list screen
 */

import { View, Text, FlatList, RefreshControl } from 'react-native';

import { useAssignments } from '@volleykit/shared/hooks';
import type { MainTabScreenProps } from '../navigation/types';

type Props = MainTabScreenProps<'Assignments'>;

export function AssignmentsScreen(_props: Props) {
  const { data: assignments, isLoading, refetch, isRefetching } = useAssignments();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-600">Loading assignments...</Text>
      </View>
    );
  }

  if (!assignments || assignments.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-gray-600 text-center">No assignments found</Text>
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-3"
      data={assignments}
      keyExtractor={(item) => String(item)}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
      renderItem={({ item }) => (
        <View className="bg-white rounded-lg p-4 shadow-sm">
          <Text className="text-gray-900 font-medium">Assignment {String(item)}</Text>
          <Text className="text-gray-500 text-sm mt-1">Placeholder - will be populated in Phase 3</Text>
        </View>
      )}
    />
  );
}
