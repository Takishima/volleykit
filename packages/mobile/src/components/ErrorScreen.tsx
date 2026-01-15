/**
 * Error Screen component for displaying fatal errors.
 *
 * Shows a user-friendly error message with retry option.
 */

import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useTranslation } from '@volleykit/shared/i18n';
import { COLORS } from '../constants';

/**
 * Error type determines the icon and message.
 */
export type ErrorType = 'network' | 'application' | 'unknown';

/**
 * Error screen props.
 */
export interface ErrorScreenProps {
  /** The error that occurred */
  error?: Error | null;
  /** Error type for icon selection */
  type?: ErrorType;
  /** Title override */
  title?: string;
  /** Description override */
  description?: string;
  /** Callback when retry is pressed */
  onRetry?: () => void;
  /** Show error details (dev mode) */
  showDetails?: boolean;
}

/**
 * Get icon name for error type.
 */
function getErrorIcon(type: ErrorType): keyof typeof Feather.glyphMap {
  switch (type) {
    case 'network':
      return 'wifi-off';
    case 'application':
      return 'alert-triangle';
    default:
      return 'alert-circle';
  }
}

/**
 * Get icon color for error type.
 */
function getErrorColor(type: ErrorType): string {
  switch (type) {
    case 'network':
      return COLORS.amber500;
    case 'application':
      return COLORS.red500;
    default:
      return COLORS.gray500;
  }
}

/**
 * Error screen component.
 * Displays a full-screen error message with retry option.
 */
export function ErrorScreen({
  error,
  type = 'unknown',
  title,
  description,
  onRetry,
  showDetails = __DEV__,
}: ErrorScreenProps): JSX.Element {
  const { t } = useTranslation();

  const icon = getErrorIcon(type);
  const color = getErrorColor(type);

  const displayTitle =
    title ??
    (type === 'network'
      ? t('errorBoundary.connectionProblem')
      : t('errorBoundary.somethingWentWrong'));

  const displayDescription =
    description ??
    (type === 'network'
      ? t('errorBoundary.networkErrorDescription')
      : t('errorBoundary.applicationErrorDescription'));

  return (
    <View className="flex-1 bg-gray-50 items-center justify-center p-6">
      <View className="items-center max-w-sm">
        {/* Icon */}
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: `${color}20` }}
        >
          <Feather name={icon} size={40} color={color} />
        </View>

        {/* Title */}
        <Text
          className="text-xl font-semibold text-gray-900 text-center mb-2"
          accessibilityRole="header"
        >
          {displayTitle}
        </Text>

        {/* Description */}
        <Text className="text-gray-600 text-center mb-6">{displayDescription}</Text>

        {/* Retry button */}
        {onRetry && (
          <TouchableOpacity
            className="bg-sky-500 rounded-lg py-3 px-6 mb-4"
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel={t('errorBoundary.tryAgain')}
          >
            <View className="flex-row items-center">
              <Feather name="refresh-cw" size={18} color="white" />
              <Text className="text-white font-semibold ml-2">
                {t('errorBoundary.tryAgain')}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Error details (dev mode) */}
        {showDetails && error && (
          <ScrollView
            className="max-h-48 w-full bg-gray-100 rounded-lg p-3 mt-4"
            accessibilityLabel="Error details"
          >
            <Text className="text-xs text-gray-600 font-mono">
              {error.name}: {error.message}
            </Text>
            {error.stack && (
              <Text className="text-xs text-gray-500 font-mono mt-2">
                {error.stack.slice(0, 500)}...
              </Text>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

/**
 * Compact error banner for inline error display.
 */
export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}): JSX.Element {
  return (
    <View className="bg-red-50 border border-red-200 rounded-lg p-4 flex-row items-center">
      <Feather name="alert-circle" size={20} color={COLORS.red500} />
      <Text className="flex-1 text-red-700 ml-3">{message}</Text>
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry"
        >
          <Feather name="refresh-cw" size={18} color={COLORS.red500} />
        </TouchableOpacity>
      )}
    </View>
  );
}
