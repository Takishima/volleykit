/**
 * Type augmentation for Headers.getSetCookie()
 *
 * The getSetCookie() method is part of the modern Fetch API and is available
 * in Cloudflare Workers runtime. It returns an array of Set-Cookie header values,
 * unlike get('Set-Cookie') which only returns the first one.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Headers/getSetCookie
 */

// Helper type to access getSetCookie on Headers instances
export type HeadersWithCookies = Headers & {
  getSetCookie(): string[];
};
