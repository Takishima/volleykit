/**
 * Language Picker component
 *
 * Modal for selecting the app's display language.
 */

import { View, Text, TouchableOpacity, FlatList, Modal } from 'react-native';

import { Feather } from '@expo/vector-icons';

import { useTranslation, SUPPORTED_LANGUAGES, LANGUAGE_NAMES, type Language } from '@volleykit/shared/i18n';

import { COLORS, SETTINGS_ICON_SIZE } from '../constants';

interface LanguagePickerProps {
  /** Whether the picker is visible */
  visible: boolean;
  /** Currently selected language */
  selectedLanguage: Language;
  /** Called when a language is selected */
  onSelect: (language: Language) => void;
  /** Called when the picker is closed */
  onClose: () => void;
}

export function LanguagePicker({
  visible,
  selectedLanguage,
  onSelect,
  onClose,
}: LanguagePickerProps) {
  const { t } = useTranslation();

  const renderLanguageItem = ({ item }: { item: Language }) => {
    const isSelected = item === selectedLanguage;

    return (
      <TouchableOpacity
        className="flex-row items-center py-4 px-4 bg-white"
        onPress={() => {
          onSelect(item);
          onClose();
        }}
        accessibilityRole="radio"
        accessibilityState={{ checked: isSelected }}
        accessibilityLabel={LANGUAGE_NAMES[item]}
      >
        <View className="flex-1">
          <Text className="text-gray-900 text-base">{LANGUAGE_NAMES[item]}</Text>
        </View>
        {isSelected && (
          <Feather name="check" size={SETTINGS_ICON_SIZE} color={COLORS.primary} />
        )}
      </TouchableOpacity>
    );
  };

  const renderSeparator = () => (
    <View className="h-px bg-gray-200 ml-4" />
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
            {t('settings.language')}
          </Text>
          <View className="w-16" />
        </View>

        {/* Language List */}
        <FlatList
          data={SUPPORTED_LANGUAGES}
          keyExtractor={(item) => item}
          renderItem={renderLanguageItem}
          ItemSeparatorComponent={renderSeparator}
          className="mt-4"
        />
      </View>
    </Modal>
  );
}
