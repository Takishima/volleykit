import { useCallback, useEffect, useMemo } from 'react'

import { ExternalLink } from '@/common/components/icons'
import { useTranslation } from '@/common/hooks/useTranslation'

interface PdfPreviewProps {
  pdfBytes: Uint8Array | null
  isLoading: boolean
}

export function PdfPreview({ pdfBytes, isLoading }: PdfPreviewProps) {
  const { t } = useTranslation()

  const blobUrl = useMemo(() => {
    if (!pdfBytes) return null
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
    return URL.createObjectURL(blob)
  }, [pdfBytes])

  // Revoke blob URL on unmount or when it changes
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [blobUrl])

  const handleOpenInNewTab = useCallback(() => {
    if (blobUrl) window.open(blobUrl, '_blank')
  }, [blobUrl])

  const handleDownloadFallback = useCallback(() => {
    if (!blobUrl) return
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = 'sports-hall-report-preview.pdf'
    a.click()
  }, [blobUrl])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh] min-h-[300px] rounded-lg border border-border-default dark:border-border-default-dark">
        <div className="flex items-center gap-2 text-sm text-text-muted dark:text-text-muted-dark">
          <span
            className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
          {t('pdf.generating')}
        </div>
      </div>
    )
  }

  if (!blobUrl) return null

  return (
    <div className="space-y-2" data-testid="report-pdf-preview">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
          {t('pdf.wizard.nonConformant.previewTitle')}
        </p>
        <button
          type="button"
          onClick={handleOpenInNewTab}
          className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
        >
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
          {t('pdf.wizard.nonConformant.openInNewTab')}
        </button>
      </div>
      <div className="rounded-lg border border-border-default dark:border-border-default-dark overflow-hidden">
        <iframe
          src={blobUrl}
          title={t('pdf.wizard.nonConformant.previewTitle')}
          className="w-full h-[50vh] min-h-[300px]"
        />
      </div>
      <button
        type="button"
        onClick={handleDownloadFallback}
        className="text-xs text-text-muted dark:text-text-muted-dark underline underline-offset-2 hover:text-text-secondary dark:hover:text-text-secondary-dark transition-colors"
      >
        {t('pdf.wizard.nonConformant.downloadToView')}
      </button>
    </div>
  )
}
