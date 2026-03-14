import { useState, useCallback, memo } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { useShallow } from 'zustand/react/shallow'

import { queryKeys } from '@/api/queryKeys'
import { Button } from '@/shared/components/Button'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { useSettingsStore } from '@/shared/stores/settings'

function DataRetentionSectionComponent() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [showConfirm, setShowConfirm] = useState(false)

  const { homeLocation, transportEnabled, resetLocationSettings } = useSettingsStore(
    useShallow((state) => ({
      homeLocation: state.homeLocation,
      transportEnabled: state.transportEnabled,
      resetLocationSettings: state.resetLocationSettings,
    }))
  )

  const handleClearData = useCallback(() => {
    // Clear travel time cache from TanStack Query
    queryClient.removeQueries({ queryKey: queryKeys.travelTime.all })

    // Reset all location-related settings via Zustand store
    // This properly updates state and persists through the middleware
    resetLocationSettings()

    setShowConfirm(false)
  }, [queryClient, resetLocationSettings])

  const handleShowConfirm = useCallback(() => {
    setShowConfirm(true)
  }, [])

  const handleCancelConfirm = useCallback(() => {
    setShowConfirm(false)
  }, [])

  return (
    <div className="space-y-4">
      {/* Privacy statements */}
      <div className="space-y-2 text-sm text-text-muted dark:text-text-muted-dark">
        <p>{t('settings.privacyNoCollection')}</p>
        <p>{t('settings.privacyDirectComm')}</p>
        <p>{t('settings.privacyNoAnalytics')}</p>
      </div>

      {/* Separator */}
      <div className="border-t border-border-subtle dark:border-border-subtle-dark" />

      <p className="text-sm text-text-muted dark:text-text-muted-dark">
        {t('settings.dataRetention.description')}
      </p>

      {/* Data stored locally */}
      <div className="space-y-2">
        <ul className="space-y-2 text-sm text-text-primary dark:text-text-primary-dark">
          <li className="flex items-start gap-2">
            <svg
              className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary-600 dark:text-primary-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>{t('settings.dataRetention.homeLocation')}</span>
          </li>
          <li className="flex items-start gap-2">
            <svg
              className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary-600 dark:text-primary-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>{t('settings.dataRetention.filterPreferences')}</span>
          </li>
          <li className="flex items-start gap-2">
            <svg
              className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary-600 dark:text-primary-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>{t('settings.dataRetention.travelTimeCache')}</span>
          </li>
          <li className="flex items-start gap-2">
            <svg
              className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary-600 dark:text-primary-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>{t('settings.dataRetention.languagePreference')}</span>
          </li>
        </ul>
      </div>

      {/* External services note */}
      {transportEnabled && (
        <div className="p-3 bg-surface-subtle dark:bg-surface-subtle-dark rounded-lg">
          <h3 className="text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">
            {t('settings.dataRetention.externalServices')}
          </h3>
          <p className="text-xs text-text-muted dark:text-text-muted-dark">
            {t('settings.dataRetention.transportApiNote')}
          </p>
        </div>
      )}

      {/* Clear data button */}
      {(homeLocation || transportEnabled) && (
        <div className="pt-2 border-t border-border-subtle dark:border-border-subtle-dark">
          {!showConfirm ? (
            <Button
              variant="secondary"
              onClick={handleShowConfirm}
              fullWidth
              iconLeft={
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              }
            >
              {t('settings.dataRetention.clearData')}
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-text-primary dark:text-text-primary-dark">
                {t('settings.dataRetention.clearDataConfirm')}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleCancelConfirm} className="flex-1">
                  {t('common.cancel')}
                </Button>
                <Button variant="primary" onClick={handleClearData} className="flex-1">
                  {t('common.confirm')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export const DataRetentionSection = memo(DataRetentionSectionComponent)
