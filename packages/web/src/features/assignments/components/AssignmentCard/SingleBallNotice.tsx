import { CircleAlert, ExternalLink } from '@/common/components/icons'
import { useTranslation } from '@/common/hooks/useTranslation'
import type { SingleBallCondition } from '@/data/single-ball-halls'
import type { TranslationKey } from '@/i18n'

import { useAssignmentCardContext } from './context'

/** Notice text shown for each single-ball condition */
const CONDITION_LABEL_KEYS: Record<SingleBallCondition, TranslationKey> = {
  always: 'assignments.singleBallHall',
  singleSubHall: 'assignments.singleBallHallConditional',
  refereeAtPartition: 'assignments.singleBallHallRefereeAtPartition',
}

/** Displays single-ball hall warning notice in details view */
export function SingleBallNotice() {
  const { t } = useTranslation()
  const { singleBallMatch, singleBallPdfPath } = useAssignmentCardContext()

  if (!singleBallMatch) {
    return null
  }

  return (
    <a
      href={singleBallPdfPath}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-xs text-warning-700 dark:text-warning-300 bg-warning-50 dark:bg-warning-900/20 px-2 py-1.5 rounded-md hover:bg-warning-100 dark:hover:bg-warning-900/30 transition-colors group"
      onClick={(e) => e.stopPropagation()}
    >
      <CircleAlert className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      <span className="underline decoration-warning-400/50 group-hover:decoration-warning-500 underline-offset-2">
        {t(CONDITION_LABEL_KEYS[singleBallMatch.condition])}
      </span>
      <ExternalLink
        className="w-3 h-3 flex-shrink-0 opacity-60 group-hover:opacity-100"
        aria-hidden="true"
      />
    </a>
  )
}
