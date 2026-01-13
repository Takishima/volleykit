/**
 * Settings screen
 */

import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { ChevronRight, Globe, Fingerprint, Calendar, Clock, Info } from 'lucide-react-native';

import { useSettingsStore } from '@volleykit/shared/stores';
import type { MainTabScreenProps } from '../navigation/types';

type Props = MainTabScreenProps<'Settings'>;

interface SettingRowProps {
  icon: React.ReactNode;
  title: string;
  value?: string;
  onPress?: () => void;
}

function SettingRow({ icon, title, value, onPress }: SettingRowProps) {
  return (
    <TouchableOpacity
      className="flex-row items-center py-4 px-4 bg-white"
      onPress={onPress}
      disabled={!onPress}
    >
      <View className="mr-4">{icon}</View>
      <View className="flex-1">
        <Text className="text-gray-900 text-base">{title}</Text>
      </View>
      {value && <Text className="text-gray-500 mr-2">{value}</Text>}
      {onPress && <ChevronRight size={20} color="#9ca3af" />}
    </TouchableOpacity>
  );
}

export function SettingsScreen({ navigation }: Props) {
  const language = useSettingsStore((state) => state.language);

  const languageNames: Record<string, string> = {
    de: 'Deutsch',
    en: 'English',
    fr: 'Francais',
    it: 'Italiano',
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="mt-6">
        <Text className="text-sm font-medium text-gray-500 px-4 mb-2 uppercase">General</Text>
        <View className="bg-white border-y border-gray-200">
          <SettingRow
            icon={<Globe size={24} color="#6b7280" />}
            title="Language"
            value={languageNames[language]}
            onPress={() => {
              // TODO: Implement language picker
            }}
          />
        </View>
      </View>

      <View className="mt-6">
        <Text className="text-sm font-medium text-gray-500 px-4 mb-2 uppercase">Security</Text>
        <View className="bg-white border-y border-gray-200">
          <SettingRow
            icon={<Fingerprint size={24} color="#6b7280" />}
            title="Biometric Login"
            onPress={() => navigation.navigate('BiometricSettings')}
          />
        </View>
      </View>

      <View className="mt-6">
        <Text className="text-sm font-medium text-gray-500 px-4 mb-2 uppercase">Features</Text>
        <View className="bg-white border-y border-gray-200">
          <SettingRow
            icon={<Calendar size={24} color="#6b7280" />}
            title="Calendar Integration"
            onPress={() => navigation.navigate('CalendarSettings')}
          />
          <View className="h-px bg-gray-200 ml-14" />
          <SettingRow
            icon={<Clock size={24} color="#6b7280" />}
            title="Smart Departure Reminder"
            onPress={() => navigation.navigate('DepartureReminderSettings')}
          />
        </View>
      </View>

      <View className="mt-6">
        <Text className="text-sm font-medium text-gray-500 px-4 mb-2 uppercase">About</Text>
        <View className="bg-white border-y border-gray-200">
          <SettingRow icon={<Info size={24} color="#6b7280" />} title="Version" value="1.0.0" />
        </View>
      </View>
    </ScrollView>
  );
}
