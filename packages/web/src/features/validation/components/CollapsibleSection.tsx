import { ChevronDown, ChevronUp } from '@/shared/components/icons'
import { useTranslation } from '@/shared/hooks/useTranslation'

interface CollapsibleSectionProps {
  title: string
  count: number
  discrepancies: number
  expanded: boolean
  onToggle: () => void
  sectionId: string
  children: React.ReactNode
}

/**
 * Collapsible section with expand/collapse toggle, count, and discrepancy badge.
 */
export function CollapsibleSection({
  title,
  count,
  discrepancies,
  expanded,
  onToggle,
  sectionId,
  children,
}: CollapsibleSectionProps) {
  const { tInterpolate } = useTranslation()
  const Icon = expanded ? ChevronUp : ChevronDown

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-expanded={expanded}
        aria-controls={sectionId}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">{title}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">({count})</span>
        </div>
        {discrepancies > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400">
            {tInterpolate('validation.ocr.discrepancies', { count: discrepancies })}
          </span>
        )}
      </button>
      {expanded && (
        <div id={sectionId} className="mt-2 pl-6">
          {children}
        </div>
      )}
    </div>
  )
}
