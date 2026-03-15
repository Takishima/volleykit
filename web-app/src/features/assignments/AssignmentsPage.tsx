import { lazy, Suspense, Fragment } from 'react'

import type { Assignment } from '@/api/client'
import { AssignmentCard } from '@/features/assignments/components/AssignmentCard'
import { OnCallCard } from '@/features/referee-backup'
import { LoadingState, ErrorState, EmptyState } from '@/shared/components/LoadingSpinner'
import { PullToRefresh } from '@/shared/components/PullToRefresh'
import { SwipeableCard } from '@/shared/components/SwipeableCard'
import { WeekSeparator } from '@/shared/components/WeekSeparator'
import { useTranslation } from '@/shared/hooks/useTranslation'

import {
  useAssignmentsPageLogic,
  getEmptyStateContent,
  type DisplayItem,
  type CalendarAssignment,
} from './hooks/useAssignmentsPageLogic'
import { mapCalendarAssignmentToAssignment } from './utils/calendar-helpers'

const PdfLanguageModal = lazy(() =>
  import('@/shared/components/PdfLanguageModal').then((m) => ({
    default: m.PdfLanguageModal,
  }))
)

const EditCompensationModal = lazy(() =>
  import('@/features/compensations/components/EditCompensationModal').then((m) => ({
    default: m.EditCompensationModal,
  }))
)

const ValidateGameModal = lazy(() =>
  import('@/features/validation/components/ValidateGameModal').then((m) => ({
    default: m.ValidateGameModal,
  }))
)

