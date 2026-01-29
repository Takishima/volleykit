/**
 * Sync Status Indicator - Shows offline sync status in the UI.
 *
 * Displays different states:
 * - Hidden when online and no pending items
 * - "Offline" indicator when offline
 * - "X pending" indicator when items are queued
 * - Spinning icon when syncing
 */

import type { ReactElement } from 'react'

import { useSyncStore } from '@volleykit/shared'

import { useIsOnline } from '@/shared/hooks/useNetworkStatus'
import { useTranslation } from '@/shared/hooks/useTranslation'

import { CloudOff, RefreshCw, CheckCircle } from '../icons'

interface SyncStatusIndicatorProps {
  /** Optional callback when clicked */
  onClick?: () => void
  /** Additional CSS classes */
  className?: string
}

/**
 * Displays the current sync status.
 *
 * Shows nothing when online and synced, otherwise shows:
 * - Offline indicator
 * - Pending items count
 * - Syncing animation
 */
export function SyncStatusIndicator({
  onClick,
  className = '',
}: SyncStatusIndicatorProps): ReactElement | null {
  const { t, tInterpolate } = useTranslation()
  const isOnline = useIsOnline()
  const { items, isSyncing } = useSyncStore()
  const pendingCount = items.filter((i) => i.status === 'pending').length

  // Hide when online and no pending items
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null
  }

  const handleClick = () => {
    onClick?.()
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick?.()
    }
  }

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick ? handleClick : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      className={`flex items-center gap-1.5 text-sm ${className}`}
      data-testid="sync-status-indicator"
    >
      {/* Offline indicator */}
      {!isOnline && (
        <span
          className="flex items-center gap-1 text-warning-600 dark:text-warning-400"
          data-testid="sync-status-offline"
        >
          <CloudOff className="h-4 w-4" />
          <span>{t('sync.offline' as never)}</span>
        </span>
      )}

      {/* Pending items indicator */}
      {pendingCount > 0 && (
        <span
          className={`flex items-center gap-1 ${onClick ? 'cursor-pointer hover:underline' : ''} ${
            isOnline
              ? 'text-warning-600 dark:text-warning-400'
              : 'text-text-secondary dark:text-text-secondary-dark'
          }`}
          data-testid="sync-status-pending"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{tInterpolate('sync.pendingCount', { count: pendingCount })}</span>
        </span>
      )}

      {/* Just synced indicator (briefly shows success) */}
      {isOnline && pendingCount === 0 && isSyncing && (
        <span
          className="flex items-center gap-1 text-success-600 dark:text-success-400"
          data-testid="sync-status-syncing"
        >
          <CheckCircle className="h-4 w-4" />
          <span>{t('sync.syncing' as never)}</span>
        </span>
      )}
    </div>
  )
}
