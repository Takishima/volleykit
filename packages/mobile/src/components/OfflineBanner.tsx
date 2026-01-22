/**
 * Offline Banner component
 *
 * Shows a banner when the device is offline.
 */

import type { JSX } from 'react';
import { useEffect, useRef } from 'react';

import { View, Text, Animated } from 'react-native';

import { Feather } from '@expo/vector-icons';

import { useTranslation } from '@volleykit/shared/i18n';

import { COLORS } from '../constants';
import { useNetwork } from '../providers/NetworkProvider';

/** Banner height in pixels for slide animation */
const BANNER_HEIGHT_PX = 50;

/** Animation duration in milliseconds */
const ANIMATION_DURATION_MS = 300;

/**
 * Offline banner props.
 */
export interface OfflineBannerProps {
  /** Custom message override */
  message?: string;
  /** Show even when online (for testing) */
  forceShow?: boolean;
}

/**
 * Offline banner component.
 * Displays a non-intrusive banner at the top of the screen when offline.
 */
export function OfflineBanner({
  message,
  forceShow = false,
}: OfflineBannerProps): JSX.Element | null {
  const { t } = useTranslation();
  const { isOnline, isKnown } = useNetwork();

  // Animation for slide down
  const slideAnim = useRef(new Animated.Value(-BANNER_HEIGHT_PX)).current;

  const showBanner = forceShow || (!isOnline && isKnown);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: showBanner ? 0 : -BANNER_HEIGHT_PX,
      duration: ANIMATION_DURATION_MS,
      useNativeDriver: true,
    }).start();
  }, [showBanner, slideAnim]);

  if (!showBanner && !forceShow) {
    return null;
  }

  return (
    <Animated.View
      style={{ transform: [{ translateY: slideAnim }] }}
      className="absolute top-0 left-0 right-0 z-50"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View className="bg-amber-500 px-4 py-2 flex-row items-center justify-center">
        <Feather
          name="wifi-off"
          size={16}
          color="white"
          style={{ marginRight: 8 }}
        />
        <Text className="text-white text-sm font-medium">
          {message ?? t('errorBoundary.networkErrorDescription')}
        </Text>
      </View>
    </Animated.View>
  );
}

/**
 * Compact offline indicator for use in headers.
 */
export function OfflineIndicator(): JSX.Element | null {
  const { t } = useTranslation();
  const { isOnline, isKnown } = useNetwork();

  if (isOnline || !isKnown) {
    return null;
  }

  return (
    <View
      className="flex-row items-center bg-amber-100 rounded-full px-2 py-1"
      accessibilityRole="alert"
      accessibilityLabel={t('common.offline')}
    >
      <Feather name="wifi-off" size={12} color={COLORS.amber500} />
      <Text className="text-amber-600 text-xs ml-1">{t('common.offline')}</Text>
    </View>
  );
}
