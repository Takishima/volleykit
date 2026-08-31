import { useMemo, useState } from 'react'

import { format, parseISO } from 'date-fns'

import type { RefereeAbsence } from '@/api/client'
import { LoadingState, ErrorState, EmptyState } from '@/common/components/LoadingSpinner'
import { PullToRefresh } from '@/common/components/PullToRefresh'
import { Tabs, TabPanel } from '@/common/components/Tabs'
import { useTranslation } from '@/common/hooks/useTranslation'
import { useAuthStore } from '@/common/stores/auth'

import { AbsenceCard } from './components/AbsenceCard'
import { useAbsences } from './hooks/useAbsences'
import { groupAbsences } from './utils/absence-helpers'

type AbsenceTab = 'upcoming' | 'past'

function AbsenceList({
  absences,
  emptyTitle,
  emptyDescription,
}: {
  absences: RefereeAbsence[]
  emptyTitle: string
  emptyDescription: string
}) {
  if (absences.length === 0) {
    return <EmptyState icon="calendar" title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className="space-y-2">
      {absences.map((absence) => (
        <AbsenceCard key={absence.__identity} absence={absence} />
      ))}
    </div>
  )
}

export function AbsencesPage() {
  const { t } = useTranslation()
  const isCalendarMode = useAuthStore((state) => state.isCalendarMode())
  const [activeTab, setActiveTab] = useState<AbsenceTab>('upcoming')

  const { data: absences, isLoading, error, refetch } = useAbsences()

  // Day-granular date key keeps the memo deps stable across re-renders and
  // regroups on the next render after midnight. parseISO reads the date-only
  // key as LOCAL midnight (unlike the native new Date('yyyy-MM-dd') UTC parse
  // used by the older hooks that share this idiom, which yields the previous
  // local day west of UTC). Day precision is enough: absences end at day
  // boundaries.
  const todayKey = format(new Date(), 'yyyy-MM-dd')
  const { upcoming, past } = useMemo(
    () => groupAbsences(absences ?? [], parseISO(todayKey)),
    [absences, todayKey]
  )

  if (isCalendarMode) {
    return (
      <EmptyState
        icon="calendar"
        title={t('absences.calendarModeTitle')}
        description={t('absences.calendarModeDescription')}
      />
    )
  }

  const tabs = [
    {
      id: 'upcoming' as const,
      label: t('absences.upcoming'),
      badge: upcoming.length > 0 ? String(upcoming.length) : undefined,
    },
    { id: 'past' as const, label: t('absences.past') },
  ]

  const renderContent = () => {
    if (isLoading) {
      return <LoadingState message={t('absences.loading')} />
    }

    if (error) {
      return (
        <ErrorState
          message={error instanceof Error ? error.message : t('absences.errorLoading')}
          onRetry={() => refetch()}
        />
      )
    }

    return (
      <>
        <TabPanel tabId="upcoming" activeTab={activeTab}>
          <AbsenceList
            absences={upcoming}
            emptyTitle={t('absences.noUpcomingTitle')}
            emptyDescription={t('absences.emptyDescription')}
          />
        </TabPanel>
        <TabPanel tabId="past" activeTab={activeTab}>
          <AbsenceList
            absences={past}
            emptyTitle={t('absences.noPastTitle')}
            emptyDescription={t('absences.emptyDescription')}
          />
          {/* The fetch window is unconditional, so the disclosure is too:
              "no past absences" alone would be an unqualified claim about
              the whole account. */}
          <p className="mt-3 text-sm text-text-muted dark:text-text-muted-dark">
            {t('absences.olderHistoryNote')}
          </p>
        </TabPanel>
      </>
    )
  }

  return (
    <PullToRefresh
      onRefresh={async () => {
        await refetch()
      }}
    >
      <div className="space-y-3">
        <p className="text-sm text-text-muted dark:text-text-muted-dark">
          {t('absences.associationScopeHint')}
        </p>
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as AbsenceTab)}
          ariaLabel={t('absences.title')}
        />
        {renderContent()}
      </div>
    </PullToRefresh>
  )
}
