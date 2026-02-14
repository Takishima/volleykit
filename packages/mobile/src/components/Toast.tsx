/**
 * Toast notification components for mobile app.
 *
 * Provides in-app toast notifications for sync status,
 * errors, and other transient feedback.
 */

import type { JSX } from 'react'
import { useEffect, useRef } from 'react'

import { View, Text, Animated, Pressable, StyleSheet } from 'react-native'

import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useTranslation } from '@volleykit/shared/i18n'

import {
  useToastStore,
  DEFAULT_TOAST_DURATION_MS,
  type Toast,
  type ToastType,
} from '../stores/toast'

/** Animation duration for toast entrance/exit */
const ANIMATION_DURATION_MS = 200

/** Toast icon size */
const TOAST_ICON_SIZE = 18

/** Close button icon size */
const CLOSE_ICON_SIZE = 16

/** Toast styles by type */
const TOAST_STYLES: Record<
  ToastType,
  { bg: string; border: string; text: string; iconColor: string }
> = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    iconColor: '#22c55e', // green-500
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    iconColor: '#ef4444', // red-500
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    iconColor: '#f59e0b', // amber-500
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    iconColor: '#3b82f6', // blue-500
  },
}

/** Toast icons by type */
const TOAST_ICONS: Record<ToastType, keyof typeof Feather.glyphMap> = {
  success: 'check-circle',
  error: 'x-circle',
  warning: 'alert-triangle',
  info: 'info',
}

interface ToastItemProps {
  toast: Toast
}

/**
 * Individual toast item with auto-dismiss.
 */
function ToastItem({ toast }: ToastItemProps): JSX.Element {
  const { t } = useTranslation()
  const removeToast = useToastStore((state) => state.removeToast)
  const opacityAnim = useRef(new Animated.Value(0)).current
  const translateYAnim = useRef(new Animated.Value(-20)).current
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: ANIMATION_DURATION_MS,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: ANIMATION_DURATION_MS,
        useNativeDriver: true,
      }),
    ]).start()
  }, [opacityAnim, translateYAnim])

  // Auto-dismiss after duration
  useEffect(() => {
    const duration = toast.duration ?? DEFAULT_TOAST_DURATION_MS

    dismissTimeoutRef.current = setTimeout(() => {
      // Exit animation before removing
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: ANIMATION_DURATION_MS,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: -20,
          duration: ANIMATION_DURATION_MS,
          useNativeDriver: true,
        }),
      ]).start(() => {
        removeToast(toast.id)
      })
    }, duration)

    return () => {
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current)
      }
    }
  }, [toast.id, toast.duration, opacityAnim, translateYAnim, removeToast])

  const handleDismiss = () => {
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current)
    }

    // Animate out then remove
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: ANIMATION_DURATION_MS,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: -20,
        duration: ANIMATION_DURATION_MS,
        useNativeDriver: true,
      }),
    ]).start(() => {
      removeToast(toast.id)
    })
  }

  const styles = TOAST_STYLES[toast.type]
  const iconName = TOAST_ICONS[toast.type]

  return (
    <Animated.View
      style={[
        localStyles.toastShadow,
        { opacity: opacityAnim, transform: [{ translateY: translateYAnim }] },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View className={`flex-row items-start rounded-lg border p-3 ${styles.bg} ${styles.border}`}>
        <Feather
          name={iconName}
          size={TOAST_ICON_SIZE}
          color={styles.iconColor}
          style={localStyles.icon}
        />
        <Text className={`flex-1 text-sm font-medium ${styles.text}`}>{toast.message}</Text>
        <Pressable
          onPress={handleDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        >
          <Feather name="x" size={CLOSE_ICON_SIZE} color={styles.iconColor} />
        </Pressable>
      </View>
    </Animated.View>
  )
}

/**
 * Toast container that renders all active toasts.
 * Should be placed at the root of the app.
 */
export function ToastContainer(): JSX.Element | null {
  const toasts = useToastStore((state) => state.toasts)
  const insets = useSafeAreaInsets()

  if (toasts.length === 0) {
    return null
  }

  return (
    <View style={[localStyles.container, { top: insets.top + 8 }]} pointerEvents="box-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </View>
  )
}

const localStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
    gap: 8,
  },
  toastShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    marginRight: 8,
    marginTop: 1,
  },
})
