import { AlertCircle, RefreshCw } from '@/common/components/icons'
import { useTranslation } from '@/common/hooks/useTranslation'

interface OCRErrorStepProps {
  errorMessage: string | undefined
  onRetry: () => void
}

/**
 * Error step for the OCR entry modal - shows error message and retry button.
 */
export function OCRErrorStep({ errorMessage, onRetry }: OCRErrorStepProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]" role="alert">
      <AlertCircle className="w-16 h-16 text-danger-500 mb-6" aria-hidden="true" />
      <p className="text-lg font-medium text-danger-700 dark:text-danger-400 mb-2">
        {t('validation.ocr.scanFailed')}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
        {errorMessage ?? t('validation.ocr.errors.processingFailed')}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-2 px-6 py-3 text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors font-medium"
      >
        <RefreshCw className="w-5 h-5" aria-hidden="true" />
        {t('validation.ocr.retryCapture')}
      </button>
    </div>
  )
}
