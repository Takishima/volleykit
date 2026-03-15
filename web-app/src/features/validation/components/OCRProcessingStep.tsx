import type { OCRProgress } from '@/features/ocr'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { useTranslation } from '@/shared/hooks/useTranslation'

interface OCRProcessingStepProps {
  progress: OCRProgress | null
}

/**
 * Processing step for the OCR entry modal - shows loading spinner and progress.
 */
export function OCRProcessingStep({ progress }: OCRProcessingStepProps) {
  const { t } = useTranslation()

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[50vh]"
      role="status"
      aria-live="polite"
    >
      <LoadingSpinner size="lg" className="mb-6" />
      <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {t('validation.ocr.processing')}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {progress?.status ?? t('validation.ocr.processingDescription')}
      </p>
      {progress && progress.progress > 0 && (
        <div className="w-64 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-6 overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all duration-300"
            style={{ width: `${progress.progress}%` }}
          />
        </div>
      )}
    </div>
  )
}
