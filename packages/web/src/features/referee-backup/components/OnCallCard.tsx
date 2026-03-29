import { memo } from 'react'

import { Card, CardContent } from '@/common/components/Card'
import { useDateFormat } from '@/common/hooks/useDateFormat'
import { useTranslation } from '@/common/hooks/useTranslation'

import type { OnCallAssignment } from '../hooks/useMyOnCallAssignments'

interface OnCallCardProps {
  assignment: OnCallAssignment
}

function OnCallCardComponent({ assignment }: OnCallCardProps) {
  const { t } = useTranslation()
  const { dateLabel, timeLabel, isToday } = useDateFormat(assignment.date)

  const ariaLabel = `${t('onCall.duty')} ${assignment.league} - ${dateLabel}`

  return (
    <Card
      className="bg-warning-50 dark:bg-warning-950/30 border-warning-200 dark:border-warning-800/50"
      aria-label={ariaLabel}
    >
      <CardContent className="p-0">
        <div className="px-2 py-2">
          <div className="flex items-center gap-3">
            {/* Date and time */}
            <div className="flex flex-col items-end w-14 shrink-0">
              <span
                className={`text-xs font-medium ${
                  isToday
                    ? 'text-warning-700 dark:text-warning-300'
                    : 'text-warning-600 dark:text-warning-400'
                }`}
              >
                {dateLabel}
              </span>
              <span className="text-lg font-bold text-warning-900 dark:text-warning-100">
                {timeLabel}
              </span>
            </div>

            {/* Label */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-warning-900 dark:text-warning-100">
                {t('onCall.duty')}
              </p>
            </div>

            {/* League badge */}
            <div
              className={`flex-shrink-0 px-2 py-1 text-xs font-semibold rounded ${
                assignment.league === 'NLA'
                  ? 'bg-warning-200 dark:bg-warning-800 text-warning-900 dark:text-warning-100'
                  : 'bg-warning-100 dark:bg-warning-900/70 text-warning-800 dark:text-warning-200'
              }`}
            >
              {assignment.league}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export const OnCallCard = memo(OnCallCardComponent)
