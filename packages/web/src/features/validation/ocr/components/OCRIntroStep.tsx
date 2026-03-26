import { Camera, SkipForward, FileText, PenTool } from '@/common/components/icons'
import { useTranslation } from '@/common/hooks/useTranslation'
import type { ScoresheetType } from '@/features/ocr/utils/scoresheet-detector'

interface OCRIntroStepProps {
  onStartScan: (type: ScoresheetType) => void
  onSkip: () => void
}

/**
 * Intro step for the OCR entry modal - scoresheet type selection.
 */
export function OCRIntroStep({ onStartScan, onSkip }: OCRIntroStepProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <Camera
        className="w-16 h-16 text-primary-400 dark:text-primary-500 mb-4"
        aria-hidden="true"
      />
      <h2 className="text-xl font-semibold text-text-primary dark:text-text-primary-dark mb-2">
        {t('validation.ocr.scanScoresheet')}
      </h2>
      <p className="text-center text-text-muted dark:text-text-secondary-dark max-w-md mb-6">
        {t('validation.ocr.scoresheetType.title')}
      </p>

      {/* Scoresheet type selection buttons */}
      <div className="flex flex-col gap-3 w-full max-w-sm mb-6">
        <button
          type="button"
          onClick={() => onStartScan('electronic')}
          className="w-full flex items-start gap-4 p-4 bg-surface-card dark:bg-surface-card-dark border-2 border-primary-500 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors text-left"
        >
          <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
            <FileText
              className="w-6 h-6 text-primary-600 dark:text-primary-400"
              aria-hidden="true"
            />
          </div>
          <div className="flex-1 min-w-0">
            <span className="block text-base font-semibold text-text-primary dark:text-text-primary-dark">
              {t('validation.ocr.scoresheetType.electronic')}
            </span>
            <span className="block text-sm text-text-muted dark:text-text-muted-dark mt-0.5">
              {t('validation.ocr.scoresheetType.electronicDescription')}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onStartScan('manuscript')}
          className="w-full flex items-start gap-4 p-4 bg-surface-card dark:bg-surface-card-dark border-2 border-border-default dark:border-border-strong-dark rounded-xl hover:border-primary-300 dark:hover:border-primary-700 hover:bg-surface-page dark:hover:bg-surface-muted-dark transition-colors text-left"
        >
          <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg bg-surface-subtle dark:bg-surface-subtle-dark">
            <PenTool
              className="w-6 h-6 text-text-muted dark:text-text-muted-dark"
              aria-hidden="true"
            />
          </div>
          <div className="flex-1 min-w-0">
            <span className="block text-base font-semibold text-text-primary dark:text-text-primary-dark">
              {t('validation.ocr.scoresheetType.manuscript')}
            </span>
            <span className="block text-sm text-text-muted dark:text-text-muted-dark mt-0.5">
              {t('validation.ocr.scoresheetType.manuscriptDescription')}
            </span>
          </div>
        </button>
      </div>

      {/* Skip button */}
      <button
        type="button"
        onClick={onSkip}
        className="flex items-center justify-center gap-2 px-6 py-3 text-text-muted dark:text-text-muted-dark hover:bg-surface-subtle dark:hover:bg-surface-card-dark rounded-lg transition-colors"
      >
        <SkipForward className="w-4 h-4" aria-hidden="true" />
        {t('tour.actions.skip')}
      </button>
    </div>
  )
}
