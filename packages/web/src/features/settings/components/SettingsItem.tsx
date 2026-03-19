import type { ReactNode } from 'react'

interface SettingsItemProps {
  label: string
  description?: string
  status?: string
  statusVariant?: 'default' | 'warning' | 'success'
  children: ReactNode
  'data-tour'?: string
}

const statusColors = {
  default: 'text-text-muted dark:text-text-muted-dark',
  warning: 'text-warning-600 dark:text-warning-400',
  success: 'text-success-600 dark:text-success-400',
} as const

export function SettingsItem({
  label,
  description,
  status,
  statusVariant = 'default',
  children,
  'data-tour': dataTour,
}: SettingsItemProps) {
  return (
    <div data-tour={dataTour}>
      <div className="flex items-center justify-between py-2">
        <div className="flex-1 pr-3">
          <div className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
            {label}
          </div>
          {description && (
            <div className="text-xs text-text-muted dark:text-text-muted-dark mt-0.5">
              {description}
            </div>
          )}
        </div>
        {children}
      </div>
      {status && <div className={`text-xs mt-1 ${statusColors[statusVariant]}`}>{status}</div>}
    </div>
  )
}
