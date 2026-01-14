/**
 * Assignment detail screen
 */

import { View, Text, ScrollView } from 'react-native';

import type { RootStackScreenProps } from '../navigation/types';

type Props = RootStackScreenProps<'AssignmentDetail'>;

export function AssignmentDetailScreen({ route }: Props) {
  const { id } = route.params;

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-6">
        <Text className="text-2xl font-bold text-gray-900">Assignment Details</Text>
        <Text className="text-gray-600 mt-2">Assignment ID: {id}</Text>

        <View className="mt-6 gap-4">
          <View className="bg-gray-50 rounded-lg p-4">
            <Text className="text-sm font-medium text-gray-500">Date & Time</Text>
            <Text className="text-gray-900 mt-1">Placeholder</Text>
          </View>

          <View className="bg-gray-50 rounded-lg p-4">
            <Text className="text-sm font-medium text-gray-500">Venue</Text>
            <Text className="text-gray-900 mt-1">Placeholder</Text>
          </View>

          <View className="bg-gray-50 rounded-lg p-4">
            <Text className="text-sm font-medium text-gray-500">Teams</Text>
            <Text className="text-gray-900 mt-1">Home vs Away</Text>
          </View>

          <View className="bg-gray-50 rounded-lg p-4">
            <Text className="text-sm font-medium text-gray-500">Role</Text>
            <Text className="text-gray-900 mt-1">Placeholder</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
