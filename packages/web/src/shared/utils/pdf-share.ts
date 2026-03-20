import { logger } from '@/shared/utils/logger'
import { downloadPdf } from '@/shared/utils/pdf-form-filler'

/** escoresheet recipient for score sheet PDF emails */
const ESCORESHEET_EMAIL = 'escoresheet@volleyball.ch'

interface EmailPdfOptions {
  /** Email subject line */
  subject: string
  /** Email body text */
  body: string
}

/**
 * Share a PDF via email to escoresheet@volleyball.ch.
 *
 * On mobile (Web Share API available): opens the native share sheet with the
 * PDF attached, subject pre-filled, and body hinting at the recipient.
 *
 * On desktop (no Web Share API): downloads the PDF and opens a mailto: link
 * so the user can attach it manually.
 */
export async function emailPdf(
  pdfBytes: Uint8Array,
  filename: string,
  options: EmailPdfOptions
): Promise<void> {
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
  const file = new File([blob], filename, { type: 'application/pdf' })

  // Try Web Share API first (mobile) — attaches the PDF automatically.
  // iOS ignores `title` for email subjects, so we pass a mailto: URL which
  // iOS Mail uses to pre-fill recipient + subject when the user picks Mail.
  if (navigator.canShare?.({ files: [file] })) {
    try {
      const mailto = buildMailtoUrl(options.subject, options.body)
      await navigator.share({
        files: [file],
        url: mailto,
      })
      return
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      logger.warn('[pdf-share] Web Share API failed, falling back to mailto:', error)
    }
  }

  // Desktop fallback: download PDF + open mailto: link
  downloadPdf(pdfBytes, filename)

  const mailto = buildMailtoUrl(options.subject, options.body)
  window.open(mailto, '_blank')
}

function buildMailtoUrl(subject: string, body: string): string {
  const params = new URLSearchParams({
    subject,
    body,
  })
  return `mailto:${ESCORESHEET_EMAIL}?${params.toString()}`
}
