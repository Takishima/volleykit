import { Link } from 'react-router-dom'

import { Card } from '@/common/components/Card'
import { CalendarX2, ChevronRight } from '@/common/components/icons'
import { useTranslation } from '@/common/hooks/useTranslation'

/**
 * Navigation card to the Absences page, rendered by SettingsPage. Lives in
 * the absences feature so the route, icon, and title key stay with the
 * domain that owns them; the entry point sits in Settings because the bottom
 * nav caps at four tabs.
 */
export function AbsencesLinkSection() {
  const { t } = useTranslation()

  return (
    <Card>
      <Link
        to="/absences"
        data-testid="settings-absences-link"
        className="w-full px-4 py-3 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset rounded-xl"
      >
        <CalendarX2
          className="w-5 h-5 text-text-muted dark:text-text-muted-dark"
          aria-hidden="true"
        />
        <span className="font-semibold text-text-primary dark:text-text-primary-dark flex-1">
          {t('absences.title')}
        </span>
        <ChevronRight
          className="w-5 h-5 text-text-muted dark:text-text-muted-dark shrink-0"
          aria-hidden="true"
        />
      </Link>
    </Card>
  )
}
