import { logger } from '@/shared/utils/logger'

/**
 * Share or print a PDF file using the Web Share API with a fallback to
 * opening the PDF in a new tab (which triggers the browser's print dialog).
 */
export async function shareOrPrintPdf(pdfBytes: Uint8Array, filename: string): Promise<void> {
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
  const file = new File([blob], filename, { type: 'application/pdf' })

  // Try Web Share API first (available on most mobile browsers)
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return
    } catch (error) {
      // User cancelled the share — not an error
      if (error instanceof Error && error.name === 'AbortError') return
      logger.warn('[pdf-share] Web Share API failed, falling back:', error)
    }
  }

  // Fallback: open blob URL in a new tab so the user can print/download
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')

  // Revoke after a short delay so the new tab can load the blob
  const BLOB_REVOKE_DELAY_MS = 10_000
  setTimeout(() => URL.revokeObjectURL(url), BLOB_REVOKE_DELAY_MS)
}
