/**
 * Normalizes a base path for Vite deployment.
 * Vite requires base path to be "/" or start and end with "/" (e.g., "/volleykit/")
 *
 * @param rawPath - The raw path value (may be undefined, empty, or malformed)
 * @returns Normalized path that starts and ends with "/"
 *
 * Edge cases:
 * - undefined/null → "/"
 * - "" (empty string) → "/"
 * - "/" → "/"
 * - "foo" → "/foo/"
 * - "/foo" → "/foo/"
 * - "foo/" → "/foo/"
 * - "/foo/" → "/foo/"
 */
export function normalizeBasePath(rawPath: string | undefined): string {
  // Treat empty string same as undefined - both default to "/"
  if (!rawPath || rawPath === '/') {
    return '/'
  }

  let normalized = rawPath

  // Ensure starts with "/"
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized
  }

  // Ensure ends with "/"
  if (!normalized.endsWith('/')) {
    normalized = normalized + '/'
  }

  return normalized
}
