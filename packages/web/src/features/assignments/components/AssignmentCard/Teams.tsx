import { MaleIcon, FemaleIcon } from '@/shared/components/icons'
import { useTranslation } from '@/shared/hooks/useTranslation'

import { useAssignmentCardContext } from './context'

/** Displays team names, position, and gender indicator in compact view */
export function Teams() {
  const { t } = useTranslation()
  const { homeTeam, awayTeam, position, gender } = useAssignmentCardContext()

  return (
    <div className="flex-1 min-w-0">
      <div className="font-medium text-text-primary dark:text-text-primary-dark truncate">
        {homeTeam}
      </div>
      <div className="text-sm text-text-secondary dark:text-text-muted-dark truncate">
        {t('common.vs')} {awayTeam}
      </div>
      <div className="text-xs text-text-subtle dark:text-text-subtle-dark flex items-center gap-1">
        <span>{position}</span>
        {gender === 'm' && (
          <MaleIcon
            className="w-3 h-3 text-blue-500 dark:text-blue-400"
            aria-label={t('common.men')}
          />
        )}
        {gender === 'f' && (
          <FemaleIcon
            className="w-3 h-3 text-pink-500 dark:text-pink-400"
            aria-label={t('common.women')}
          />
        )}
      </div>
    </div>
  )
}
