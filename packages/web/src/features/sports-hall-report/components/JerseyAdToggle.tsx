import { CheckCircle, XCircle } from '@/common/components/icons'

interface JerseyAdToggleProps {
  label: string
  checked: boolean
  onChange: () => void
  disabled: boolean
}

export function JerseyAdToggle({ label, checked, onChange, disabled }: JerseyAdToggleProps) {
  const Icon = checked ? CheckCircle : XCircle
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      title={label}
      className={`flex w-full items-center gap-2 min-w-0 rounded-lg border py-2 px-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked
          ? 'border-success-200 bg-success-50 text-success-700 hover:bg-success-100 dark:border-success-800 dark:bg-success-900/20 dark:text-success-400 dark:hover:bg-success-900/30'
          : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30'
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </button>
  )
}
