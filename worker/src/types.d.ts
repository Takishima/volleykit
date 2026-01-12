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

/**
 * Worker git hash injected at deploy time via `wrangler deploy --define`.
 * Used for version tracking - the web app checks this to determine if
 * session tokens need to be invalidated (worker auth logic changed).
 */
declare const __WORKER_GIT_HASH__: string;
