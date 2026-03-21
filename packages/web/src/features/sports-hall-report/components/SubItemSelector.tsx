import { useCallback } from 'react'

import { AlertTriangle, CheckCircle } from '@/shared/components/icons'
import { useTranslation } from '@/shared/hooks/useTranslation'
import type { ChecklistSection } from '@/shared/utils/pdf-field-mappings'
import type { NonConformantSelections } from '@/shared/utils/pdf-form-filler'

interface SubItemSelectorProps {
  sections: readonly ChecklistSection[]
  flaggedSections: Set<string>
  nonConformantSubItems: NonConformantSelections
  onToggleSubItem: (sectionId: string, subItemId: string) => void
}

export function SubItemSelector({
  sections,
  flaggedSections,
  nonConformantSubItems,
  onToggleSubItem,
}: SubItemSelectorProps) {
  const { t } = useTranslation()

  // Only show sections with multiple sub-items; single-item sections are auto-selected
  const flaggedSectionList = sections.filter(
    (s) => flaggedSections.has(s.id) && s.subItems.length > 1
  )

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
        {t('pdf.wizard.nonConformant.selectSubItems')}
      </p>
      {flaggedSectionList.map((section) => (
        <SectionSubItems
          key={section.id}
          section={section}
          flaggedSubItems={nonConformantSubItems[section.id] ?? new Set()}
          onToggle={onToggleSubItem}
        />
      ))}
    </div>
  )
}

interface SectionSubItemsProps {
  section: ChecklistSection
  flaggedSubItems: Set<string>
  onToggle: (sectionId: string, subItemId: string) => void
}

function SectionSubItems({ section, flaggedSubItems, onToggle }: SectionSubItemsProps) {
  const { t } = useTranslation()

  const handleToggle = useCallback(
    (subItemId: string) => {
      onToggle(section.id, subItemId)
    },
    [section.id, onToggle]
  )

  if (section.subItems.length === 0) return null

  return (
    <div className="rounded-lg border border-warning-200 dark:border-warning-800 overflow-hidden">
      <div className="px-3 py-2 bg-warning-50 dark:bg-warning-900/20 border-b border-warning-200 dark:border-warning-800">
        <span className="text-sm font-medium text-warning-700 dark:text-warning-400">
          {section.id} — {t(section.labelKey)}
        </span>
      </div>
      <div className="divide-y divide-border-default dark:divide-border-default-dark">
        {section.subItems.map((subItem) => {
          const isFlagged = flaggedSubItems.has(subItem.id)
          return (
            <button
              key={subItem.id}
              type="button"
              onClick={() => handleToggle(subItem.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                isFlagged
                  ? 'bg-error-50 dark:bg-error-900/20'
                  : 'hover:bg-surface-subtle dark:hover:bg-surface-subtle-dark'
              }`}
            >
              <span className="flex-1 text-sm text-text-primary dark:text-text-primary-dark">
                {t(subItem.labelKey)}
              </span>
              {isFlagged ? (
                <AlertTriangle
                  className="w-4 h-4 text-error-500 flex-shrink-0"
                  aria-hidden="true"
                />
              ) : (
                <CheckCircle
                  className="w-4 h-4 text-success-500 flex-shrink-0"
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
