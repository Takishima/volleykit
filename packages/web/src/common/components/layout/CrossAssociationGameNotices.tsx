import { X } from '@/common/components/icons'
import {
  useCrossAssociationGameNotices,
  type CrossAssociationGameNotice,
} from '@/common/hooks/useCrossAssociationGames'
import { useTranslation } from '@/common/hooks/useTranslation'
import { useAuthStore } from '@/common/stores/auth'
import { useCrossAssociationGamesStore } from '@/common/stores/cross-association-games'

interface CrossAssociationGameNoticesProps {
  /** Switches the active occupation (reuses the AppShell switch handler) */
  onSwitch: (occupationId: string) => void | Promise<void>
}

function NoticePill({
  notice,
  onSwitch,
}: {
  notice: CrossAssociationGameNotice
  onSwitch: (occupationId: string) => void
}) {
  const { t, tInterpolate } = useTranslation()
  const dismissNotice = useCrossAssociationGamesStore((state) => state.dismissNotice)
  const isAssociationSwitching = useAuthStore((state) => state.isAssociationSwitching)

  const message = tInterpolate(
    notice.day === 'today'
      ? 'common.crossAssociationGameToday'
      : 'common.crossAssociationGameTomorrow',
    { association: notice.associationCode }
  )

  return (
    <div className="flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-surface-card dark:bg-surface-card-dark border border-border-default dark:border-border-default-dark shadow-lg">
      <span
        className="w-2 h-2 rounded-full bg-primary-500 dark:bg-primary-400 shrink-0"
        aria-hidden="true"
      />
      <button
        onClick={() => void onSwitch(notice.occupationId)}
        disabled={isAssociationSwitching}
        className="px-1 text-xs font-medium text-text-secondary dark:text-text-secondary-dark hover:text-primary-600 dark:hover:text-primary-400 disabled:cursor-wait"
        title={tInterpolate('common.crossAssociationSwitchTo', {
          association: notice.associationCode,
        })}
      >
        {message}
      </button>
      <button
        onClick={() => dismissNotice(notice.noticeKey)}
        aria-label={t('common.dismissNotification')}
        className="p-1 rounded-full text-text-muted dark:text-text-muted-dark hover:bg-surface-subtle dark:hover:bg-surface-subtle-dark"
      >
        <X className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}

/**
 * Subtle floating overlay shown when another association has a game today
 * or tomorrow. Rendered above the bottom navigation; tapping the message
 * switches to that association, the X dismisses the notice for that day.
 */
export function CrossAssociationGameNotices({ onSwitch }: CrossAssociationGameNoticesProps) {
  const notices = useCrossAssociationGameNotices()

  if (notices.length === 0) return null

  return (
    <div
      className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2"
      role="status"
      aria-live="polite"
      data-testid="cross-association-game-notices"
    >
      {notices.map((notice) => (
        <NoticePill key={notice.noticeKey} notice={notice} onSwitch={onSwitch} />
      ))}
    </div>
  )
}
