/**
 * Pending Sync Badge - Shows when an item has a pending offline operation.
 *
 * Display this badge on items (exchanges, compensations) that have
 * pending operations waiting to be synced.
 */

import type { ReactElement } from 'react'

import { useSyncStore } from '@volleykit/shared'

import { useTranslation } from '@/shared/hooks/useTranslation'

import { Clock } from '../icons'

interface PendingSyncBadgeProps {
  /** The entity ID to check for pending operations */
  entityId: string
  /** Additional CSS classes */
  className?: string
}

/**
 * Badge that shows "Pending sync" when an entity has queued operations.
 *
 * @example
 * ```tsx
 * <ExchangeCard exchange={exchange}>
 *   <PendingSyncBadge entityId={exchange.__identity} />
 * </ExchangeCard>
 * ```
 */
export function PendingSyncBadge({
  entityId,
  className = '',
}: PendingSyncBadgeProps): ReactElement | null {
  const { t } = useTranslation()
  const items = useSyncStore((state) => state.items)

  const isPending = items.some((item) => item.entityId === entityId && item.status === 'pending')

  if (!isPending) {
    return null
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full
        bg-warning-100 text-warning-800
        dark:bg-warning-900 dark:text-warning-200
        ${className}`}
      data-testid="pending-sync-badge"
    >
      <Clock className="h-3 w-3" />
      {t('sync.pendingSync' as never)}
    </span>
  )
}
