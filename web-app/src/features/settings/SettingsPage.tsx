import { useShallow } from 'zustand/react/shallow'

import { Button } from '@/shared/components/Button'
import { SlidersHorizontal, MapPin, Info, Lock } from '@/shared/components/icons'
import { features } from '@/shared/config/features'
import { useTour } from '@/shared/hooks/useTour'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { useAuthStore } from '@/shared/stores/auth'
import { useDemoStore } from '@/shared/stores/demo'
import { useSettingsStore } from '@/shared/stores/settings'

import {
  ProfileSection,
  PreferencesSection,
  HomeLocationSection,
  SafeModeSection,
  HelpToursSection,
  DataRetentionSection,
  DemoSection,
  AppInfoSection,
} from './components'
import { SettingsGroup } from './components/SettingsGroup'
import { TravelSettingsSection } from './components/TravelSettingsSection'

export function SettingsPage() {
  const { user, logout, dataSource, isCalendarMode } = useAuthStore(
    useShallow((state) => ({
      user: state.user,
      logout: state.logout,
      dataSource: state.dataSource,
      isCalendarMode: state.isCalendarMode(),
    }))
  )
  const isDemoMode = dataSource === 'demo'
  const { activeAssociationCode, refreshData } = useDemoStore(
    useShallow((state) => ({
      activeAssociationCode: state.activeAssociationCode,
      refreshData: state.refreshData,
    }))
  )
  const { isSafeModeEnabled, setSafeMode, preventZoom, setPreventZoom } = useSettingsStore(
    useShallow((state) => ({
      isSafeModeEnabled: state.isSafeModeEnabled,
      setSafeMode: state.setSafeMode,
      preventZoom: state.preventZoom,
      setPreventZoom: state.setPreventZoom,
    }))
  )
  const { t } = useTranslation()

  // Initialize tour for this page (triggers auto-start on first visit)
  useTour('settings')

  const showSafeMode = !isDemoMode && !isCalendarMode

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">
        {t('settings.title')}
      </h1>

      {user && <ProfileSection user={user} />}

      <SettingsGroup
        groupKey="preferences"
        icon={
          <SlidersHorizontal
            className="w-5 h-5 text-text-muted dark:text-text-muted-dark"
            aria-hidden="true"
          />
        }
        title={t('settings.preferences.title')}
        badge={
          showSafeMode && !isSafeModeEnabled ? (
            <svg
              className="w-5 h-5 text-warning-600 dark:text-warning-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          ) : undefined
        }
      >
        <PreferencesSection preventZoom={preventZoom} onSetPreventZoom={setPreventZoom} />

        {showSafeMode && (
          <>
            <div className="border-t border-border-subtle dark:border-border-subtle-dark" />
            <SafeModeSection isSafeModeEnabled={isSafeModeEnabled} onSetSafeMode={setSafeMode} />
          </>
        )}
      </SettingsGroup>

      {(features.homeLocation || features.transport) && (
        <SettingsGroup
          groupKey="locationTravel"
          icon={
            <MapPin
              className="w-5 h-5 text-text-muted dark:text-text-muted-dark"
              aria-hidden="true"
            />
          }
          title={t('settings.locationTravel.title')}
        >
          {features.homeLocation && <HomeLocationSection />}

          {features.homeLocation && features.transport && (
            <div className="border-t border-border-subtle dark:border-border-subtle-dark" />
          )}

          {features.transport && <TravelSettingsSection />}
        </SettingsGroup>
      )}

      <SettingsGroup
        groupKey="appUpdates"
        icon={
          <Info className="w-5 h-5 text-text-muted dark:text-text-muted-dark" aria-hidden="true" />
        }
        title={t('settings.about')}
      >
        <AppInfoSection showUpdates={__PWA_ENABLED__} />
      </SettingsGroup>

      {features.helpTours && (
        <SettingsGroup
          groupKey="helpTours"
          icon={
            <Info
              className="w-5 h-5 text-text-muted dark:text-text-muted-dark"
              aria-hidden="true"
            />
          }
          title={t('settings.helpTours.title')}
          defaultExpanded={false}
          data-tour="tour-reset"
        >
          <HelpToursSection isDemoMode={isDemoMode} />
        </SettingsGroup>
      )}

      <SettingsGroup
        groupKey="dataPrivacy"
        icon={
          <Lock className="w-5 h-5 text-text-muted dark:text-text-muted-dark" aria-hidden="true" />
        }
        title={t('settings.dataRetention.title')}
        defaultExpanded={false}
      >
        <DataRetentionSection />

        {isDemoMode && (
          <>
            <div className="border-t border-border-subtle dark:border-border-subtle-dark" />
            <DemoSection
              activeAssociationCode={activeAssociationCode}
              onRefreshData={refreshData}
            />
          </>
        )}
      </SettingsGroup>

      {/* Logout */}
      <div className="pt-4 border-t border-border-default dark:border-border-default-dark">
        <Button variant="secondary" onClick={logout} className="w-full sm:w-auto">
          {t('auth.logout')}
        </Button>
      </div>
    </div>
  )
}
