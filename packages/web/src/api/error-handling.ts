/**
 * API error parsing utilities.
 * Handles extracting meaningful error messages from various backend response formats.
 */

import { z } from 'zod'

/** Maximum length for error message excerpts from HTML responses */
const MAX_ERROR_EXCERPT_LENGTH = 200

/**
 * Strips HTML tags from text using character-by-character parsing.
 * This approach avoids regex backtracking issues while safely handling nested tags.
 */
function stripHtmlTags(html: string): string {
  let result = ''
  let inTag = false

  for (const char of html) {
    if (char === '<') {
      inTag = true
    } else if (char === '>') {
      inTag = false
    } else if (!inTag) {
      result += char
    }
  }

  return result
}

// Backend error response schema
const backendErrorSchema = z
  .object({
    error: z.string().optional(),
    message: z.string().optional(),
    errors: z
      .array(
        z.object({
          field: z.string().optional(),
          message: z.string(),
        })
      )
      .optional(),
  })
  .passthrough()

/**
 * Parses backend error response to extract meaningful error message.
 */
export async function parseErrorResponse(response: Response): Promise<string> {
  const status = response.status
  const statusText = response.statusText

  try {
    const contentType = response.headers.get('Content-Type') || ''

    if (contentType.includes('application/json')) {
      const data = await response.json()
      const parsed = backendErrorSchema.safeParse(data)

      if (parsed.success) {
        // Check for specific error fields
        if (parsed.data.message) {
          return parsed.data.message
        }
        if (parsed.data.error) {
          return parsed.data.error
        }
        if (parsed.data.errors && parsed.data.errors.length > 0) {
          return parsed.data.errors
            .map((e) => (e.field ? `${e.field}: ${e.message}` : e.message))
            .join(', ')
        }
      }
    }

    // Try to get text content for non-JSON responses
    if (contentType.includes('text/')) {
      const text = await response.text()
      const cleanText = stripHtmlTags(text).trim().slice(0, MAX_ERROR_EXCERPT_LENGTH)
      if (cleanText) {
        return cleanText
      }
    }
  } catch {
    // Failed to parse error body, fall through to default
  }

  // Default error message
  return `${status} ${statusText}`
}
