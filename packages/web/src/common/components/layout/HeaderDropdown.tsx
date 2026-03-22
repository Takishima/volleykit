import { useRef, useEffect, useState } from 'react'

import { ChevronDown } from '@/common/components/icons'

interface HeaderDropdownProps<T extends string> {
  /** Currently selected value */
  selected: T
  /** Available options */
  options: { id: T; label: string }[]
  /** Called when an option is selected */
  onSelect: (id: T) => void
  /** Accessible label for the dropdown listbox panel */
  ariaLabel?: string
  /** Whether the dropdown button is disabled */
  disabled?: boolean
}

export function HeaderDropdown<T extends string>({
  selected,
  options,
  onSelect,
  ariaLabel,
  disabled = false,
}: HeaderDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdown on Escape key
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const selectedOption = options.find((o) => o.id === selected)

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-1 px-2 py-1 text-sm font-medium rounded-lg transition-colors ${
          disabled
            ? 'text-text-muted dark:text-text-muted-dark bg-surface-subtle dark:bg-surface-subtle-dark cursor-wait'
            : 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="max-w-[100px] truncate">{selectedOption?.label ?? selected}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-1 w-48 bg-surface-card dark:bg-surface-card-dark rounded-lg shadow-lg border border-border-default dark:border-border-default-dark py-1 z-50"
          role="listbox"
          aria-label={ariaLabel}
        >
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                onSelect(option.id)
                setIsOpen(false)
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                option.id === selected
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'text-text-secondary dark:text-text-secondary-dark hover:bg-surface-subtle dark:hover:bg-surface-subtle-dark'
              }`}
              role="option"
              aria-selected={option.id === selected}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
