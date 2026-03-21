import { useCallback } from 'react'

import { AlertTriangle, CheckCircle } from '@/shared/components/icons'
import { useTranslation } from '@/shared/hooks/useTranslation'
import type { ChecklistSection } from '@/shared/utils/pdf-field-mappings'

const HAPTIC_FEEDBACK_MS = 10

interface SectionSelectorProps {
  sections: readonly ChecklistSection[]
  flaggedSections: Set<string>
  onToggleSection: (sectionId: string) => void
}

export function SectionSelector({
  sections,
  flaggedSections,
  onToggleSection,
}: SectionSelectorProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-1.5">
      <p className="text-sm text-text-secondary dark:text-text-secondary-dark mb-3">
        {t('pdf.wizard.nonConformant.selectSections')}
      </p>
      <div className="max-h-[min(340px,50vh)] overflow-y-auto rounded-lg border border-border-default dark:border-border-default-dark divide-y divide-border-default dark:divide-border-default-dark">
        {sections.map((section) => (
          <SectionRow
            key={section.id}
            section={section}
            isFlagged={flaggedSections.has(section.id)}
            onToggle={onToggleSection}
          />
        ))}
      </div>
    </div>
  )
}

interface SectionRowProps {
  section: ChecklistSection
  isFlagged: boolean
  onToggle: (sectionId: string) => void
}

function SectionRow({ section, isFlagged, onToggle }: SectionRowProps) {
  const { t } = useTranslation()

  const handleClick = useCallback(() => {
    navigator.vibrate?.(HAPTIC_FEEDBACK_MS)
    onToggle(section.id)
  }, [section.id, onToggle])

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-150 active:scale-[0.98] ${
        isFlagged
          ? 'bg-warning-50 dark:bg-warning-900/20'
          : 'hover:bg-surface-subtle dark:hover:bg-surface-subtle-dark'
      }`}
    >
      <span className="text-sm font-medium text-text-muted dark:text-text-muted-dark w-5 text-center flex-shrink-0">
        {section.id}
      </span>
      <span className="flex-1 text-sm text-text-primary dark:text-text-primary-dark">
        {t(section.labelKey)}
      </span>
      {isFlagged ? (
        <AlertTriangle className="w-4 h-4 text-warning-500 flex-shrink-0" aria-hidden="true" />
      ) : (
        <CheckCircle className="w-4 h-4 text-success-500 flex-shrink-0" aria-hidden="true" />
      )}
    </button>
  )
}
