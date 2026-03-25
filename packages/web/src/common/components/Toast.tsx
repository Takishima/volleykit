import { useEffect, useRef } from 'react'

import { useTranslation } from '@/common/hooks/useTranslation'
import { useToastStore, DEFAULT_DURATION_MS, type Toast as ToastType } from '@/common/stores/toast'

const TOAST_CONTAINER_Z_INDEX = 'z-[100]'

const TOAST_STYLES: Record<
  ToastType['type'],
  { bg: string; border: string; text: string; icon: string }
> = {
  success: {
    bg: 'bg-success-50 dark:bg-success-900/30',
    border: 'border-success-200 dark:border-success-800',
    text: 'text-success-800 dark:text-success-200',
    icon: 'text-success-500 dark:text-success-400',
  },
  error: {
    bg: 'bg-danger-50 dark:bg-danger-900/30',
    border: 'border-danger-200 dark:border-danger-800',
    text: 'text-danger-800 dark:text-danger-200',
    icon: 'text-danger-500 dark:text-danger-400',
  },
  warning: {
    bg: 'bg-warning-50 dark:bg-warning-900/30',
    border: 'border-warning-200 dark:border-warning-800',
    text: 'text-warning-800 dark:text-warning-200',
    icon: 'text-warning-500 dark:text-warning-400',
  },
  info: {
    bg: 'bg-primary-50 dark:bg-primary-900/30',
    border: 'border-primary-200 dark:border-primary-800',
    text: 'text-primary-800 dark:text-primary-200',
    icon: 'text-primary-500 dark:text-primary-400',
  },
}

const TOAST_ICONS: Record<ToastType['type'], string> = {
  success: 'M5 13l4 4L19 7',
  error: 'M6 18L18 6M6 6l12 12',
  warning:
    'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
}

interface ToastItemProps {
  toast: ToastType
}

function ToastItem({ toast }: ToastItemProps) {
  const { t } = useTranslation()
  const removeToast = useToastStore((state) => state.removeToast)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const duration = toast.duration ?? DEFAULT_DURATION_MS
    timerRef.current = setTimeout(() => {
      removeToast(toast.id)
    }, duration)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [toast.id, toast.duration, removeToast])

  const styles = TOAST_STYLES[toast.type]
  const iconPath = TOAST_ICONS[toast.type]

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg ${styles.bg} ${styles.border} animate-in slide-in-from-top-2 fade-in duration-200`}
    >
      <svg
        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.icon}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
      </svg>
      <p className={`flex-1 text-sm font-medium ${styles.text}`}>{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className={`flex-shrink-0 p-1 -m-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${styles.text}`}
        aria-label={t('common.dismissNotification')}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export function ToastContainer() {
  const { t } = useTranslation()
  const toasts = useToastStore((state) => state.toasts)

  if (toasts.length === 0) {
    return null
  }

  return (
    <div
      className={`fixed top-4 right-4 ${TOAST_CONTAINER_Z_INDEX} flex flex-col gap-2 max-w-sm w-full pointer-events-none`}
      aria-label={t('common.notifications')}
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  )
}
