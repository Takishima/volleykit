import { ChevronDown, ChevronUp } from '@/common/components/icons'
import { useTranslation } from '@/common/hooks/useTranslation'

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
        className="w-full flex items-center justify-between py-2 px-3 bg-surface-page dark:bg-surface-card-dark rounded-lg hover:bg-surface-subtle dark:hover:bg-surface-muted-dark transition-colors"
        aria-expanded={expanded}
        aria-controls={sectionId}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-text-muted dark:text-text-muted-dark" aria-hidden="true" />
          <span className="text-sm font-medium text-text-primary dark:text-text-primary-dark">{title}</span>
          <span className="text-xs text-text-muted dark:text-text-muted-dark">({count})</span>
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
