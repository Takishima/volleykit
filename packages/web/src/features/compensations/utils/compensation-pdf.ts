/**
 * Compensation PDF download via the real API.
 *
 * This module handles fetching compensation statement PDFs from the
 * VolleyManager backend. It requires an active API session (session headers
 * and CSRF token) — it is not used in demo or calendar mode.
 */

import { captureSessionToken, getSessionHeaders } from '@/api/client'
import { getApiBaseUrl } from '@/api/constants'

export async function downloadCompensationPDF(compensationId: string): Promise<void> {
  const url = `${getApiBaseUrl()}/indoorvolleyball.refadmin/refereestatementofexpenses/downloadrefereestatementofexpenses?refereeConvocation=${encodeURIComponent(compensationId)}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        ...getSessionHeaders(),
      },
    })

    captureSessionToken(response)

    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`)
    }

    const contentType = response.headers.get('Content-Type')
    if (!contentType) {
      throw new Error('Missing Content-Type header in response')
    }
    // MIME types are case-insensitive per RFC 2045, and may include parameters like charset
    // Normalize by trimming whitespace and comparing lowercase
    const normalizedContentType = contentType.trim().toLowerCase()
    if (!normalizedContentType.startsWith('application/pdf')) {
      throw new Error(`Invalid response type: expected PDF but received ${contentType}`)
    }

    const blob = await response.blob()
    const contentDisposition = response.headers.get('Content-Disposition')
    let filename = 'compensation.pdf'

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1]
      }
    }

    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Unknown error occurred while downloading PDF', { cause: error })
  }
}
