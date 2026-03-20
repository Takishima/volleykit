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
  // iOS ignores `title` for email subjects, and combining `url` with `files`
  // drops the attachment. So we pass `files` + `text` only, and include
  // the recipient address and subject in the body text as guidance.
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        text: [
          `To: ${ESCORESHEET_EMAIL}`,
          `Subject: ${options.subject}`,
          '',
          options.body,
        ].join('\n'),
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
  // Use encodeURIComponent (not URLSearchParams) because mailto: URLs treat
  // '+' as a literal plus sign — spaces must be encoded as %20.
  return `mailto:${ESCORESHEET_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
