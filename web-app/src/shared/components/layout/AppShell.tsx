import { useRef, useCallback, useMemo, lazy, Suspense } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { Outlet } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'

import { getApiClient } from '@/api/client'
import {
  Volleyball,
  ClipboardList,
  Wallet,
  ArrowLeftRight,
  Settings,
  Calendar,
} from '@/shared/components/icons'
import { OfflineIndicator } from '@/shared/components/OfflineIndicator'
import { PendingActionsIndicator } from '@/shared/components/PendingActionsIndicator'
import { TourModeBanner } from '@/shared/components/tour/TourModeBanner'
import { features } from '@/shared/config/features'
import { prefetchAllTabData } from '@/shared/hooks/usePrefetchTabData'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { useAuthStore, type Occupation } from '@/shared/stores/auth'
import { useCalendarFilterStore, ALL_ASSOCIATIONS } from '@/shared/stores/calendar-filter'
import { toast } from '@/shared/stores/toast'
import { createLogger } from '@/shared/utils/logger'
import { getOccupationLabelKey } from '@/shared/utils/occupation-labels'

import { BottomNavigation, type NavItem } from './BottomNavigation'
import { HeaderDropdown } from './HeaderDropdown'

const log = createLogger('AppShell')

// Lazy-load debug panel to avoid bundle size impact in production
const DebugPanel = lazy(() =>
  import('@/shared/components/debug/DebugPanel').then((m) => ({
    default: m.DebugPanel,
  }))
)

const MINIMUM_OCCUPATIONS_FOR_SWITCHER = 2
const MINIMUM_ASSOCIATIONS_FOR_FILTER = 2

const allNavItems: NavItem[] = [
  { path: '/', labelKey: 'nav.assignments', icon: ClipboardList, testId: 'nav-assignments' },
  {
    path: '/compensations',
    labelKey: 'nav.compensations',
    icon: Wallet,
    testId: 'nav-compensations',
  },
  { path: '/exchange', labelKey: 'nav.exchange', icon: ArrowLeftRight, testId: 'nav-exchange' },
  { path: '/settings', labelKey: 'nav.settings', icon: Settings, testId: 'nav-settings' },
]

// Paths that are hidden in calendar mode (read-only view)
const CALENDAR_MODE_HIDDEN_PATHS = ['/compensations', '/exchange']

