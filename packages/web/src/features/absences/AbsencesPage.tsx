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

function AbsenceList({ absences, emptyTitle }: { absences: RefereeAbsence[]; emptyTitle: string }) {
  const { t } = useTranslation()

  if (absences.length === 0) {
    return (
      <EmptyState icon="calendar" title={emptyTitle} description={t('absences.emptyDescription')} />
    )
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
  const { t, tInterpolate } = useTranslation()
  const isCalendarMode = useAuthStore((state) => state.isCalendarMode())
  const [activeTab, setActiveTab] = useState<AbsenceTab>('upcoming')

  const { data, isLoading, error, refetch } = useAbsences()
  const absences = data?.absences
  const totalItemsCount = data?.totalItemsCount ?? 0
  const hasMoreHistory = data?.hasMoreHistory ?? false

  // Day-granular date key keeps the memo deps stable across re-renders and
  // regroups on the next render after midnight (same trick as
  // useRefereeBackups). parseISO reads the date-only key as LOCAL midnight -
  // native new Date('yyyy-MM-dd') would parse UTC and yield the previous
  // local day west of UTC. Day precision is enough: absences end at day
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
          <AbsenceList absences={upcoming} emptyTitle={t('absences.noUpcomingTitle')} />
        </TabPanel>
        <TabPanel tabId="past" activeTab={activeTab}>
          <AbsenceList absences={past} emptyTitle={t('absences.noPastTitle')} />
          {hasMoreHistory && (
            <p className="mt-3 text-sm text-text-muted dark:text-text-muted-dark">
              {tInterpolate('absences.olderHistoryNote', { total: totalItemsCount })}
            </p>
          )}
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
