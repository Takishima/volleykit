import type { ScoresheetType } from '@/features/ocr/utils/scoresheet-detector'
import { Camera, SkipForward, FileText, PenTool } from '@/shared/components/icons'
import { useTranslation } from '@/shared/hooks/useTranslation'

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
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {t('validation.ocr.scanScoresheet')}
      </h2>
      <p className="text-center text-gray-600 dark:text-gray-300 max-w-md mb-6">
        {t('validation.ocr.scoresheetType.title')}
      </p>

      {/* Scoresheet type selection buttons */}
      <div className="flex flex-col gap-3 w-full max-w-sm mb-6">
        <button
          type="button"
          onClick={() => onStartScan('electronic')}
          className="w-full flex items-start gap-4 p-4 bg-white dark:bg-gray-800 border-2 border-primary-500 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors text-left"
        >
          <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
            <FileText
              className="w-6 h-6 text-primary-600 dark:text-primary-400"
              aria-hidden="true"
            />
          </div>
          <div className="flex-1 min-w-0">
            <span className="block text-base font-semibold text-gray-900 dark:text-white">
              {t('validation.ocr.scoresheetType.electronic')}
            </span>
            <span className="block text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {t('validation.ocr.scoresheetType.electronicDescription')}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onStartScan('manuscript')}
          className="w-full flex items-start gap-4 p-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:border-primary-300 dark:hover:border-primary-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
        >
          <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
            <PenTool className="w-6 h-6 text-gray-600 dark:text-gray-400" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="block text-base font-semibold text-gray-900 dark:text-white">
              {t('validation.ocr.scoresheetType.manuscript')}
            </span>
            <span className="block text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {t('validation.ocr.scoresheetType.manuscriptDescription')}
            </span>
          </div>
        </button>
      </div>

      {/* Skip button */}
      <button
        type="button"
        onClick={onSkip}
        className="flex items-center justify-center gap-2 px-6 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <SkipForward className="w-4 h-4" aria-hidden="true" />
        {t('tour.actions.skip')}
      </button>
    </div>
  )
}
