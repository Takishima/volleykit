import type { ReactNode } from 'react'

import { ArrowDown } from 'lucide-react'

import { useTranslation } from '@/shared/hooks/useTranslation'

import { Loader2 } from './icons'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import { usePwaStandalone } from '../hooks/usePwaStandalone'

interface PullToRefreshProps {
  /** Callback to execute when refresh is triggered */
  onRefresh: () => Promise<void>
  /** Content to wrap */
  children: ReactNode
}

/**
 * Pull-to-refresh wrapper component for PWA on iOS.
 * Only active when running as installed PWA (standalone mode).
 * In browser mode, renders children without pull-to-refresh functionality.
 *
 * @example
 * ```tsx
 * <PullToRefresh onRefresh={async () => { await refetch() }}>
 *   <div>Your scrollable content</div>
 * </PullToRefresh>
 * ```
 */
export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const { t } = useTranslation()
  const isStandalone = usePwaStandalone()

  const { pullDistance, isRefreshing, threshold, containerProps } = usePullToRefresh({
    onRefresh,
    enabled: isStandalone,
  })

  // In browser mode, just render children without pull-to-refresh
  if (!isStandalone) {
    return <>{children}</>
  }

  const isPastThreshold = pullDistance >= threshold

  return (
    <div
      {...containerProps}
      className="relative"
      style={{
        // Prevent overscroll bounce on iOS that interferes with pull gesture
        overscrollBehavior: 'none',
      }}
    >
      {/* Pull indicator - positioned above content */}
      <div
        className="absolute left-0 right-0 flex flex-col items-center justify-end overflow-hidden pointer-events-none"
        style={{
          height: Math.max(0, pullDistance),
          top: 0,
          transform: `translateY(-${Math.max(0, pullDistance)}px)`,
        }}
        aria-hidden="true"
      >
        <div className="flex flex-col items-center gap-1 pb-2">
          {isRefreshing ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary-500 dark:text-primary-400" />
          ) : (
            <ArrowDown
              className={`w-5 h-5 text-text-muted dark:text-text-muted-dark transition-transform duration-200 ${
                isPastThreshold ? 'rotate-180' : ''
              }`}
            />
          )}
          <span className="text-xs text-text-muted dark:text-text-muted-dark">
            {isRefreshing
              ? t('common.refreshing')
              : isPastThreshold
                ? t('common.releaseToRefresh')
                : t('common.pullToRefresh')}
          </span>
        </div>
      </div>

      {/* Content with transform when pulling */}
      <div
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: pullDistance === 0 ? 'transform 0.2s ease-out' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  )
}
