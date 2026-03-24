import { useState } from 'react'

import { useTranslation } from '@/common/hooks/useTranslation'
import { usePWA } from '@/contexts/PWAContext'

export default function ReloadPromptPWA() {
  const { offlineReady, needRefresh, updateApp, dismissPrompt } = usePWA()
  const [isUpdating, setIsUpdating] = useState(false)
  const { t } = useTranslation()

  if (!offlineReady && !needRefresh) {
    return null
  }

  const handleReload = async () => {
    if (isUpdating) return
    setIsUpdating(true)
    try {
      await updateApp()
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg bg-surface-card dark:bg-surface-card-dark p-4 shadow-lg ring-1 ring-black/5"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
            {offlineReady ? t('pwa.offlineReady') : t('pwa.newVersionAvailable')}
          </p>
          <p className="mt-1 text-sm text-text-muted dark:text-text-muted-dark">
            {offlineReady ? t('pwa.offlineReadyDescription') : t('pwa.newVersionDescription')}
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {needRefresh && (
          <button
            onClick={handleReload}
            disabled={isUpdating}
            aria-busy={isUpdating}
            className="rounded-md bg-primary-500 px-3 py-2 text-sm font-medium text-primary-950 hover:bg-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('pwa.reloadAriaLabel')}
          >
            {isUpdating ? t('pwa.reloading') : t('pwa.reload')}
          </button>
        )}
        <button
          onClick={dismissPrompt}
          className="rounded-md bg-surface-subtle dark:bg-surface-subtle-dark px-3 py-2 text-sm font-medium text-text-secondary dark:text-text-secondary-dark hover:bg-surface-muted dark:hover:bg-surface-muted-dark focus:ring-2 focus:ring-border-strong focus:ring-offset-2 focus:outline-none"
          aria-label={needRefresh ? t('pwa.dismissAriaLabel') : t('pwa.closeAriaLabel')}
        >
          {needRefresh ? t('pwa.dismiss') : t('common.close')}
        </button>
      </div>
    </div>
  )
}
