import { useMemo, useState } from 'react'

import { format, parseISO } from 'date-fns'
import { Link } from 'react-router-dom'

import type { RefereeAbsence } from '@/api/client'
import { ArrowLeft } from '@/common/components/icons'
import { LoadingState, ErrorState, EmptyState } from '@/common/components/LoadingSpinner'
import { PullToRefresh } from '@/common/components/PullToRefresh'
import { Tabs, TabPanel } from '@/common/components/Tabs'
import { useTranslation } from '@/common/hooks/useTranslation'
import { useAuthStore } from '@/common/stores/auth'

import { AbsenceCard } from './components/AbsenceCard'
import { useAbsences } from './hooks/useAbsences'
import { groupAbsences } from './utils/absence-helpers'

type AbsenceTab = 'upcoming' | 'past'

// Reached from Settings, not the bottom nav, so give a way back
function AbsencesHeader() {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-2">
      <Link
        to="/settings"
        aria-label={t('absences.backToSettings')}
        className="p-1 -ml-1 rounded-lg text-text-muted hover:text-text-secondary dark:text-text-muted-dark dark:hover:text-text-secondary-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <ArrowLeft className="w-5 h-5" aria-hidden="true" />
      </Link>
      <h1 className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">
        {t('absences.title')}
      </h1>
    </div>
  )
}

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
  const { t, tInterpolate } = useTranslation()
  const isCalendarMode = useAuthStore((state) => state.isCalendarMode())
  const [activeTab, setActiveTab] = useState<AbsenceTab>('upcoming')

  const { data, isLoading, error, refetch } = useAbsences()
  const absences = data?.absences
  const totalItemsCount = data?.totalItemsCount ?? 0
  const hasMore = data?.hasMore ?? false

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

  // Calendar mode hides the Settings entry, so this page is only reachable
  // by bookmark or typed URL there - keep the header and back link anyway.
  if (isCalendarMode) {
    return (
      <div className="space-y-3">
        <AbsencesHeader />
        <EmptyState
          icon="calendar"
          title={t('absences.calendarModeTitle')}
          description={t('absences.calendarModeDescription')}
        />
      </div>
    )
  }

  // The tab strip renders outside renderContent(), so the badge needs its
  // own error gate: a failed refetch keeps the last successful data in the
  // query cache, and a count derived from it may not sit above the error
  // state. renderContent()'s branch structure covers everything below it.
  const tabs = [
    {
      id: 'upcoming' as const,
      label: t('absences.upcoming'),
      badge: !error && upcoming.length > 0 ? String(upcoming.length) : undefined,
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
        {/* Server-regression guard: the bodyless request returns everything
            today, so this fires only if the server reintroduces paging.
            Which end a hypothetical page would cut is unknowable, so the
            disclosure sits above both tab panels. The error case cannot
            reach this branch - it returned above. */}
        {hasMore && (
          <p className="text-sm text-text-muted dark:text-text-muted-dark">
            {tInterpolate('absences.truncatedNote', { total: totalItemsCount })}
          </p>
        )}
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
        <AbsencesHeader />
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
