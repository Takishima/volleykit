import { AlertTriangle } from '@/shared/components/icons'
import { useTranslation } from '@/shared/hooks/useTranslation'
import type { ChecklistSection } from '@/shared/utils/pdf-form-filler'

interface CommentStepProps {
  sections: readonly ChecklistSection[]
  flaggedSections: Set<string>
  sectionComments: Record<string, string>
  onSectionCommentChange: (sectionId: string, value: string) => void
}

export function CommentStep({
  sections,
  flaggedSections,
  sectionComments,
  onSectionCommentChange,
}: CommentStepProps) {
  const { t } = useTranslation()

  const flaggedSectionList = sections.filter((s) => flaggedSections.has(s.id))

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
        {t('pdf.wizard.nonConformant.describeIssuesPerSection')}
      </p>

      {flaggedSectionList.map((section) => {
        const comment = sectionComments[section.id] ?? ''
        const isEmpty = comment.trim().length === 0

        return (
          <div
            key={section.id}
            className="rounded-lg border border-warning-200 dark:border-warning-800 overflow-hidden"
          >
            {/* Section header */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-warning-50 dark:bg-warning-900/20 border-b border-warning-200 dark:border-warning-800">
              <AlertTriangle
                className="w-3 h-3 text-warning-500 flex-shrink-0"
                aria-hidden="true"
              />
              <span className="text-xs font-medium text-warning-700 dark:text-warning-400">
                {section.id} — {t(section.labelKey)}
              </span>
            </div>

            {/* Comment textarea */}
            <div className="p-2">
              <textarea
                value={comment}
                onChange={(e) => onSectionCommentChange(section.id, e.target.value)}
                placeholder={t('pdf.wizard.nonConformant.commentPlaceholder')}
                rows={2}
                className="w-full rounded-md border border-border-default dark:border-border-default-dark bg-surface-primary dark:bg-surface-primary-dark text-text-primary dark:text-text-primary-dark text-xs px-2.5 py-1.5 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-text-muted dark:placeholder:text-text-muted-dark"
              />
              {isEmpty && (
                <p className="text-xs text-error-500 mt-1">
                  {t('pdf.wizard.nonConformant.commentRequired')}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
