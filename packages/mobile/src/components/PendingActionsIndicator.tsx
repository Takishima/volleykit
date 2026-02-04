/**
 * Indicator component for pending offline actions.
 *
 * Shows:
 * - Badge with count of pending actions
 * - Toast notification when actions are synced
 *
 * Also handles automatic sync when connectivity is restored.
 */

import type { JSX } from 'react'
import { useEffect, useRef } from 'react'

import { View, Text, Animated, Alert } from 'react-native'

import { Feather } from '@expo/vector-icons'

import { useTranslation } from '@volleykit/shared/i18n'

import { COLORS } from '../constants'
import { useNetwork } from '../providers/NetworkProvider'
import {
  useActionQueueStore,
  initializeActionQueueStore,
} from '../services/offline/action-queue-store'

/** Animation duration for pulse effect */
const PULSE_DURATION_MS = 1000

/** Icon size for the badge */
const BADGE_ICON_SIZE = 14

/** Spacing between icon and count text */
const BADGE_ICON_MARGIN = 4

/**
 * Hook to sync pending actions when coming back online.
 * Uses refs to prevent race conditions during sync operations.
 */
function useAutoSync() {
  const { t } = useTranslation()
  const { isOnline, isKnown } = useNetwork()
  const wasOnlineRef = useRef(isOnline)
  const syncTriggeredRef = useRef(false)
  const { sync, pendingCount, isSyncing } = useActionQueueStore()

  // Initialize store on mount
  useEffect(() => {
    initializeActionQueueStore()
  }, [])

  // Reset sync trigger when sync completes
  useEffect(() => {
    if (!isSyncing) {
      syncTriggeredRef.current = false
    }
  }, [isSyncing])

  // Sync when coming back online
  useEffect(() => {
    if (!isKnown) return

    const wasOnline = wasOnlineRef.current
    wasOnlineRef.current = isOnline

    // Detect transition from offline to online
    // Guard against re-triggering during pendingCount updates with syncTriggeredRef
    if (!wasOnline && isOnline && pendingCount > 0 && !syncTriggeredRef.current && !isSyncing) {
      syncTriggeredRef.current = true
      console.info(
        '[PendingActionsIndicator] Connectivity restored, syncing pending actions:',
        pendingCount
      )

      sync()
        .then((result) => {
          if (result) {
            if (result.succeeded > 0) {
              console.info('[PendingActionsIndicator] Sync complete:', result.succeeded)
            }
            if (result.failed > 0) {
              console.warn('[PendingActionsIndicator] Sync failed:', result.failed)
              Alert.alert(t('common.error'), t('offline.syncFailed', { count: result.failed }), [
                { text: t('common.close') },
              ])
            }
            if (result.requiresReauth) {
              console.warn('[PendingActionsIndicator] Session expired during sync')
            }
          }
        })
        .catch((error) => {
          console.error('[PendingActionsIndicator] Failed to sync pending actions:', error)
          Alert.alert(t('common.error'), t('offline.syncError'), [{ text: t('common.close') }])
        })
    }
  }, [isOnline, isKnown, pendingCount, sync, isSyncing, t])

  return { isSyncing }
}

/**
 * Props for PendingActionsBadge.
 */
export interface PendingActionsBadgeProps {
  /** Optional style overrides */
  style?: object
}

/**
 * Badge showing pending action count.
 * Only visible when there are pending actions.
 */
export function PendingActionsBadge({ style }: PendingActionsBadgeProps): JSX.Element | null {
  const { t } = useTranslation()
  const { pendingCount, isSyncing } = useActionQueueStore()
  const pulseAnim = useRef(new Animated.Value(1)).current

  useAutoSync()

  // Pulse animation when syncing
  useEffect(() => {
    if (isSyncing) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: PULSE_DURATION_MS / 2,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: PULSE_DURATION_MS / 2,
            useNativeDriver: true,
          }),
        ])
      )
      animation.start()
      return () => animation.stop()
    } else {
      pulseAnim.setValue(1)
    }
  }, [isSyncing, pulseAnim])

  if (pendingCount === 0 && !isSyncing) {
    return null
  }

  return (
    <Animated.View
      style={[{ opacity: pulseAnim }, style]}
      accessibilityRole="text"
      accessibilityLabel={t('offline.pendingActions', { count: pendingCount })}
      accessibilityLiveRegion="polite"
    >
      <View className="flex-row items-center bg-amber-100 rounded-full px-2.5 py-1">
        <Feather
          name="upload-cloud"
          size={BADGE_ICON_SIZE}
          color={COLORS.amber600}
          style={{ marginRight: BADGE_ICON_MARGIN }}
        />
        <Text className="text-amber-800 text-xs font-medium">{pendingCount}</Text>
        {isSyncing && (
          <Text className="sr-only">{t('offline.syncing')}</Text>
        )}
      </View>
    </Animated.View>
  )
}

/**
 * Full indicator with badge and auto-sync functionality.
 * Use this in the app header.
 */
export function PendingActionsIndicator(): JSX.Element | null {
  // The badge component handles auto-sync internally
  return <PendingActionsBadge />
}
