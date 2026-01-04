/**
 * Application-wide constants.
 */

/**
 * URL to the VolleyKit help documentation site.
 * Uses BASE_URL to work correctly in PR previews (e.g., /volleykit/pr-123/help/)
 * and production (e.g., /volleykit/help/).
 */
export const HELP_SITE_URL = `${import.meta.env.BASE_URL}help/`;
