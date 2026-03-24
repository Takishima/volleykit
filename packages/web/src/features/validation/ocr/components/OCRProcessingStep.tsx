import { LoadingSpinner } from '@/common/components/LoadingSpinner'
import { useTranslation } from '@/common/hooks/useTranslation'
import type { OCRProgress } from '@/features/ocr'

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
      <p className="text-lg font-medium text-text-primary dark:text-text-primary-dark mb-2">
        {t('validation.ocr.processing')}
      </p>
      <p className="text-sm text-text-muted dark:text-text-muted-dark">
        {progress?.status ?? t('validation.ocr.processingDescription')}
      </p>
      {progress && progress.progress > 0 && (
        <div className="w-64 h-2 bg-surface-muted dark:bg-surface-subtle-dark rounded-full mt-6 overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all duration-300"
            style={{ width: `${progress.progress}%` }}
          />
        </div>
      )}
    </div>
  )
}
