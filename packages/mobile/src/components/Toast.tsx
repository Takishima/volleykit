/**
 * Toast notification component for mobile app.
 *
 * Displays toast notifications at the top of the screen with:
 * - Different styles for success, error, warning, and info types
 * - Auto-dismiss after duration
 * - Tap to dismiss
 * - Accessible announcements
 */

import type { JSX } from 'react'
import { useEffect, useRef, useCallback } from 'react'

import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  AccessibilityInfo,
} from 'react-native'

import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'


import { useTranslation } from '@volleykit/shared/i18n'

import { COLORS } from '../constants'
import {
  useToastStore,
  DEFAULT_DURATION_MS,
  type Toast as ToastType,
  type ToastType as ToastTypeEnum,
} from '../stores/toast'

/** Animation duration for slide in/out */
const ANIMATION_DURATION_MS = 200

/** Icon names for each toast type */
const TOAST_ICONS: Record<ToastTypeEnum, keyof typeof Feather.glyphMap> = {
  success: 'check-circle',
  error: 'x-circle',
  warning: 'alert-triangle',
  info: 'info',
}

/** Style configuration for each toast type */
const TOAST_STYLES: Record<
  ToastTypeEnum,
  { bg: string; border: string; text: string; icon: string }
> = {
  success: {
    bg: COLORS.green50,
    border: COLORS.green500,
    text: COLORS.green800,
    icon: COLORS.green500,
  },
  error: {
    bg: COLORS.red50,
    border: COLORS.red500,
    text: COLORS.red800,
    icon: COLORS.red500,
  },
  warning: {
    bg: COLORS.amber50,
    border: COLORS.amber500,
    text: COLORS.amber800,
    icon: COLORS.amber500,
  },
  info: {
    bg: COLORS.blue50,
    border: COLORS.blue500,
    text: COLORS.blue800,
    icon: COLORS.blue500,
  },
}

interface ToastItemProps {
  toast: ToastType
}

function ToastItem({ toast }: ToastItemProps): JSX.Element {
  const { t } = useTranslation()
  const removeToast = useToastStore((state) => state.removeToast)
  const translateY = useRef(new Animated.Value(-100)).current
  const opacity = useRef(new Animated.Value(0)).current

  const dismissToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: ANIMATION_DURATION_MS,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: ANIMATION_DURATION_MS,
        useNativeDriver: true,
      }),
    ]).start(() => {
      removeToast(toast.id)
    })
  }, [removeToast, toast.id, translateY, opacity])

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: ANIMATION_DURATION_MS,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: ANIMATION_DURATION_MS,
        useNativeDriver: true,
      }),
    ]).start()

    // Announce for accessibility
    AccessibilityInfo.announceForAccessibility(toast.message)

    // Auto-dismiss timer
    const duration = toast.duration ?? DEFAULT_DURATION_MS
    const timer = setTimeout(dismissToast, duration)

    return () => clearTimeout(timer)
  }, [toast.id, toast.message, toast.duration, dismissToast, translateY, opacity])

  const styles = TOAST_STYLES[toast.type]
  const iconName = TOAST_ICONS[toast.type]

  return (
    <Animated.View
      style={[
        toastStyles.container,
        {
          backgroundColor: styles.bg,
          borderLeftColor: styles.border,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Feather
        name={iconName}
        size={20}
        color={styles.icon}
        style={toastStyles.icon}
      />
      <Text style={[toastStyles.message, { color: styles.text }]} numberOfLines={3}>
        {toast.message}
      </Text>
      <Pressable
        onPress={dismissToast}
        style={toastStyles.closeButton}
        accessibilityLabel={t('common.close')}
        accessibilityRole="button"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Feather name="x" size={18} color={styles.text} />
      </Pressable>
    </Animated.View>
  )
}

/**
 * Toast container component.
 * Renders all active toasts at the top of the screen.
 * Add this component to your app's root layout.
 */
export function ToastContainer(): JSX.Element | null {
  const insets = useSafeAreaInsets()
  const toasts = useToastStore((state) => state.toasts)

  if (toasts.length === 0) {
    return null
  }

  return (
    <View
      style={[
        toastStyles.wrapper,
        { paddingTop: insets.top + 8 },
      ]}
      pointerEvents="box-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </View>
  )
}

const toastStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 16,
    gap: 8,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    marginRight: 10,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  closeButton: {
    marginLeft: 8,
    padding: 4,
  },
})
