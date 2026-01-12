import { AlertTriangle } from 'lucide-react'

import type { AssignmentConflict } from '@/features/assignments/utils/conflict-detection'
import { formatGap } from '@/features/assignments/utils/conflict-detection'
import { useDateFormat } from '@/shared/hooks/useDateFormat'
import { useTranslation } from '@/shared/hooks/useTranslation'

interface ConflictWarningProps {
  conflicts: AssignmentConflict[]
}

/**
 * Displays a compact warning indicator for scheduling conflicts.
 * Shows in the compact view alongside the city info.
 */
export function ConflictIndicator({ conflicts }: ConflictWarningProps) {
  const { t } = useTranslation()

  if (conflicts.length === 0) {
    return null
  }

  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 flex-shrink-0"
      title={t('assignments.conflictWarningTooltip')}
      aria-label={t('assignments.conflictWarningTooltip')}
    >
      <AlertTriangle className="w-3 h-3" aria-hidden="true" />
    </span>
  )
}

/**
 * Displays conflict details for a single conflicting assignment.
 */
function ConflictDetail({ conflict }: { conflict: AssignmentConflict }) {
  const { t } = useTranslation()
  const { timeLabel } = useDateFormat(conflict.conflictingAssignment.startTime)

  const { conflictingAssignment } = conflict
  const associationLabel = conflictingAssignment.association
    ? `(${conflictingAssignment.association})`
    : ''

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm font-medium text-red-700 dark:text-red-300">
        {conflictingAssignment.homeTeam} - {conflictingAssignment.awayTeam}
      </span>
      <span className="text-xs text-text-muted dark:text-text-muted-dark">
        {timeLabel} {associationLabel && <span className="font-medium">{associationLabel}</span>}
        {' · '}
        {formatGap(conflict.gapMinutes)}
      </span>
      {conflictingAssignment.hallName && (
        <span className="text-xs text-text-subtle dark:text-text-subtle-dark">
          {t('assignments.hall')}: {conflictingAssignment.hallName}
        </span>
      )}
    </div>
  )
}

/**
 * Displays detailed conflict information in the expanded view.
 * Shows each conflicting assignment with time gap and association.
 */
export function ConflictDetails({ conflicts }: ConflictWarningProps) {
  const { t } = useTranslation()

  if (conflicts.length === 0) {
    return null
  }

  return (
    <div className="flex items-start gap-2 py-1.5 px-2 bg-red-50 dark:bg-red-950/30 rounded-md border border-red-200 dark:border-red-800/50">
      <AlertTriangle
        className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-1.5 min-w-0">
        <span className="text-xs font-medium text-red-700 dark:text-red-300">
          {t('assignments.conflictWarningTitle')}
        </span>
        {conflicts.map((conflict) => (
          <ConflictDetail key={conflict.conflictingAssignmentId} conflict={conflict} />
        ))}
      </div>
    </div>
  )
}