export function AppShell() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const {
    status,
    user,
    logout,
    activeOccupationId,
    setActiveOccupation,
    dataSource,
    isAssociationSwitching,
    setAssociationSwitching,
    isCalendarMode,
  } = useAuthStore(
    useShallow((state) => ({
      status: state.status,
      user: state.user,
      logout: state.logout,
      activeOccupationId: state.activeOccupationId,
      setActiveOccupation: state.setActiveOccupation,
      dataSource: state.dataSource,
      isAssociationSwitching: state.isAssociationSwitching,
      setAssociationSwitching: state.setAssociationSwitching,
      isCalendarMode: state.isCalendarMode(),
    }))
  )

  const {
    selectedAssociation,
    associations: calendarAssociations,
    setSelectedAssociation,
  } = useCalendarFilterStore(
    useShallow((s) => ({
      selectedAssociation: s.selectedAssociation,
      associations: s.associations,
      setSelectedAssociation: s.setSelectedAssociation,
    }))
  )

  // Track the latest switch request to handle race conditions
  // when user rapidly clicks different associations
  const switchCounterRef = useRef(0)

  const getOccupationLabel = useCallback(
    (occupation: Occupation): string => {
      if (occupation.clubName) {
        return occupation.clubName
      }
      if (occupation.associationCode) {
        return occupation.associationCode
      }
      const labelKey = getOccupationLabelKey(occupation.type)
      return t(labelKey)
    },
    [t]
  )

  // Determine if we should show dropdowns based on mode
  const showCalendarDropdown =
    isCalendarMode && calendarAssociations.length >= MINIMUM_ASSOCIATIONS_FOR_FILTER
  const showOccupationDropdown =
    !isCalendarMode &&
    user?.occupations &&
    user.occupations.length >= MINIMUM_OCCUPATIONS_FOR_SWITCHER
  const isAuthenticated = status === 'authenticated'

  // Filter nav items based on calendar mode
  const navItems = useMemo(() => {
    if (isCalendarMode) {
      return allNavItems.filter((item) => !CALENDAR_MODE_HIDDEN_PATHS.includes(item.path))
    }
    return allNavItems
  }, [isCalendarMode])

  const activeOccupation =
    user?.occupations?.find((o) => o.id === activeOccupationId) ?? user?.occupations?.[0]

  // Build dropdown options for calendar associations
  const calendarOptions = useMemo(() => {
    const options = [{ id: ALL_ASSOCIATIONS, label: t('calendar.allAssociations') }]
    for (const assoc of calendarAssociations) {
      options.push({ id: assoc, label: assoc })
    }
    return options
  }, [calendarAssociations, t])

  // Build dropdown options for occupations
  const occupationOptions = useMemo(
    () =>
      (user?.occupations ?? []).map((o) => ({
        id: o.id,
        label: getOccupationLabel(o),
      })),
    [user?.occupations, getOccupationLabel]
  )

  const handleOccupationSelect = async (id: string) => {
    // Don't switch if selecting the same occupation
    if (id === activeOccupationId) {
      return
    }

    // Increment counter to track this specific switch request
    const currentSwitch = ++switchCounterRef.current

    setAssociationSwitching(true)

    try {
      const apiClient = getApiClient(dataSource)
      await apiClient.switchRoleAndAttribute(id)

      // Check if this is still the latest switch request (race condition protection)
      if (currentSwitch !== switchCounterRef.current) {
        return
      }

      // Update state AFTER the API call succeeds to prevent race conditions
      setActiveOccupation(id)

      // Reset all queries to clear cached data and force fresh fetches
      await queryClient.resetQueries()

      // Prefetch data for all tabs in production mode
      if (dataSource === 'api') {
        prefetchAllTabData(queryClient, id, getApiClient(dataSource)).catch(() => {
          // Errors are already logged in prefetchAllTabData
        })
      }
    } catch (error) {
      if (currentSwitch === switchCounterRef.current) {
        toast.error(t('common.switchAssociationFailed'))
        log.error('Failed to switch association:', error)
      }
    } finally {
      if (currentSwitch === switchCounterRef.current) {
        setAssociationSwitching(false)
      }
    }
  }

  return (
    <div className="flex flex-col flex-1 bg-surface-page dark:bg-surface-page-dark">
      {/* Header - fixed to always stay visible */}
      <header className="bg-surface-card dark:bg-surface-card-dark shadow-sm border-b border-border-default dark:border-border-default-dark fixed top-0 left-0 right-0 z-50 safe-area-inset-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center gap-2">
              <Volleyball
                className="w-6 h-6 text-primary-600 dark:text-primary-400"
                aria-hidden="true"
              />
              <h1 className="text-lg font-bold text-text-primary dark:text-text-primary-dark">
                VolleyKit
              </h1>
            </div>

            {isAuthenticated && (
              <div className="flex items-center gap-3">
                {features.offline && <PendingActionsIndicator />}

                {/* Calendar Mode Indicator */}
                {dataSource === 'calendar' && (
                  <div
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary-100 dark:bg-primary-900/40"
                    role="status"
                    aria-label={t('common.calendarModeTooltip')}
                    title={t('common.calendarModeTooltip')}
                  >
                    <Calendar
                      className="w-4 h-4 text-primary-700 dark:text-primary-300"
                      aria-hidden="true"
                    />
                    <span className="text-xs font-medium text-primary-700 dark:text-primary-300 hidden sm:inline">
                      {t('common.calendarModeBanner')}
                    </span>
                  </div>
                )}

                {/* Calendar mode: Association filter dropdown */}
                {showCalendarDropdown && (
                  <HeaderDropdown
                    selected={selectedAssociation}
                    options={calendarOptions}
                    onSelect={setSelectedAssociation}
                    ariaLabel={t('calendar.filterByAssociation')}
                  />
                )}

                {/* Normal mode: Occupation switcher dropdown */}
                {showOccupationDropdown && (
                  <HeaderDropdown
                    selected={activeOccupationId ?? activeOccupation?.id ?? ''}
                    options={occupationOptions}
                    onSelect={handleOccupationSelect}
                    disabled={isAssociationSwitching}
                    ariaLabel={t('common.selectOccupation')}
                  />
                )}

                {user && (
                  <span className="text-sm text-text-muted dark:text-text-secondary-dark hidden sm:block">
                    {user.firstName}
                  </span>
                )}
                <button
                  onClick={logout}
                  className="text-sm text-text-muted hover:text-text-secondary dark:text-text-muted-dark dark:hover:text-text-secondary-dark"
                >
                  {t('auth.logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Spacer to account for fixed header height plus safe area inset */}
      <div className="header-spacer" aria-hidden="true" />

      <OfflineIndicator />

      {/* Demo mode banner */}
      {dataSource === 'demo' && (
        <div
          className="bg-amber-100 dark:bg-amber-900/50 border-b border-amber-200 dark:border-amber-800"
          role="alert"
          aria-live="polite"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <p className="text-sm text-amber-800 dark:text-amber-200 text-center font-medium">
              {t('common.demoModeBanner')}
            </p>
          </div>
        </div>
      )}

      {/* Calendar mode banner */}
      {isCalendarMode && (
        <div
          className="bg-sky-100 dark:bg-sky-900/50 border-b border-sky-200 dark:border-sky-800"
          role="alert"
          aria-live="polite"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <p className="text-sm text-sky-800 dark:text-sky-200 text-center font-medium">
              {t('common.calendarModeBanner')}
            </p>
          </div>
        </div>
      )}

      {features.helpTours && <TourModeBanner />}

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 pb-16">
        <Outlet />
      </main>

      <BottomNavigation navItems={navItems} />

      {/* Debug panel */}
      <Suspense fallback={null}>
        <DebugPanel />
      </Suspense>
    </div>
  )
}
