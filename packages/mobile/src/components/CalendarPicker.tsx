/**
 * Calendar Picker component
 *
 * Modal for selecting a target calendar from available device calendars.
 */

import { View, Text, TouchableOpacity, FlatList, Modal } from 'react-native';

import { Feather } from '@expo/vector-icons';

import { useTranslation } from '@volleykit/shared/i18n';

import { COLORS } from '../constants';

import type { CalendarInfo } from '../types/calendar';

interface CalendarPickerProps {
  /** Whether the picker is visible */
  visible: boolean;
  /** List of available calendars */
  calendars: CalendarInfo[];
  /** Currently selected calendar ID */
  selectedCalendarId: string | null;
  /** Called when a calendar is selected */
  onSelect: (calendarId: string) => void;
  /** Called when the picker is closed */
  onClose: () => void;
}

export function CalendarPicker({
  visible,
  calendars,
  selectedCalendarId,
  onSelect,
  onClose,
}: CalendarPickerProps) {
  const { t } = useTranslation();

  const renderCalendarItem = ({ item }: { item: CalendarInfo }) => {
    const isSelected = item.id === selectedCalendarId;

    return (
      <TouchableOpacity
        className="flex-row items-center py-4 px-4 bg-white"
        onPress={() => onSelect(item.id)}
        accessibilityRole="radio"
        accessibilityState={{ checked: isSelected }}
        accessibilityLabel={item.title}
      >
        <View
          className="w-6 h-6 rounded mr-4"
          style={{ backgroundColor: item.color }}
          accessibilityElementsHidden
        />
        <View className="flex-1">
          <Text className="text-gray-900 text-base">{item.title}</Text>
          <Text className="text-gray-500 text-sm">{item.source}</Text>
        </View>
        {isSelected && (
          <Feather name="check" size={24} color={COLORS.primary} />
        )}
      </TouchableOpacity>
    );
  };

  const renderSeparator = () => (
    <View className="h-px bg-gray-200 ml-14" />
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-200">
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
          >
            <Text className="text-sky-500 text-base">{t('common.cancel')}</Text>
          </TouchableOpacity>
          <Text className="text-gray-900 text-lg font-semibold">
            {t('settings.calendar.selectCalendar')}
          </Text>
          <View className="w-16" />
        </View>

        {/* Calendar List */}
        {calendars.length > 0 ? (
          <FlatList
            data={calendars}
            keyExtractor={(item) => item.id}
            renderItem={renderCalendarItem}
            ItemSeparatorComponent={renderSeparator}
            className="mt-4"
          />
        ) : (
          <View className="flex-1 items-center justify-center px-8">
            <Feather name="calendar" size={48} color={COLORS.gray400} />
            <Text className="text-gray-500 text-center mt-4">
              {t('settings.calendar.noCalendars')}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
