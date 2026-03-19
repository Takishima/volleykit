import type { ReactNode } from 'react'

interface FilterChipProps {
  /** Whether the filter is currently active */
  active: boolean
  /** Called when the chip is clicked */
  onToggle: () => void
  /** Icon to display (shown when inactive, or always if showIconWhenActive) */
  icon?: ReactNode
  /** Short label when inactive (e.g., "Distance") */
  label: string
  /** Value to show when active (e.g., "≤50 km") */
  activeValue?: string
  /** Show icon even when active (before the value) */
  showIconWhenActive?: boolean
  /** Optional data-tour attribute for guided tours */
  dataTour?: string
}

export function FilterChip({
  active,
  onToggle,
  icon,
  label,
  activeValue,
  showIconWhenActive = false,
  dataTour,
}: FilterChipProps) {
  const displayValue = active && activeValue ? activeValue : label
  const showIcon = icon && (!active || showIconWhenActive)

  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={label}
      onClick={onToggle}
      data-tour={dataTour}
      className={`
        inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
        transition-colors cursor-pointer select-none
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1
        ${
          active
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
        }
      `}
    >
      {showIcon && <span className="w-3.5 h-3.5 flex-shrink-0">{icon}</span>}
      <span>{displayValue}</span>
    </button>
  )
}
