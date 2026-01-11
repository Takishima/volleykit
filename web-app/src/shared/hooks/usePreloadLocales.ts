import { useEffect } from 'react'

import { preloadTranslations } from '@/i18n'
import { preloadDateLocales } from '@/shared/hooks/useDateFormat'
import { createLogger } from '@/shared/utils/logger'

const log = createLogger('usePreloadLocales')

const PRELOAD_IDLE_TIMEOUT_MS = 1000

/**
 * Preloads all translation and date locales when the browser is idle.
 * This makes subsequent language switches instant while not blocking initial render.
 * Uses requestIdleCallback to defer preloading until the browser has spare time.
 */
export function usePreloadLocales(): void {
  useEffect(() => {
    const handlePreload = () => {
      Promise.all([preloadTranslations(), preloadDateLocales()]).catch((error) => {
        log.error('Failed to preload locales:', error)
      })
    }

    if ('requestIdleCallback' in window) {
      const idleCallbackId = requestIdleCallback(handlePreload, {
        timeout: PRELOAD_IDLE_TIMEOUT_MS,
      })
      return () => cancelIdleCallback(idleCallbackId)
    }

    const timeoutId = setTimeout(handlePreload, PRELOAD_IDLE_TIMEOUT_MS)
    return () => clearTimeout(timeoutId)
  }, [])
}
