import { useState } from 'react'

import { RefreshCw } from '@/shared/components/icons'
import { useTranslation } from '@/shared/hooks/useTranslation'

interface LoginUpdateBannerProps {
  onUpdate: () => Promise<void>
}

/**
 * Prominent update banner for the login page.
 * Shown when PWA needs a refresh to ensure users update before logging in,
 * preventing authentication errors from stale cached code.
 */
export function LoginUpdateBanner({ onUpdate }: LoginUpdateBannerProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const { t } = useTranslation()

  const handleUpdate = async () => {
    if (isUpdating) return
    setIsUpdating(true)
    try {
      await onUpdate()
    } finally {
      // Note: updateApp() typically reloads, so this may not execute
      setIsUpdating(false)
    }
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="mb-6 rounded-lg border border-warning-300 bg-warning-50 p-4 dark:border-warning-700 dark:bg-warning-900/30"
    >
      <div className="flex items-start gap-3">
        <RefreshCw
          className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning-600 dark:text-warning-400"
          aria-hidden="true"
        />
        <div className="flex-1">
          <p className="text-sm font-medium text-warning-800 dark:text-warning-200">
            {t('auth.updateRequired')}
          </p>
          <p className="mt-1 text-sm text-warning-700 dark:text-warning-300">
            {t('auth.updateRequiredDescription')}
          </p>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={handleUpdate}
          disabled={isUpdating}
          aria-busy={isUpdating}
          className="inline-flex items-center gap-2 rounded-md bg-warning-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-warning-700 focus:outline-none focus:ring-2 focus:ring-warning-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-warning-500 dark:hover:bg-warning-600"
        >
          {isUpdating && (
            <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          {isUpdating ? t('auth.updating') : t('auth.updateNow')}
        </button>
      </div>
    </div>
  )
}
