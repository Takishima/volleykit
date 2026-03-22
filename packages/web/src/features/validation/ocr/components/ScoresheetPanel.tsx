import { Upload, Camera, CheckCircle, FileText, AlertCircle, Info } from '@/common/components/icons'
import { useTranslation } from '@/common/hooks/useTranslation'
import { useAuthStore } from '@/common/stores/auth'
import { BYTES_PER_KB, BYTES_PER_MB } from '@/common/utils/constants'

import { isImageUrl } from '../../utils/scoresheet'
import { useFileUpload } from '../hooks/useFileUpload'

interface ScoresheetPanelProps {
  /** Callback when scoresheet state changes */
  onScoresheetChange?: (file: File | null, uploaded: boolean) => void
  /** When true, shows panel in view-only mode */
  readOnly?: boolean
  /** Whether a scoresheet was uploaded (for read-only mode) */
  hasScoresheet?: boolean
  /** Whether scoresheet upload is not required for this game's group */
  scoresheetNotRequired?: boolean
  /** Public URL of an existing scoresheet file (from a previous upload) */
  existingFileUrl?: string | null
}

const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.pdf'

function formatFileSize(bytes: number): string {
  if (bytes < BYTES_PER_KB) return `${bytes} B`
  if (bytes < BYTES_PER_MB) return `${(bytes / BYTES_PER_KB).toFixed(1)} KB`
  return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`
}

export function ScoresheetPanel({
  onScoresheetChange,
  readOnly = false,
  hasScoresheet = false,
  scoresheetNotRequired = false,
  existingFileUrl,
}: ScoresheetPanelProps) {
  const { t } = useTranslation()
  const dataSource = useAuthStore((state) => state.dataSource)
  const isDemoMode = dataSource === 'demo'

  const {
    selectedFile,
    uploadState,
    errorMessage,
    uploadProgress,
    fileInputRef,
    cameraInputRef,
    handleInputChange,
    handleReplace,
    resetState,
  } = useFileUpload({ onScoresheetChange })

  const tKey = (key: string) => t(`validation.scoresheetUpload.${key}` as Parameters<typeof t>[0])

  // In read-only mode, show a simple status display
  if (readOnly) {
    return (
      <div className="py-4">
        <div className="border border-border-default dark:border-border-default-dark rounded-lg p-4 text-center">
          {hasScoresheet ? (
            <>
              <CheckCircle className="w-12 h-12 mx-auto text-success-500 mb-3" aria-hidden="true" />
              <h3 className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                {t('validation.scoresheetUpload.scoresheetUploaded')}
              </h3>
            </>
          ) : (
            <>
              <FileText
                className="w-12 h-12 mx-auto text-text-subtle dark:text-text-subtle-dark mb-3"
                aria-hidden="true"
              />
              <h3 className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                {t('validation.scoresheetUpload.noScoresheet')}
              </h3>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="py-4">
      {scoresheetNotRequired && (
        <div className="mb-4 border border-info-200 dark:border-info-800 bg-info-50 dark:bg-info-900/20 rounded-lg p-3 flex items-start gap-2">
          <Info className="w-5 h-5 flex-shrink-0 text-info-500 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
              {t('validation.scoresheetUpload.notRequired')}
            </p>
            <p className="text-sm text-text-muted dark:text-text-muted-dark mt-0.5">
              {t('validation.scoresheetUpload.notRequiredOptional')}
            </p>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        onChange={handleInputChange}
        className="hidden"
        aria-label={tKey('selectFile')}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png"
        capture="environment"
        onChange={handleInputChange}
        className="hidden"
        aria-label={tKey('takePhoto')}
      />

      {!selectedFile && existingFileUrl ? (
        <div className="border border-border-default dark:border-border-default-dark rounded-lg overflow-hidden">
          {isImageUrl(existingFileUrl) ? (
            <div className="relative bg-surface-subtle dark:bg-surface-card-dark">
              <img
                src={existingFileUrl}
                alt={tKey('previewAlt')}
                className="w-full max-h-64 object-contain"
              />
            </div>
          ) : (
            <div className="bg-surface-subtle dark:bg-surface-card-dark p-8 flex flex-col items-center justify-center">
              <FileText
                className="w-16 h-16 text-text-subtle dark:text-text-subtle-dark mb-2"
                aria-hidden="true"
              />
              <span className="text-sm text-text-muted dark:text-text-muted-dark">PDF</span>
            </div>
          )}

          <div className="p-4 bg-surface-card dark:bg-surface-card-dark">
            <div
              className="mb-3 flex items-center gap-2 text-success-600 dark:text-success-400"
              role="status"
              aria-live="polite"
            >
              <CheckCircle className="w-5 h-5" aria-hidden="true" />
              <span className="text-sm font-medium">
                {t('validation.scoresheetUpload.existingScoresheet')}
              </span>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-2 text-sm font-medium text-text-secondary dark:text-text-secondary-dark bg-surface-subtle dark:bg-surface-subtle-dark hover:bg-surface-muted dark:hover:bg-surface-muted-dark rounded-lg transition-colors"
              >
                {tKey('replace')}
              </button>
            </div>
          </div>
        </div>
      ) : !selectedFile ? (
        <div className="border-2 border-dashed border-border-strong dark:border-border-strong-dark rounded-lg p-6 text-center">
          <Upload
            className="w-12 h-12 mx-auto text-text-subtle dark:text-text-subtle-dark mb-4"
            aria-hidden="true"
          />
          <h3 className="text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">
            {tKey('title')}
          </h3>
          <p className="text-sm text-text-muted dark:text-text-muted-dark mb-4">
            {tKey('description')}
          </p>
          <p className="text-xs text-text-subtle dark:text-text-subtle-dark mb-4">
            {tKey('acceptedFormats')} • {tKey('maxFileSize')}
          </p>

          {errorMessage && (
            <div
              role="alert"
              className="mb-4 p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg flex items-center gap-2"
            >
              <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0" aria-hidden="true" />
              <span className="text-sm text-danger-700 dark:text-danger-400">{errorMessage}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4" aria-hidden="true" />
              {tKey('selectFile')}
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-text-secondary dark:text-text-secondary-dark bg-surface-subtle dark:bg-surface-subtle-dark hover:bg-surface-muted dark:hover:bg-surface-muted-dark rounded-lg transition-colors"
            >
              <Camera className="w-4 h-4" aria-hidden="true" />
              {tKey('takePhoto')}
            </button>
          </div>
        </div>
      ) : (
        <div className="border border-border-default dark:border-border-default-dark rounded-lg overflow-hidden">
          {selectedFile.previewUrl ? (
            <div className="relative bg-surface-subtle dark:bg-surface-card-dark">
              <img
                src={selectedFile.previewUrl}
                alt={tKey('previewAlt')}
                className="w-full max-h-64 object-contain"
              />
            </div>
          ) : (
            <div className="bg-surface-subtle dark:bg-surface-card-dark p-8 flex flex-col items-center justify-center">
              <FileText
                className="w-16 h-16 text-text-subtle dark:text-text-subtle-dark mb-2"
                aria-hidden="true"
              />
              <span className="text-sm text-text-muted dark:text-text-muted-dark">PDF</span>
            </div>
          )}

          <div className="p-4 bg-surface-card dark:bg-surface-card-dark">
            {uploadState === 'uploading' && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-text-muted dark:text-text-muted-dark mb-1">
                  <span>{tKey('uploading')}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div
                  className="h-2 bg-surface-muted dark:bg-surface-subtle-dark rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={uploadProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={tKey('uploading')}
                >
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {uploadState === 'complete' && (
              <div
                className="mb-3 flex items-center gap-2 text-success-600 dark:text-success-400"
                role="status"
                aria-live="polite"
              >
                <CheckCircle className="w-5 h-5" aria-hidden="true" />
                <span className="text-sm font-medium">{tKey('uploadComplete')}</span>
              </div>
            )}

            <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark truncate">
              {selectedFile.file.name}
            </p>
            <p className="text-xs text-text-muted dark:text-text-muted-dark">
              {formatFileSize(selectedFile.file.size)}
            </p>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={handleReplace}
                disabled={uploadState === 'uploading'}
                className="flex-1 px-4 py-2 text-sm font-medium text-text-secondary dark:text-text-secondary-dark bg-surface-subtle dark:bg-surface-subtle-dark hover:bg-surface-muted dark:hover:bg-surface-muted-dark rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {tKey('replace')}
              </button>
              <button
                type="button"
                onClick={resetState}
                disabled={uploadState === 'uploading'}
                className="flex-1 px-4 py-2 text-sm font-medium text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-900/20 hover:bg-danger-100 dark:hover:bg-danger-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {tKey('remove')}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDemoMode && (
        <p className="mt-3 text-xs text-center text-text-subtle dark:text-text-subtle-dark">
          {tKey('demoModeNote')}
        </p>
      )}
    </div>
  )
}
