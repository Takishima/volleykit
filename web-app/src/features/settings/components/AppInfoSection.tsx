import { useCallback, memo } from 'react'

import { usePWA } from '@/contexts/PWAContext'
import { Button } from '@/shared/components/Button'
import { Card, CardContent, CardHeader } from '@/shared/components/Card'
import { ToggleSwitch } from '@/shared/components/ToggleSwitch'
import { usePwaStandalone } from '@/shared/hooks/usePwaStandalone'
import { useTranslation } from '@/shared/hooks/useTranslation'
import { useSettingsStore } from '@/shared/stores/settings'

// Build OCR POC URL relative to the app's base path
const OCR_POC_URL = `${import.meta.env.BASE_URL}ocr-poc/`

interface AppInfoSectionProps {
  showUpdates: boolean
}

function AppInfoSectionComponent({ showUpdates }: AppInfoSectionProps) {
  const { t, locale } = useTranslation()
  const { needRefresh, isChecking, lastChecked, checkError, checkForUpdate, updateApp } = usePWA()
  const { isOCREnabled, setOCREnabled } = useSettingsStore()
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
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
          {t('settings.about')}
        </h2>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Version info */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted dark:text-text-muted-dark">
              {t('settings.version')}
            </span>
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
                  <Button
                    variant="primary"
                    onClick={updateApp}
                    aria-label={t('settings.updateNow')}
                  >
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

          {/* OCR Validation Toggle */}
          <div className="flex items-center justify-between py-2">
            <div className="flex-1">
              <div className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                {t('settings.experimental.ocrValidation')}
              </div>
              <div className="text-xs text-text-muted dark:text-text-muted-dark mt-1">
                {t('settings.experimental.ocrValidationDescription')}
              </div>
            </div>
            <ToggleSwitch
              checked={isOCREnabled}
              onChange={handleToggleOCR}
              label={t('settings.experimental.ocrValidation')}
            />
          </div>
          <div className="text-xs text-text-muted dark:text-text-muted-dark">
            {isOCREnabled
              ? t('settings.experimental.ocrValidationEnabled')
              : t('settings.experimental.ocrValidationDisabled')}
          </div>
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
      </CardContent>
    </Card>
  )
}

export const AppInfoSection = memo(AppInfoSectionComponent)
