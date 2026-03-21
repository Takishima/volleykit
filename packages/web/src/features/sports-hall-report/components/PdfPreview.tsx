import { useEffect, useMemo } from 'react'

import { useTranslation } from '@/shared/hooks/useTranslation'

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px] rounded-lg border border-border-default dark:border-border-default-dark">
        <div className="flex items-center gap-2 text-sm text-text-muted dark:text-text-muted-dark">
          <span
            className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
          {t('pdf.generating')}
        </div>
      </div>
    )
  }

  if (!blobUrl) return null

  return (
    <div className="space-y-2">
      <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
        {t('pdf.wizard.nonConformant.previewTitle')}
      </p>
      <div className="rounded-lg border border-border-default dark:border-border-default-dark overflow-hidden">
        <iframe
          src={blobUrl}
          title={t('pdf.wizard.nonConformant.previewTitle')}
          className="w-full h-[400px]"
        />
      </div>
    </div>
  )
}
