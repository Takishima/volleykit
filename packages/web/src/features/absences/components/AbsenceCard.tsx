import { memo } from 'react'

import type { RefereeAbsence } from '@/api/client'
import { Card, CardContent } from '@/common/components/Card'
import { Lock } from '@/common/components/icons'
import { useDateFormat } from '@/common/hooks/useDateFormat'
import { useTranslation } from '@/common/hooks/useTranslation'

import { isAbsenceReadOnly, isSingleDayAbsence } from '../utils/absence-helpers'

const DATE_PATTERN = 'EEE, d. MMM yyyy'

interface AbsenceCardProps {
  absence: RefereeAbsence
}

function AbsenceCardComponent({ absence }: AbsenceCardProps) {
  const { t } = useTranslation()
  const from = useDateFormat(absence.fromDate, DATE_PATTERN)
  const to = useDateFormat(absence.toDate, DATE_PATTERN)

  const isSingleDay =
    from.date !== null && to.date !== null && isSingleDayAbsence(from.date, to.date)
  const dateText = isSingleDay ? from.dateLabel : `${from.dateLabel} – ${to.dateLabel}`
  const readOnly = isAbsenceReadOnly(absence)
  const reason = absence.detailedReason?.trim()

  return (
    <Card aria-label={`${t('absences.entryLabel')}: ${dateText}`}>
      <CardContent className="p-0">
        <div className="px-3 py-2 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
              {dateText}
            </p>
            <p className="text-sm text-text-muted dark:text-text-muted-dark truncate">
              {reason || t('absences.noReason')}
            </p>
          </div>

          {readOnly && (
            <div
              className="flex-shrink-0 flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded bg-surface-subtle dark:bg-surface-subtle-dark text-text-secondary dark:text-text-muted-dark"
              title={t('absences.readOnlyTooltip')}
            >
              <Lock className="w-3 h-3" aria-hidden="true" />
              <span>{t('absences.readOnly')}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export const AbsenceCard = memo(AbsenceCardComponent)
