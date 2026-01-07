/**
 * Application-wide constants.
 */

import { useLanguageStore } from "@/shared/stores/language";

/**
 * Returns the absolute URL to the VolleyKit help documentation site.
 * Must be absolute (not relative) to bypass the service worker which would
 * otherwise intercept the request and serve the web app instead of the help site.
 *
 * Uses window.location.origin + BASE_URL to work correctly in:
 * - Production: https://takishima.github.io/volleykit/help/
 * - PR previews: https://takishima.github.io/volleykit/pr-123/help/
 * - Local dev: http://localhost:5173/help/
 *
 * Includes the current app language as a query parameter so the help site
 * opens in the same language as the main app.
 */
export function getHelpSiteUrl(): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const baseUrl = `${origin}${import.meta.env.BASE_URL}help/`;

  // Get current language from store (works outside React components)
  const currentLang = useLanguageStore.getState().locale;

  return `${baseUrl}?lang=${currentLang}`;
}
