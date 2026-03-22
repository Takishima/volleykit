import { useCallback, memo } from 'react'

import { useShallow } from 'zustand/react/shallow'

import { Button } from '@/common/components/Button'
import { ToggleSwitch } from '@/common/components/ToggleSwitch'
import { features } from '@/common/config/features'
import { usePwaStandalone } from '@/common/hooks/usePwaStandalone'
import { useTranslation } from '@/common/hooks/useTranslation'
import { useSettingsStore } from '@/common/stores/settings'
import { usePWA } from '@/contexts/PWAContext'

import { SettingsItem } from './SettingsItem'

// Build OCR POC URL relative to the app's base path (features.ocrPoc)
const OCR_POC_URL = features.ocrPoc ? `${import.meta.env.BASE_URL}ocr-poc/` : ''

interface AppInfoSectionProps {
  showUpdates: boolean
}

function AppInfoSectionComponent({ showUpdates }: AppInfoSectionProps) {
  const { t, locale } = useTranslation()
  const { needRefresh, isChecking, lastChecked, checkError, checkForUpdate, updateApp } = usePWA()
  const { isOCREnabled, setOCREnabled } = useSettingsStore(
    useShallow((s) => ({
      isOCREnabled: s.isOCREnabled,
      setOCREnabled: s.setOCREnabled,
    }))
  )
  const isStandalone = usePwaStandalone()

  const platform = isStandalone ? 'PWA' : 'Web'

  const handleToggleOCR = useCallback(() => {
    setOCREnabled(!isOCREnabled)
  }, [isOCREnabled, setOCREnabled])

  const formatLastChecked = useCallback(
    (date: Date) => {
      const now = new Date()
      const isToday = date.toDateString() === now.toDateString()

      if (isToday) {
        return date.toLocaleTimeString(locale, {
          hour: '2-digit',
          minute: '2-digit',
        })
      }

      return date.toLocaleString(locale, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    },
    [locale]
  )

  return (
    <>
      {/* Version info */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-text-muted dark:text-text-muted-dark">{t('settings.version')}</span>
          <span className="text-text-primary dark:text-text-primary-dark">
            {__APP_VERSION__}{' '}
            <span className="text-text-muted dark:text-text-muted-dark font-mono text-xs">
              ({__GIT_HASH__})
            </span>
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted dark:text-text-muted-dark">
            {t('settings.platform')}
          </span>
          <span className="text-text-primary dark:text-text-primary-dark">{platform}</span>
        </div>
      </div>

      {/* Updates section - only shown when PWA is enabled */}
      {showUpdates && (
        <>
          <div className="border-t border-border-subtle dark:border-border-subtle-dark" />
          <div className="space-y-4">
            <div className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
              {t('settings.updates')}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div
                  className="text-sm font-medium text-text-primary dark:text-text-primary-dark"
                  aria-live="polite"
                >
                  {needRefresh ? t('settings.updateAvailable') : t('settings.upToDate')}
                </div>
                {lastChecked && (
                  <div className="text-xs text-text-muted dark:text-text-muted-dark mt-1">
                    {t('settings.lastChecked')}: {formatLastChecked(lastChecked)}
                  </div>
                )}
                {checkError && (
                  <div className="text-xs text-danger-600 dark:text-danger-400 mt-1" role="alert">
                    {t('settings.updateCheckFailed')}
                  </div>
                )}
              </div>
              {needRefresh ? (
                <Button variant="primary" onClick={updateApp} aria-label={t('settings.updateNow')}>
                  {t('settings.updateNow')}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={checkForUpdate}
                  loading={isChecking}
                  aria-label={t('settings.checkForUpdates')}
                >
                  {isChecking ? t('settings.checking') : t('settings.checkForUpdates')}
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Experimental features */}
      <div className="border-t border-border-subtle dark:border-border-subtle-dark" />
      <div className="space-y-4">
        <div className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
          {t('settings.experimental.title')}
        </div>
        <p className="text-sm text-text-muted dark:text-text-muted-dark">
          {t('settings.experimental.description')}
        </p>

        {/* OCR POC standalone app link (features.ocrPoc) */}
        {features.ocrPoc && (
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium text-text-primary dark:text-text-primary-dark text-sm">
                {t('settings.experimental.ocrPoc')}
              </p>
              <p className="text-xs text-text-muted dark:text-text-muted-dark">
                {t('settings.experimental.ocrPocDescription')}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => window.open(OCR_POC_URL, '_blank', 'noopener,noreferrer')}
              aria-label={t('settings.experimental.openOcrPoc')}
            >
              {t('settings.experimental.openOcrPoc')}
            </Button>
          </div>
        )}

        {/* OCR Validation Toggle (features.ocr) */}
        {features.ocr && (
          <SettingsItem
            label={t('settings.experimental.ocrValidation')}
            description={t('settings.experimental.ocrValidationDescription')}
            status={
              isOCREnabled
                ? t('settings.experimental.ocrValidationEnabled')
                : t('settings.experimental.ocrValidationDisabled')
            }
          >
            <ToggleSwitch
              checked={isOCREnabled}
              onChange={handleToggleOCR}
              label={t('settings.experimental.ocrValidation')}
            />
          </SettingsItem>
        )}
      </div>

      {/* Official website and disclaimer */}
      <div className="border-t border-border-subtle dark:border-border-subtle-dark pt-3">
        <a
          href="https://volleymanager.volleyball.ch"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 dark:text-primary-400 hover:underline text-sm"
        >
          {t('settings.openWebsite')} →
        </a>
      </div>
      <div className="border-t border-border-subtle dark:border-border-subtle-dark pt-3 space-y-2">
        <p className="text-sm text-text-muted dark:text-text-muted-dark">
          {t('settings.dataSource')}
        </p>
        <p className="text-xs text-text-subtle dark:text-text-subtle-dark">
          {t('settings.disclaimer')}
        </p>
      </div>
    </>
  )
}

export const AppInfoSection = memo(AppInfoSectionComponent)
