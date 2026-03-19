/**
 * Cookie rewriting for the VolleyKit CORS Proxy Worker.
 */

/**
 * Rewrite cookie for cross-origin compatibility.
 * Removes Domain, adds SameSite=None, Secure, and Partitioned.
 */
export function rewriteCookie(cookie: string): string {
  return (
    cookie
      .replace(/Domain=[^;]+;?\s*/gi, '')
      .replace(/;\s*Secure\s*(;|$)/gi, '$1')
      .replace(/SameSite=[^;]+;?\s*/gi, '')
      .replace(/;\s*Partitioned\s*(;|$)/gi, '$1') + '; SameSite=None; Secure; Partitioned'
  )
}
