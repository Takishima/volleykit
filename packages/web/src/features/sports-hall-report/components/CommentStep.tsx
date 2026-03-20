import { AlertTriangle } from '@/shared/components/icons'
import { useTranslation } from '@/shared/hooks/useTranslation'
import type { ChecklistSection } from '@/shared/utils/pdf-form-filler'

interface CommentStepProps {
  sections: readonly ChecklistSection[]
  flaggedSections: Set<string>
  comment: string
  onCommentChange: (value: string) => void
}

export function CommentStep({
  sections,
  flaggedSections,
  comment,
  onCommentChange,
}: CommentStepProps) {
  const { t } = useTranslation()

  const flaggedSectionList = sections.filter((s) => flaggedSections.has(s.id))

  return (
    <div className="space-y-4">
      {/* Summary of flagged sections */}
      <div>
        <p className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-2">
          {t('pdf.wizard.nonConformant.issuesFoundIn')}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {flaggedSectionList.map((section) => (
            <span
              key={section.id}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-400 text-xs font-medium"
            >
              <AlertTriangle className="w-3 h-3" aria-hidden="true" />
              {section.id} — {t(section.labelKey)}
            </span>
          ))}
        </div>
      </div>

      {/* Comment textarea */}
      <div>
        <label
          htmlFor="nc-comment"
          className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1.5"
        >
          {t('pdf.wizard.nonConformant.describeIssues')} *
        </label>
        <textarea
          id="nc-comment"
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder={t('pdf.wizard.nonConformant.commentPlaceholder')}
          rows={5}
          className="w-full rounded-lg border border-border-default dark:border-border-default-dark bg-surface-primary dark:bg-surface-primary-dark text-text-primary dark:text-text-primary-dark text-sm px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-text-muted dark:placeholder:text-text-muted-dark"
        />
        {comment.trim().length === 0 && (
          <p className="text-xs text-error-500 mt-1">
            {t('pdf.wizard.nonConformant.commentRequired')}
          </p>
        )}
      </div>
    </div>
  )
}
