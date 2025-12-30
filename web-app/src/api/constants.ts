/**
 * Shared API constants used across client, mock API, and UI components.
 * Centralizes configuration values to ensure consistency between production
 * and demo modes.
 */

/**
 * Maximum allowed file size for uploads (10 MB).
 * Used for scoresheet uploads and other file upload validations.
 */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Allowed MIME types for file uploads.
 * Accepts PDF documents and JPEG/PNG images.
 */
export const ALLOWED_FILE_TYPES: readonly string[] = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

/**
 * Default limit for search results pagination.
 * Used for person search and similar paginated endpoints.
 */
export const DEFAULT_SEARCH_RESULTS_LIMIT = 50;
