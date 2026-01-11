import { useRef, useEffect } from 'react'

import type { RosterValidationStatus } from '@/features/validation/utils/roster-validation'
import { MIN_PLAYERS_REQUIRED } from '@/features/validation/utils/roster-validation'
import { Button } from '@/shared/components/Button'
import { AlertTriangle } from '@/shared/components/icons'
import { useTranslation } from '@/shared/hooks/useTranslation'

/** Z-index for warning dialog (above main modal) */
const Z_INDEX_WARNING_DIALOG = 60

interface RosterIssue {
  key: string
  message: string
}

interface RosterValidationWarningDialogProps {
  isOpen: boolean
  rosterValidation: RosterValidationStatus
  homeTeamName: string
  awayTeamName: string
  onGoBack: () => void
  onProceedAnyway: () => void
  isProceedingAnyway: boolean
}

/**
 * Warning dialog shown when trying to finalize with invalid rosters.
 * Warns about missing head coach or insufficient players which would
 * result in a forfeited game.
 */
export function RosterValidationWarningDialog({
  isOpen,
  rosterValidation,
  homeTeamName,
  awayTeamName,
  onGoBack,
  onProceedAnyway,
  isProceedingAnyway,
}: RosterValidationWarningDialogProps) {
  const { t, tInterpolate } = useTranslation()
  const dialogRef = useRef<HTMLDivElement>(null)

  // Focus first button when dialog opens for accessibility
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      const firstButton = dialogRef.current.querySelector('button')
      firstButton?.focus()
    }
  }, [isOpen])

  // Handle Escape key to close dialog
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProceedingAnyway) {
        onGoBack()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isProceedingAnyway, onGoBack])

  if (!isOpen) return null

  const { home, away } = rosterValidation

  // Build list of issues for each team with stable keys
  const homeIssues: RosterIssue[] = []
  const awayIssues: RosterIssue[] = []

  if (!home.hasHeadCoach) {
    homeIssues.push({
      key: 'home-coach',
      message: t('validation.rosterWarning.missingHeadCoach'),
    })
  }
  if (!home.hasMinPlayers) {
    homeIssues.push({
      key: 'home-players',
      message: tInterpolate('validation.rosterWarning.insufficientPlayers', {
        count: home.playerCount,
        required: MIN_PLAYERS_REQUIRED,
      }),
    })
  }

  if (!away.hasHeadCoach) {
    awayIssues.push({
      key: 'away-coach',
      message: t('validation.rosterWarning.missingHeadCoach'),
    })
  }
  if (!away.hasMinPlayers) {
    awayIssues.push({
      key: 'away-players',
      message: tInterpolate('validation.rosterWarning.insufficientPlayers', {
        count: away.playerCount,
        required: MIN_PLAYERS_REQUIRED,
      }),
    })
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop itself, not the dialog content
    if (e.target === e.currentTarget && !isProceedingAnyway) {
      onGoBack()
    }
  }

  // Backdrop pattern: aria-hidden="true" hides the backdrop from screen readers since it's
  // purely decorative. Click-to-close is a convenience feature; keyboard users close via Escape.
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
      style={{ zIndex: Z_INDEX_WARNING_DIALOG }}
      onClick={handleBackdropClick}
      aria-hidden="true"
    >
      <div
        ref={dialogRef}
        className="bg-surface-card dark:bg-surface-card-dark rounded-lg shadow-xl max-w-md w-full p-6"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="roster-warning-title"
        aria-describedby="roster-warning-description"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 p-2 bg-warning-100 dark:bg-warning-900/30 rounded-full">
            <AlertTriangle
              className="w-6 h-6 text-warning-600 dark:text-warning-400"
              aria-hidden="true"
            />
          </div>
          <div>
            <h3
              id="roster-warning-title"
              className="text-lg font-semibold text-text-primary dark:text-text-primary-dark"
            >
              {t('validation.rosterWarning.title')}
            </h3>
            <p
              id="roster-warning-description"
              className="text-sm text-text-muted dark:text-text-muted-dark mt-1"
            >
              {t('validation.rosterWarning.description')}
            </p>
          </div>
        </div>

        {/* Team issues list */}
        <div className="space-y-3 mb-6">
          {homeIssues.length > 0 && (
            <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg p-3">
              <p className="text-sm font-medium text-warning-800 dark:text-warning-300 mb-1">
                {homeTeamName}
              </p>
              <ul className="list-disc list-inside text-sm text-warning-700 dark:text-warning-400 space-y-0.5">
                {homeIssues.map((issue) => (
                  <li key={issue.key}>{issue.message}</li>
                ))}
              </ul>
            </div>
          )}

          {awayIssues.length > 0 && (
            <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg p-3">
              <p className="text-sm font-medium text-warning-800 dark:text-warning-300 mb-1">
                {awayTeamName}
              </p>
              <ul className="list-disc list-inside text-sm text-warning-700 dark:text-warning-400 space-y-0.5">
                {awayIssues.map((issue) => (
                  <li key={issue.key}>{issue.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <p className="text-xs text-text-muted dark:text-text-muted-dark mb-4">
          {t('validation.rosterWarning.forfeitNote')}
        </p>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onGoBack} disabled={isProceedingAnyway}>
            {t('validation.rosterWarning.goBack')}
          </Button>
          <Button variant="danger" onClick={onProceedAnyway} disabled={isProceedingAnyway}>
            {isProceedingAnyway ? t('common.loading') : t('validation.rosterWarning.proceedAnyway')}
          </Button>
        </div>
      </div>
    </div>
  )
}
