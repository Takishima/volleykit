import { useState } from 'react'

import { RefreshCw } from '@/shared/components/icons'
import { useTranslation } from '@/shared/hooks/useTranslation'

interface LoginErrorWithUpdateHintProps {
  errorMessage: string
  showUpdateHint: boolean
  updateAvailable: boolean
  onUpdate: () => Promise<void>
  isUpdating: boolean
  isCheckingForUpdate: boolean
}

/**
 * Error display component for the login page with optional update hint.
 *
 * On iOS PWA, service worker update detection is unreliable. When login fails,
 * this component shows a hint to update the app, which can help users who are
 * running an outdated version that can't properly parse new API responses.
 */
export function LoginErrorWithUpdateHint({
  errorMessage,
  showUpdateHint,
  updateAvailable,
  onUpdate,
  isUpdating,
  isCheckingForUpdate,
}: LoginErrorWithUpdateHintProps) {
  const { t } = useTranslation()
  const [isButtonLoading, setIsButtonLoading] = useState(false)

  const handleUpdateClick = async () => {
    if (isButtonLoading || isUpdating) return
    setIsButtonLoading(true)
    try {
      await onUpdate()
    } finally {
      // Note: onUpdate() typically reloads, so this may not execute
      setIsButtonLoading(false)
    }
  }

  const loading = isButtonLoading || isUpdating

  return (
    <div className="rounded-lg border border-danger-200 bg-danger-50 p-3 dark:border-danger-800 dark:bg-danger-900/20">
      {/* Error message */}
      <p className="text-sm text-danger-600 dark:text-danger-400">{errorMessage}</p>

      {/* Update hint section */}
      {showUpdateHint && (
        <div className="mt-3 border-t border-danger-200 pt-3 dark:border-danger-700">
          {isCheckingForUpdate ? (
            <p className="text-xs text-danger-500 dark:text-danger-400">{t('settings.checking')}</p>
          ) : (
            <>
              <p className="text-xs text-danger-500 dark:text-danger-400">
                {updateAvailable
                  ? t('auth.loginFailedUpdateAvailable')
                  : t('auth.loginFailedTryUpdate')}
              </p>
              <button
                type="button"
                onClick={handleUpdateClick}
                disabled={loading}
                aria-busy={loading}
                className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-danger-100 px-3 py-1.5 text-xs font-medium text-danger-700 transition-colors hover:bg-danger-200 focus:outline-none focus:ring-2 focus:ring-danger-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-danger-800/50 dark:text-danger-300 dark:hover:bg-danger-800"
              >
                {loading && <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />}
                {loading ? t('auth.updating') : t('auth.updateNow')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
