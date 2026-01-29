/**
 * Sync Results Modal - Shows results after syncing offline operations.
 *
 * Displays:
 * - Success count for completed operations
 * - Detailed conflict information for failed operations
 * - Auto-dismisses if all operations succeeded
 */

import { useEffect } from 'react'
import { useSyncStore, type SyncResult, type ConflictReason } from '@volleykit/shared'

import { useTranslation } from '@/shared/hooks/useTranslation'

import { Modal } from '../Modal'
import { ModalHeader } from '../ModalHeader'
import { ModalFooter } from '../ModalFooter'
import { Button } from '../Button'
import { CheckCircle, AlertTriangle } from '../icons'

/** Auto-dismiss delay for success-only results (in ms) */
const AUTO_DISMISS_DELAY = 5000

/**
 * Modal that shows the results of a sync operation.
 *
 * Opens automatically when there are sync results to display.
 * Auto-dismisses if all operations were successful.
 */
export function SyncResultsModal(): JSX.Element | null {
  const { t } = useTranslation()
  const { lastSyncResults, clearResults } = useSyncStore()

  const successes = lastSyncResults.filter((r) => r.status === 'success')
  const conflicts = lastSyncResults.filter((r) => r.status === 'conflict')

  const isOpen = lastSyncResults.length > 0

  // Auto-dismiss if all successful
  useEffect(() => {
    if (conflicts.length === 0 && successes.length > 0) {
      const timer = setTimeout(clearResults, AUTO_DISMISS_DELAY)
      return () => clearTimeout(timer)
    }
  }, [conflicts.length, successes.length, clearResults])

  if (!isOpen) {
    return null
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={clearResults}
      titleId="sync-results-title"
      size="md"
    >
      <ModalHeader
        title={t('sync.resultsTitle' as never)}
        titleId="sync-results-title"
        onClose={clearResults}
      />

      <div className="space-y-4 mb-6">
        {/* Success summary */}
        {successes.length > 0 && (
          <div className="flex items-center gap-2 text-success-600 dark:text-success-400">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <span>
              {t('sync.successCount' as never, { count: successes.length })}
            </span>
          </div>
        )}

        {/* Conflict details */}
        {conflicts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-warning-600 dark:text-warning-400">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <span>
                {t('sync.conflictCount' as never, { count: conflicts.length })}
              </span>
            </div>

            <div className="space-y-2">
              {conflicts.map((conflict) => (
                <ConflictItem key={conflict.item.id} result={conflict} />
              ))}
            </div>
          </div>
        )}
      </div>

      <ModalFooter>
        <Button variant="primary" className="flex-1" onClick={clearResults}>
          {t('common.dismiss' as never)}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

/**
 * Individual conflict item display.
 */
function ConflictItem({ result }: { result: SyncResult }): JSX.Element {
  const { t } = useTranslation()

  const getConflictMessage = (reason: ConflictReason | undefined): string => {
    const messages: Record<ConflictReason, string> = {
      already_taken: t('sync.conflict.already_taken' as never),
      not_found: t('sync.conflict.not_found' as never),
      expired: t('sync.conflict.expired' as never),
      permission_denied: t('sync.conflict.permission_denied' as never),
      unknown: t('sync.conflict.unknown' as never),
    }

    return messages[reason ?? 'unknown'] ?? messages.unknown
  }

  return (
    <div className="p-3 rounded-lg bg-surface-subtle dark:bg-surface-subtle-dark">
      <div className="font-medium text-sm text-text-primary dark:text-text-primary-dark">
        {result.item.displayLabel}
      </div>

      {result.item.entityLabel && (
        <div className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">
          {result.item.entityLabel}
        </div>
      )}

      <div className="text-xs text-warning-600 dark:text-warning-400 mt-1">
        {getConflictMessage(result.conflictReason)}
      </div>
    </div>
  )
}
