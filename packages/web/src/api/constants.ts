/**
 * Shared API constants used across client, mock API, and UI components.
 * Centralizes configuration values to ensure consistency between production
 * and demo modes.
 */

import { BYTES_PER_MB } from '@/common/utils/constants'

export { getApiBaseUrl } from './proxy-resilience'

/** Maximum file size in megabytes */
const MAX_FILE_SIZE_MB = 10

/**
 * Maximum allowed file size for uploads (10 MB).
 * Used for scoresheet uploads and other file upload validations.
 */
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * BYTES_PER_MB

/**
 * Allowed MIME types for file uploads.
 * Accepts PDF documents and JPEG/PNG images.
 */
export const ALLOWED_FILE_TYPES: readonly string[] = ['application/pdf', 'image/jpeg', 'image/png']

/** Throws when `file` is not an allowed type or exceeds the size limit. */
export function assertUploadableFile(file: File): void {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error(
      `Invalid file type: ${file.type || 'unknown'}. Only JPEG, PNG, or PDF files are allowed.`
    )
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / BYTES_PER_MB).toFixed(1)
    throw new Error(`File too large: ${sizeMB} MB. Maximum size is ${MAX_FILE_SIZE_MB} MB.`)
  }
}

/**
 * Default limit for search results pagination.
 * Used for person search and similar paginated endpoints.
 */
export const DEFAULT_SEARCH_RESULTS_LIMIT = 100