export function AssignmentsPage() {
  const { t } = useTranslation()
  const {
    activeTab,
    setActiveTab,
    groupedData,
    showDummyData,
    calendarData,
    isLoading,
    error,
    isCalendarMode,
    getSwipeConfig,
    handleRefresh,
    refetch,
    editCompensationModal,
    validateGameModal,
    pdfReportModal,
    upcomingCount,
    validationClosedCount,
  } = useAssignmentsPageLogic()

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-3">
        {/* Tabs - WAI-ARIA tab pattern */}
        <div
          role="tablist"
          aria-label={t('assignments.title')}
          className="flex gap-2 border-b border-border-default dark:border-border-default-dark"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'upcoming'}
            aria-controls="tabpanel-upcoming"
            id="tab-upcoming"
            onClick={() => setActiveTab('upcoming')}
            className={`
            px-4 py-2 text-sm font-medium border-b-2 transition-colors
            ${
              activeTab === 'upcoming'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-text-muted dark:text-text-muted-dark hover:text-text-secondary dark:hover:text-text-secondary-dark'
            }
          `}
          >
            {t('assignments.upcoming')}
            {upcomingCount > 0 ? (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 text-xs">
                {upcomingCount}
              </span>
            ) : null}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'validationClosed'}
            aria-controls="tabpanel-validationClosed"
            id="tab-validationClosed"
            onClick={() => setActiveTab('validationClosed')}
            className={`
            px-4 py-2 text-sm font-medium border-b-2 transition-colors
            ${
              activeTab === 'validationClosed'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-text-muted dark:text-text-muted-dark hover:text-text-secondary dark:hover:text-text-secondary-dark'
            }
          `}
          >
            {isCalendarMode ? t('assignments.past') : t('assignments.validationClosed')}
            {validationClosedCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-surface-subtle dark:bg-surface-card-dark text-text-secondary dark:text-text-muted-dark text-xs">
                {validationClosedCount}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div
          role="tabpanel"
          id={activeTab === 'upcoming' ? 'tabpanel-upcoming' : 'tabpanel-validationClosed'}
          aria-labelledby={activeTab === 'upcoming' ? 'tab-upcoming' : 'tab-validationClosed'}
          className="space-y-3"
        >
          {/* Skip loading state when showing dummy tour data (we already have data to show) */}
          {isLoading && !showDummyData && <LoadingState message={t('assignments.loading')} />}

          {error && (
            <ErrorState
              message={error instanceof Error ? error.message : t('assignments.failedToLoadData')}
              onRetry={() => refetch()}
            />
          )}

          {(!isLoading || showDummyData) && !error && groupedData.length === 0 && (
            <EmptyState
              icon={activeTab === 'upcoming' ? 'calendar' : 'lock'}
              {...getEmptyStateContent(
                isCalendarMode,
                activeTab,
                (calendarData?.length ?? 0) > 0,
                t
              )}
            />
          )}

          {(!isLoading || showDummyData) && !error && groupedData.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {groupedData.map((group, groupIndex) => {
                // Track global item index for tour data attribute
                const itemsBeforeThisGroup = groupedData
                  .slice(0, groupIndex)
                  .reduce((sum, g) => sum + g.items.length, 0)

                return (
                  <Fragment key={group.week.key}>
                    {/* Only show separator if there's more than one week */}
                    {groupedData.length > 1 && <WeekSeparator week={group.week} />}
                    {isCalendarMode && !showDummyData
                      ? // Calendar mode: same card component, limited swipe actions
                        (group.items as CalendarAssignment[]).map(
                          (calendarAssignment, itemIndex) => {
                            const assignment = mapCalendarAssignmentToAssignment(calendarAssignment)
                            return (
                              <SwipeableCard
                                key={calendarAssignment.gameId}
                                swipeConfig={getSwipeConfig(assignment, t)}
                              >
                                {({ isDrawerOpen }) => (
                                  <AssignmentCard
                                    assignment={assignment}
                                    disableExpansion={isDrawerOpen}
                                    dataTour={
                                      itemsBeforeThisGroup + itemIndex === 0
                                        ? 'assignment-card'
                                        : undefined
                                    }
                                  />
                                )}
                              </SwipeableCard>
                            )
                          }
                        )
                      : activeTab === 'upcoming' && !showDummyData
                        ? // Upcoming tab (API/demo mode): render mixed DisplayItems
                          (group.items as DisplayItem[]).map((displayItem, itemIndex) => {
                            if (displayItem.type === 'onCall') {
                              return (
                                <OnCallCard
                                  key={displayItem.item.id}
                                  assignment={displayItem.item}
                                />
                              )
                            }
                            const assignment = displayItem.item
                            return (
                              <SwipeableCard
                                key={assignment.__identity}
                                swipeConfig={getSwipeConfig(assignment, t)}
                              >
                                {({ isDrawerOpen }) => (
                                  <AssignmentCard
                                    assignment={assignment}
                                    disableExpansion={isDrawerOpen}
                                    dataTour={
                                      itemsBeforeThisGroup + itemIndex === 0
                                        ? 'assignment-card'
                                        : undefined
                                    }
                                  />
                                )}
                              </SwipeableCard>
                            )
                          })
                        : // Validation closed tab or tour dummy: render regular assignments
                          (group.items as Assignment[]).map((assignment, itemIndex) => (
                            <SwipeableCard
                              key={assignment.__identity}
                              swipeConfig={getSwipeConfig(assignment, t)}
                            >
                              {({ isDrawerOpen }) => (
                                <AssignmentCard
                                  assignment={assignment}
                                  disableExpansion={isDrawerOpen}
                                  dataTour={
                                    itemsBeforeThisGroup + itemIndex === 0
                                      ? 'assignment-card'
                                      : undefined
                                  }
                                />
                              )}
                            </SwipeableCard>
                          ))}
                  </Fragment>
                )
              })}
            </div>
          )}
        </div>

        {/* Modals */}
        {editCompensationModal.assignment && (
          <Suspense fallback={null}>
            <EditCompensationModal
              assignment={editCompensationModal.assignment}
              isOpen={editCompensationModal.isOpen}
              onClose={editCompensationModal.close}
            />
          </Suspense>
        )}

        {validateGameModal.assignment && (
          <Suspense fallback={null}>
            <ValidateGameModal
              key={validateGameModal.assignment.__identity}
              assignment={validateGameModal.assignment}
              isOpen={validateGameModal.isOpen}
              onClose={validateGameModal.close}
            />
          </Suspense>
        )}

        {pdfReportModal.isOpen && (
          <Suspense fallback={null}>
            <PdfLanguageModal
              isOpen={pdfReportModal.isOpen}
              onClose={pdfReportModal.close}
              onConfirm={pdfReportModal.onConfirm}
              isLoading={pdfReportModal.isLoading}
              defaultLanguage={pdfReportModal.defaultLanguage}
            />
          </Suspense>
        )}
      </div>
    </PullToRefresh>
  )
}
