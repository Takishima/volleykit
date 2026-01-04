/**
 * Application-wide constants.
 */

/**
 * Returns the absolute URL to the VolleyKit help documentation site.
 * Must be absolute (not relative) to bypass the service worker which would
 * otherwise intercept the request and serve the web app instead of the help site.
 *
 * Uses window.location.origin + BASE_URL to work correctly in:
 * - Production: https://takishima.github.io/volleykit/help/
 * - PR previews: https://takishima.github.io/volleykit/pr-123/help/
 * - Local dev: http://localhost:5173/help/
 */
export function getHelpSiteUrl(): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${import.meta.env.BASE_URL}help/`;
}
