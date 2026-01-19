/**
 * Last Updated Indicator component
 *
 * Shows when data was last fetched/cached for freshness indication.
 */

import type { JSX } from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useTranslation } from '@volleykit/shared/i18n';
import { COLORS } from '../constants';
import type { CacheStatus } from '../types/cache';
import { getCacheStatus, formatCacheAge } from '../types/cache';

/**
 * Last updated indicator props.
 */
export interface LastUpdatedIndicatorProps {
  /** ISO 8601 timestamp of last update */
  lastUpdatedAt: string | null;
  /** Whether data is from cache (vs fresh fetch) */
  isFromCache?: boolean;
  /** Compact mode for smaller displays */
  compact?: boolean;
  /** Custom label */
  label?: string;
}

/**
 * Get status color based on freshness.
 */
function getStatusColor(status: CacheStatus): string {
  switch (status) {
    case 'fresh':
      return COLORS.green500;
    case 'stale':
      return COLORS.amber500;
    case 'expired':
      return COLORS.red500;
    default:
      return COLORS.gray400;
  }
}

/**
 * Get status icon based on freshness.
 */
function getStatusIcon(status: CacheStatus): string {
  switch (status) {
    case 'fresh':
      return 'check-circle';
    case 'stale':
      return 'clock';
    case 'expired':
      return 'alert-circle';
    default:
      return 'help-circle';
  }
}

/**
 * Last updated indicator component.
 * Shows data freshness with visual feedback.
 */
export function LastUpdatedIndicator({
  lastUpdatedAt,
  isFromCache = false,
  compact = false,
  label,
}: LastUpdatedIndicatorProps): JSX.Element | null {
  const { t } = useTranslation();

  if (!lastUpdatedAt) {
    return null;
  }

  const metadata = {
    cachedAt: lastUpdatedAt,
    version: 1,
  };
  const status = getCacheStatus(metadata);
  const color = getStatusColor(status);
  const icon = getStatusIcon(status);
  const timeAgo = formatCacheAge(lastUpdatedAt);
  const defaultLabel = t('common.lastUpdated');

  if (compact) {
    return (
      <View
        className="flex-row items-center"
        accessibilityLabel={`${defaultLabel} ${timeAgo}`}
        accessibilityRole="text"
      >
        <Feather name={icon as keyof typeof Feather.glyphMap} size={12} color={color} />
        <Text className="text-xs text-gray-500 ml-1">{timeAgo}</Text>
      </View>
    );
  }

  return (
    <View
      className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2"
      accessibilityLabel={`${label ?? defaultLabel} ${timeAgo}`}
      accessibilityRole="text"
    >
      <Feather name={icon as keyof typeof Feather.glyphMap} size={14} color={color} />
      <View className="ml-2">
        <Text className="text-xs text-gray-500">
          {label ?? defaultLabel}
        </Text>
        <Text className="text-sm text-gray-700 font-medium">{timeAgo}</Text>
      </View>
      {isFromCache && (
        <View className="ml-auto bg-gray-200 rounded px-2 py-0.5">
          <Text className="text-xs text-gray-600">{t('common.cached')}</Text>
        </View>
      )}
    </View>
  );
}

/**
 * Inline last updated text for list headers.
 */
export function LastUpdatedText({
  lastUpdatedAt,
}: {
  lastUpdatedAt: string | null;
}): JSX.Element | null {
  const { t } = useTranslation();

  if (!lastUpdatedAt) {
    return null;
  }

  const timeAgo = formatCacheAge(lastUpdatedAt);
  const updatedLabel = t('common.updated');

  return (
    <Text className="text-xs text-gray-400" accessibilityLabel={`${updatedLabel} ${timeAgo}`}>
      {updatedLabel} {timeAgo}
    </Text>
  );
}
