/**
 * Content-Security-Policy helpers for the build-time `cspPlugin` in vite.config.ts.
 *
 * Pure functions (no Vite dependency) so the policy assembly is unit-testable.
 * Hashing uses Web Crypto, which exists in both Node and the browser lib, so this
 * module type-checks under the app and the node tsconfig alike.
 */

/** Matches inline <script> blocks (no src attribute) and captures their content. */
const INLINE_SCRIPT_PATTERN = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi

/** The tag the CSP meta is inserted after; the build fails when it is missing. */
const CSP_INSERTION_MARKER = '<meta charset="UTF-8" />'

/**
 * Collect the remote origins the policy must allow.
 * Env values may be comma-separated lists and may be full URLs (e.g. VITE_OCR_ENDPOINT
 * ends in /ocr); only the origin of each parseable entry is kept.
 */
export function collectRemoteOrigins(
  staticOrigins: readonly string[],
  envValues: ReadonlyArray<string | undefined>
): string[] {
  const origins = new Set(staticOrigins)
  for (const value of envValues) {
    for (const candidate of (value ?? '').split(',')) {
      const trimmed = candidate.trim()
      if (trimmed && URL.canParse(trimmed)) {
        origins.add(new URL(trimmed).origin)
      }
    }
  }
  return [...origins]
}

/** Base64 SHA-256 of a UTF-8 string, as CSP expects it. */
async function sha256Base64(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
}

/** CSP source expressions ('sha256-…') for every non-empty inline script in the HTML. */
export async function inlineScriptHashes(html: string): Promise<string[]> {
  const contents = [...html.matchAll(INLINE_SCRIPT_PATTERN)]
    .map((match) => match[1] ?? '')
    .filter((content) => content.trim().length > 0)
  const digests = await Promise.all(contents.map(sha256Base64))
  return digests.map((digest) => `'sha256-${digest}'`)
}

/**
 * Build the Content-Security-Policy value for the app shell.
 * - scripts: own bundle plus hashed inline bootstrap scripts (no 'unsafe-inline')
 * - styles: 'unsafe-inline' is required for React inline style props
 * - img/connect: own origin, the API proxy and the remote services
 * - object: blob: for the in-app PDF preview (<object data="blob:…">)
 */
export function buildCspValue(remoteOrigins: readonly string[], scriptHashes: readonly string[]) {
  const remote = remoteOrigins.join(' ')
  return [
    "default-src 'self'",
    ["script-src 'self'", ...scriptHashes].join(' '),
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${remote}`,
    `connect-src 'self' ${remote}`,
    "object-src 'self' blob:",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}

/**
 * Insert the CSP <meta> right after the charset declaration.
 * Throws when the marker is absent so a build never silently ships without a policy.
 */
export function injectCspMeta(html: string, csp: string): string {
  if (!html.includes(CSP_INSERTION_MARKER)) {
    throw new Error(
      `CSP injection failed: ${CSP_INSERTION_MARKER} not found in index.html. ` +
        'Update CSP_INSERTION_MARKER in src/common/utils/csp.ts if the charset tag changed.'
    )
  }
  const metaTag = `<meta http-equiv="Content-Security-Policy" content="${csp}" />`
  return html.replace(CSP_INSERTION_MARKER, `${CSP_INSERTION_MARKER}\n    ${metaTag}`)
}
